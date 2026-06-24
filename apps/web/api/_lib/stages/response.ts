// Stage 3: Response generation.
//
// Always runs. Full base prompt, UI tools only. Reads tool_results from the
// DATA block (when present), drives the screen, then streams the shopper-
// facing text. Stage 3 owns the SSE writer.

import type { ChatMessage } from "@kapruka/protocol";
import { nanoid } from "nanoid";
import type { Logger } from "../log.js";
import {
  modelClient,
  stageModel,
  type ChatCompletionTool,
  type ChatMessageItem,
  type ToolCall,
} from "../openai.js";
import { buildResponseSystem } from "../promptSlices.js";
import { renderBriefBlock, renderStateBlock, type SessionState } from "../sessionState.js";
import type { SseWriter } from "../sse.js";
import { pickStatusLabel } from "../statusPool.js";
import { uiToolByName, uiToolDefs } from "../uiTools.js";
import { renderRoutingBlock, type RoutingDecision } from "./router.js";
import { renderDataBlock, type ToolBundle } from "./toolLoop.js";

const MAX_ITERATIONS = 6;

interface ResponseInput {
  recent: ChatMessage[];
  session: SessionState;
  decision: RoutingDecision;
  bundle: ToolBundle | null;
  writer: SseWriter;
  log: Logger;
  signal?: AbortSignal;
}

export async function runResponse({
  recent,
  session,
  decision,
  bundle,
  writer,
  log,
  signal,
}: ResponseInput): Promise<void> {
  const system = await buildResponseSystem();
  const uiTools = uiToolDefs();
  const tools: ChatCompletionTool[] = uiTools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  // Static system first, then recent messages, then dynamic blocks last. The
  // static prefix (full system.md + RESPONSE_TASK) is byte-identical turn to
  // turn, which is what provider prompt caches key on. Dynamic state moved
  // out of the prefix.
  const briefBlock = renderBriefBlock(session);
  const dynamicTail: ChatMessageItem[] = [{ role: "system", content: renderStateBlock(session) }];
  if (briefBlock) dynamicTail.push({ role: "system", content: briefBlock });
  dynamicTail.push({ role: "system", content: renderRoutingBlock(decision) });
  if (bundle) {
    dynamicTail.push({ role: "system", content: renderDataBlock(bundle) });
  }

  const messages: ChatMessageItem[] = [
    { role: "system", content: system },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessageItem),
    ...dynamicTail,
  ];

  const model = stageModel("response");
  const client = modelClient();

  writer.write({ type: "status", state: "composing", label: pickStatusLabel("composing") });

  let iter = 0;
  while (iter < MAX_ITERATIONS) {
    if (signal?.aborted) {
      log.warn("response.aborted", { iter });
      return;
    }
    iter += 1;
    const stepLog = log.child({ iter });
    const t0 = Date.now();

    // Stream the iteration. Content deltas stream as `token` events (the
    // client appends them to a text bubble by id). Tool-call deltas accumulate
    // by index and are run once the stream ends. UI tool events fire after the
    // stream finishes for this iteration, so SSE event order matches the
    // non-stream version. The win is first-token latency on the final text
    // iteration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK union types are wider than our subset
    const stream: any = await client.chat.completions.create({
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChatMessageItem matches SDK subset
      messages: messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- our UI tool schemas are heterogeneous
      tools: tools as any,
      tool_choice: "auto",
      parallel_tool_calls: false,
      // Response stage must reason about which UI tool to emit (present_products,
      // present_options, request_info, ...). At "minimal" the model degrades to
      // plain-text product dumps and skips the carousel entirely. "low" restores
      // structured tool calls while staying far below the original 40s+ default.
      reasoning_effort: "low",
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reasoning_effort is a gpt-5 runtime param not in SDK typings yet
    } as any);

    const accToolCalls = new Map<number, { id?: string; name?: string; arguments: string }>();
    let accContent = "";
    let sawToolCall = false;
    let streamedMessageId: string | null = null;
    let finishReason: string | undefined;

    for await (const chunk of stream) {
      if (signal?.aborted) return;
      const choice = chunk?.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      if (choice.finish_reason) finishReason = choice.finish_reason;

      if (Array.isArray(delta.tool_calls)) {
        sawToolCall = true;
        for (const tc of delta.tool_calls) {
          if (typeof tc.index !== "number") continue;
          const slot = accToolCalls.get(tc.index) ?? { arguments: "" };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name = tc.function.name;
          if (typeof tc.function?.arguments === "string") slot.arguments += tc.function.arguments;
          accToolCalls.set(tc.index, slot);
        }
      }

      if (typeof delta.content === "string" && delta.content.length > 0) {
        accContent += delta.content;
        // Only stream tokens before a tool_call appears in this iteration. If
        // the model emits both (uncommon), we drop the partial tokens silently
        // rather than ship a stranded bubble.
        if (!sawToolCall) {
          if (!streamedMessageId) streamedMessageId = nanoid();
          writer.write({ type: "token", id: streamedMessageId, delta: delta.content });
        }
      }
    }

    const toolCalls: ToolCall[] = [];
    const sortedSlots = [...accToolCalls.entries()].sort(([a], [b]) => a - b);
    for (const [, slot] of sortedSlots) {
      if (!slot.id || !slot.name) continue;
      toolCalls.push({
        id: slot.id,
        type: "function",
        function: { name: slot.name, arguments: slot.arguments || "{}" },
      });
    }

    stepLog.info("response.step", {
      durationMs: Date.now() - t0,
      finishReason,
      toolCallNames: toolCalls.map((c) => c.function.name),
      hasContent: accContent.length > 0,
      streamed: streamedMessageId !== null,
    });

    if (toolCalls.length === 0) {
      const text = accContent.trim();
      if (text) {
        // Reuse the streamed id so the client's `message` handler replaces
        // the running text bubble with the final, trimmed copy.
        const id = streamedMessageId ?? nanoid();
        writer.write({ type: "message", id, role: "assistant", text });
      }
      writer.write({ type: "status", state: "idle" });
      stepLog.info("response.final", { textBytes: text.length, textPreview: text.slice(0, 140) });
      return;
    }

    messages.push({
      role: "assistant",
      content: accContent.length > 0 ? accContent : null,
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.function.name, arguments: c.function.arguments ?? "{}" },
      })),
    });

    for (const call of toolCalls) {
      if (signal?.aborted) return;
      const ack = runOneUiCall(call, writer, stepLog, bundle);
      messages.push({ role: "tool", tool_call_id: call.id, content: ack });
    }
  }

  log.warn("response.stepCapHit");
  writer.fail(
    "step_cap",
    "I needed more steps than my budget allows for this turn. Want me to keep going?",
    true,
  );
}

