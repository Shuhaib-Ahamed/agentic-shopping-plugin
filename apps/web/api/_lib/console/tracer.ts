// Gateway tracer. Wraps a chat request and records:
//   - input text + locale + currency + prompt version
//   - every SSE event the writer emitted (by intercepting writer.write)
//   - every structured log line (via AsyncLocalStorage in traceContext + log.ts)
//   - per-step Responses API usage and finish reason derived from the
//     `router.decided`, `toolLoop.step`, `response.step` log lines
//   - per-call MCP and UI tool invocations derived from `toolLoop.mcp`,
//     `toolLoop.local`, `response.uiTool` log lines (args + result summary)
//   - final assistant message and turn outcome
//
// Fire-and-forget. Persistence runs after the SSE stream is closed; any
// failure in the tracer is swallowed so it can never delay or break chat.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ChatRequest,
  EmittedEventRecord,
  Locale,
  LogEntryRecord,
  SessionRecord,
  SseEvent,
  StepRecord,
  TokenUsage,
  ToolCallRecord,
  TurnInput,
  TurnOutcome,
  TurnRecord,
} from "@kapruka/protocol";
import type { SseWriter } from "../sse";
import { TOKENS_PER_MILLION } from "./constants";
import { collections, hasMongo } from "./mongo";
import { PRICING } from "./pricing";

const MAX_LOGS_PER_TURN = 800;

let CACHED_PROMPT_VERSION: string | null = null;

function promptVersion(): string {
  if (CACHED_PROMPT_VERSION) return CACHED_PROMPT_VERSION;
  const candidates = [
    join(process.cwd(), "prompts", "system.md"),
    join(process.cwd(), "apps", "web", "api", "prompts", "system.md"),
  ];
  for (const p of candidates) {
    try {
      const content = readFileSync(p, "utf8");
      CACHED_PROMPT_VERSION = `v_${createHash("sha256").update(content).digest("hex").slice(0, 7)}`;
      return CACHED_PROMPT_VERSION;
    } catch {
      // try next
    }
  }
  CACHED_PROMPT_VERSION = `v_${createHash("sha256")
    .update(process.env.OPENAI_MODEL ?? "gpt-5-nano")
    .digest("hex")
    .slice(0, 7)}`;
  return CACHED_PROMPT_VERSION;
}

export interface TurnTracer {
  readonly turnId: string;
  readonly writer: SseWriter;
  recordLog(entry: LogEntryRecord): void;
  recordError(err: { code: string; message: string; recoverable: boolean }): void;
  finish(): Promise<void>;
}

interface StartArgs {
  request: ChatRequest;
  writer: SseWriter;
  turnIndex: number;
  traceId: string;
}

type DraftStep = {
  index: number;
  stage: "router" | "tools" | "response";
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  finishReason: string;
  toolNames: string[];
  toolCalls: ToolCallRecord[];
};

function emptyUsage(): TokenUsage {
  return { input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 };
}

