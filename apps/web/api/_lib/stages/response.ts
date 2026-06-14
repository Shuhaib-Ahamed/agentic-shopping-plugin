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
import { renderStateBlock, type SessionState } from "../sessionState.js";
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

  const systemBlocks: ChatMessageItem[] = [
    { role: "system", content: system },
    { role: "system", content: renderStateBlock(session) },
    { role: "system", content: renderRoutingBlock(decision) },
  ];
  if (bundle) {
    systemBlocks.push({ role: "system", content: renderDataBlock(bundle) });
  }

  const messages: ChatMessageItem[] = [
    ...systemBlocks,
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessageItem),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK union types are wider than our subset
    const response: any = await client.chat.completions.create({
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChatMessageItem matches SDK subset
      messages: messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- our UI tool schemas are heterogeneous
      tools: tools as any,
      tool_choice: "auto",
      parallel_tool_calls: false,
      temperature: 0.5,
    });

    const choice = response.choices?.[0];
    const reply = choice?.message;
    const toolCalls: ToolCall[] = (reply?.tool_calls ?? []) as ToolCall[];
    const finishReason: string | undefined = choice?.finish_reason;
    stepLog.info("response.step", {
      durationMs: Date.now() - t0,
      finishReason,
      toolCallNames: toolCalls.map((c) => c.function.name),
      hasContent: Boolean(reply?.content),
      usage: response.usage,
    });

    if (toolCalls.length === 0) {
      const text = (reply?.content ?? "").trim();
      if (text) {
        writer.write({ type: "message", id: nanoid(), role: "assistant", text });
      }
      writer.write({ type: "status", state: "idle" });
      stepLog.info("response.final", { textBytes: text.length, textPreview: text.slice(0, 140) });
      return;
    }

    messages.push({
      role: "assistant",
      content: reply?.content ?? null,
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.function.name, arguments: c.function.arguments ?? "{}" },
      })),
    });

    for (const call of toolCalls) {
      if (signal?.aborted) return;
      const ack = runOneUiCall(call, writer, stepLog);
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

function runOneUiCall(call: ToolCall, writer: SseWriter, log: Logger): string {
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