// UI tools that render upstream-backed data must be grounded by a real
// kapruka_* result in this turn's bundle. Without this guard the model can
// emit checkout/delivery panels with fabricated order ids and totals.
const UI_TOOL_BACKING: Record<string, string> = {
  present_checkout: "kapruka_create_order",
  order_confirmed: "kapruka_create_order",
  present_delivery_quote: "kapruka_check_delivery",
};

function runOneUiCall(
  call: ToolCall,
  writer: SseWriter,
  log: Logger,
  bundle: ToolBundle | null,
): string {
  const name = call.function.name;
  const raw = call.function.arguments ?? "{}";
  let args: Record<string, unknown>;
  try {
    args = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    log.warn("response.tool.badArgs", { tool: name, rawPreview: raw.slice(0, 200) });
    return `Could not parse arguments for ${name}: bad JSON.`;
  }

  if (
    !name.startsWith("present_") &&
    name !== "update_cart" &&
    name !== "request_info" &&
    name !== "order_confirmed" &&
    name !== "notify"
  ) {
    log.warn("response.tool.forbidden", { tool: name });
    return `Forbidden: ${name} is not a UI tool. Use only present_*, update_cart, request_info, order_confirmed, notify.`;
  }

  const requiredBacking = UI_TOOL_BACKING[name];
  if (requiredBacking) {
    const hasBacking = !!bundle?.calls.some((c) => c.tool === requiredBacking && c.ok);
    if (!hasBacking) {
      log.warn("response.tool.unbacked", { tool: name, requires: requiredBacking });
      return `Refused: ${name} requires a real ${requiredBacking} result in this turn before it can render. Stop emitting checkout/delivery cards until the upstream tool has succeeded.`;
    }
  }

  const ui = uiToolByName(name);
  if (!ui) {
    log.warn("response.tool.unknown", { tool: name });
    return `Unknown UI tool: ${name}.`;
  }

  const t0 = Date.now();
  try {
    const ack = ui.emit(args, writer);
    log.info("response.uiTool", { tool: name, durationMs: Date.now() - t0 });
    return ack;
  } catch (err) {
    const message = (err as Error).message;
    log.error("response.uiTool.error", { tool: name, error: message });
    return `UI tool ${name} threw: ${message}`;
  }
}