function readUsage(raw: unknown): TokenUsage {
  const usage = emptyUsage();
  if (!raw || typeof raw !== "object") return usage;
  const u = raw as Record<string, unknown>;
  usage.input = num(u.prompt_tokens ?? u.input_tokens) ?? 0;
  usage.output = num(u.completion_tokens ?? u.output_tokens) ?? 0;
  const reasoning =
    deep(u.completion_tokens_details ?? u.output_tokens_details, "reasoning_tokens") ?? 0;
  usage.reasoning = reasoning;
  const cached = deep(u.prompt_tokens_details ?? u.input_tokens_details, "cached_tokens") ?? 0;
  usage.cachedInput = cached;
  usage.total = usage.input + usage.output + usage.reasoning;
  return usage;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function deep(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return num(v);
}

export function startTurnTrace({ request, writer, turnIndex, traceId }: StartArgs): TurnTracer {
  const turnId = `trn_${traceId}_${turnIndex}`;
  const startedAt = new Date();
  const emitted: EmittedEventRecord[] = [];
  const logs: LogEntryRecord[] = [];
  const drafts: DraftStep[] = [];
  let nextStepIndex = 0;
  const errors: TurnRecord["errors"] = [];
  let finalMessage: string | undefined;
  let outcome: TurnOutcome = "in_progress";
  let promptVersionId = promptVersion();

  const userMsg = request.messages.at(-1);
  const input: TurnInput =
    userMsg && userMsg.role === "user"
      ? { kind: "text", text: redact(userMsg.content) }
      : { kind: "ui_action", uiAction: { type: "unknown", payloadSummary: "no_user_message" } };

  // Intercept SSE writes.
  const originalWrite = writer.write.bind(writer);
  writer.write = (event: SseEvent) => {
    try {
      emitted.push({
        type: event.type,
        at: new Date().toISOString(),
        payloadSummary: summarizeEvent(event),
      });
      if (event.type === "message") finalMessage = redact(event.text).slice(0, 4000);
      if (event.type === "products") outcome = "viewed_product";
      if (event.type === "cart") outcome = "added_to_cart";
      if (event.type === "checkout") outcome = "checkout_created";
      if (event.type === "order_confirmed") outcome = "paid";
      if (event.type === "error")
        errors.push({ code: event.code, message: event.message, recoverable: event.recoverable });
    } catch {
      // Swallow.
    }
    return originalWrite(event);
  };

  function getOrPushStep(stage: DraftStep["stage"], model: string): DraftStep {
    // Steps are append-only; create a fresh one for each step log line.
    const draft: DraftStep = {
      index: nextStepIndex++,
      stage,
      model,
      usage: emptyUsage(),
      latencyMs: 0,
      finishReason: "stop",
      toolNames: [],
      toolCalls: [],
    };
    drafts.push(draft);
    return draft;
  }

  function lastStep(): DraftStep | undefined {
    return drafts[drafts.length - 1];
  }

  function recordLog(entry: LogEntryRecord) {
    if (logs.length < MAX_LOGS_PER_TURN) logs.push(entry);
    const f = (entry.fields ?? {}) as Record<string, unknown>;

    // Synthesize step records from known log shapes.
    if (entry.msg === "router.decided") {
      const step = getOrPushStep("router", String(f.model ?? "router"));
      step.latencyMs = num(f.durationMs) ?? 0;
      step.finishReason = "stop";
    } else if (entry.msg === "toolLoop.step") {
      const step = getOrPushStep("tools", "tools-stage");
      step.usage = readUsage(f.usage);
      step.latencyMs = num(f.durationMs) ?? 0;
      step.finishReason = String(f.finishReason ?? "tool_calls");
      const names = Array.isArray(f.toolCallNames)
        ? (f.toolCallNames as unknown[]).map((n) => String(n))
        : [];
      step.toolNames = names;
    } else if (entry.msg === "response.step") {
      const step = getOrPushStep("response", "response-stage");
      step.usage = readUsage(f.usage);
      step.latencyMs = num(f.durationMs) ?? 0;
      step.finishReason = String(f.finishReason ?? "stop");
      const names = Array.isArray(f.toolCallNames)
        ? (f.toolCallNames as unknown[]).map((n) => String(n))
        : [];
      step.toolNames = names;
    } else if (entry.msg === "toolLoop.mcp" || entry.msg === "toolLoop.local") {
      const target = lastStep();
      if (target) {
        target.toolCalls.push({
          id: `tc_${target.index}_${target.toolCalls.length}`,
          kind: "mcp",
          name: String(f.tool ?? "unknown"),
          argsSummary: shortJson(f.args),
          argsRedacted: f.args,
          resultSummary: typeof f.preview === "string" ? f.preview : "ok",
          latencyMs: num(f.durationMs) ?? 0,
          cacheHit: false,
        });
      }
    } else if (entry.msg === "toolLoop.mcpError" || entry.msg === "toolLoop.localError") {
      const target = lastStep();
      if (target) {
        const message = String(f.error ?? "tool error");
        target.toolCalls.push({
          id: `tc_${target.index}_${target.toolCalls.length}`,
          kind: "mcp",
          name: String(f.tool ?? "unknown"),
          argsSummary: shortJson(f.args),
          resultSummary: message,
          latencyMs: num(f.durationMs) ?? 0,
          error: {
            code: String(f.code ?? "tool_error"),
            message,
            recoverable: true,
          },
        });
      }
    } else if (entry.msg === "response.uiTool") {
      const target = lastStep();
      if (target) {
        target.toolCalls.push({
          id: `tc_${target.index}_${target.toolCalls.length}`,
          kind: "ui",
          name: String(f.tool ?? "unknown"),
          argsSummary: typeof f.tool === "string" ? f.tool : "ui",
          latencyMs: num(f.durationMs) ?? 0,
        });
      }
    } else if (entry.msg === "agent.start") {
      // Pin the model id from agent.start fields if present.
      if (typeof f.provider === "string") promptVersionId = `${promptVersionId}:${f.provider}`;
    }
  }

  return {
    turnId,
    writer,
    recordLog,
    recordError(err) {
      errors.push(err);
    },
    async finish() {
      try {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        const steps: StepRecord[] = drafts.map((d) => ({
          index: d.index,
          model: d.model,
          params: { toolsSent: d.toolNames },
          usage: d.usage,
          cost: computeCost(d.model, d.usage),
          latency: { totalMs: d.latencyMs },
          finishReason: d.finishReason,
          toolCalls: d.toolCalls,
          rawOutputSummary: d.stage,
        }));

        const usage = steps.reduce(
          (a, s) => ({
            input: a.input + s.usage.input,
            cachedInput: a.cachedInput + s.usage.cachedInput,
            output: a.output + s.usage.output,
            reasoning: a.reasoning + s.usage.reasoning,
            total: a.total + s.usage.total,
          }),
          emptyUsage(),
        );
        const cost = steps.reduce(
          (a, s) => ({
            input: a.input + s.cost.input,
            cachedInput: a.cachedInput + s.cost.cachedInput,
            output: a.output + s.cost.output,
            reasoning: a.reasoning + s.cost.reasoning,
            total: a.total + s.cost.total,
          }),
          { input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 },
        );
        const totalToolCalls = steps.reduce((n, s) => n + s.toolCalls.length, 0);

        if (outcome === "in_progress") outcome = finalMessage ? "browsing" : "errored";
        if (errors.length > 0) outcome = "errored";

        const locale: Locale = (request.context?.locale ?? "en") as Locale;
        const turn: TurnRecord = {
          turnId,
          sessionId: request.sessionId,
          index: turnIndex,
          createdAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs,
          promptVersion: promptVersionId,
          model: steps[0]?.model ?? "gpt-5-nano",
          locale,
          currency: request.context?.currency ?? "LKR",
          input,
          steps,
          emittedEvents: emitted,
          logs,
          finalMessage,
          outcome,
          totals: { usage, cost, toolCalls: totalToolCalls },
          errors,
          flags: {
            hallucinationSuspected: false,
            schemaValidationFailed: errors.some((e) => e.code.includes("schema")),
            refused: false,
            retried: errors.length > 0,
          },
        };

        if (hasMongo()) {
          const cols = await collections();
          if (cols) {
            await cols.turns.insertOne(turn);
            await cols.sessions.updateOne(
              { sessionId: request.sessionId },
              {
                $setOnInsert: buildSessionInsert(request, startedAt),
                $set: { lastSeenAt: completedAt.toISOString() },
                $inc: {
                  "totals.turns": 1,
                  "totals.tokens": usage.total,
                  "totals.costUSD": cost.total,
                  "totals.toolCalls": totalToolCalls,
                  "totals.durationMs": durationMs,
                },
              },
              { upsert: true },
            );
          }
        }
      } catch {
        // Swallow. Trace persistence must never affect the chat response.
      }
    },
  };
}

function buildSessionInsert(req: ChatRequest, startedAt: Date): Partial<SessionRecord> {
  return {
    sessionId: req.sessionId,
    startedAt: startedAt.toISOString(),
    lastSeenAt: startedAt.toISOString(),
    locale: (req.context?.locale ?? "en") as Locale,
    currency: req.context?.currency ?? "LKR",
    device: "desktop",
    userAgentShort: "unknown",
    funnel: {
      searched: false,
      viewedProduct: false,
      addedToCart: false,
      startedCheckout: false,
      paid: false,
    },
    outcome: "browsing",
    totals: { turns: 0, tokens: 0, costUSD: 0, toolCalls: 0, durationMs: 0 },
  };
}

function summarizeEvent(e: SseEvent): string {
  switch (e.type) {
    case "status":
      return `${e.state}${e.detail ? ` (${e.detail})` : ""}`;
    case "message":
      return `${e.text.length} chars`;
    case "token":
      return `+${e.delta.length}`;
    case "products":
      return `${e.items.length} items (${e.layout})`;
    case "product_detail":
      return `${e.product.title}`;
    case "request_info":
      return `${e.intent}: ${e.fields.length} fields`;
    case "cart":
      return `${e.lines.length} lines`;
    case "delivery_quote":
      return `${e.city}, ${e.date}`;
    case "checkout":
      return `order ${e.orderId}`;
    case "order_confirmed":
      return `order ${e.orderId}`;
    case "options":
      return `${e.options.length} chips`;
    case "error":
      return `${e.code}${e.recoverable ? " (recoverable)" : ""}`;
    case "done":
      return "stream end";
    default:
      return "";
  }
}

function computeCost(model: string, usage: TokenUsage) {
  const p = PRICING.find((r) => r.model === model) ?? PRICING[0]!;
  const input = (usage.input / TOKENS_PER_MILLION) * p.inputPer1M;
  const cachedInput = (usage.cachedInput / TOKENS_PER_MILLION) * p.cachedInputPer1M;
  const output = (usage.output / TOKENS_PER_MILLION) * p.outputPer1M;
  const reasoning = (usage.reasoning / TOKENS_PER_MILLION) * p.reasoningPer1M;
  return { input, cachedInput, output, reasoning, total: input + cachedInput + output + reasoning };
}

function shortJson(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    if (!s) return "";
    return s.length > 160 ? `${s.slice(0, 160)}...` : s;
  } catch {
    return "";
  }
}

function redact(s: string): string {
  return s
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "{{email}}")
    .replace(/\b(?:\+?94|0)?7\d{8}\b/g, "{{phone}}")
    .replace(/\bKP-\d{4,10}\b/g, "{{order_id}}");
}
