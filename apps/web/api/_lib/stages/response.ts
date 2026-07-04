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

// Cap how many times the model may call the *same* UI tool in one turn before
// we force it to commit. Without this the response stage can loop
// `present_options` indefinitely when the router brief is sparse, surfacing
// duplicate chip rows and hitting MAX_ITERATIONS.
const SAME_UI_TOOL_CAP = 2;

// Tool-plan leak filter. The system prompt forbids revealing tool names, but
// gpt-5-nano sometimes prefixes its reply with a line like
// `present_options with layout "chips" ...` that describes what it's about
// to call. We strip lines that start with a known UI/MCP tool identifier from
// the shopper-visible text. This is a belt-and-braces guard on top of the
// system-prompt rule.
const TOOL_LEAK_RE =
  /^\s*(?:present_(?:products|product_detail|options|delivery_quote|checkout)|order_confirmed|update_cart|request_info|notify|kapruka_[a-z_]+)\b.*$/gim;

// Bracketed tool-name leak: `[present_options]`, `[present_options "args"]`,
// `<present_options>`. Strip the bracket span itself, not the whole line, so
// surrounding prose survives. Tool name list mirrors TOOL_LEAK_RE.
const BRACKET_TOOL_RE =
  /[[<](?:present_(?:products|product_detail|options|delivery_quote|checkout)|order_confirmed|update_cart|request_info|notify|kapruka_[a-z_]+)\b[^\]>]*[\]>]/gi;

// Secondary leak: instead of describing the tool call by name, the model
// dumps the tool's argument shape as YAML-ish key/value markdown lines like
//   prompt: null
//   options:
//     - label: ...
//       value: ...
//       icon: ...
//       emoji: ...
// We detect runs of >= 3 of these keys close together and strip them. Plain
// chat replies rarely use this shape, so false positives are low.
const ARG_DUMP_KEY_RE =
  /^\s*-?\s*(?:prompt|options|label|value|icon|emoji|fields|cart_lines|delivery_fee|subtotal|total|order_id|pay_url|state|tone|layout)\s*:/gm;

function stripToolPlanLeak(text: string): string {
  let out = text.replace(TOOL_LEAK_RE, "").replace(BRACKET_TOOL_RE, "");
  ARG_DUMP_KEY_RE.lastIndex = 0;
  const argMatches = out.match(ARG_DUMP_KEY_RE) ?? [];
  if (argMatches.length >= 3) {
    out = out.replace(ARG_DUMP_KEY_RE, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// Deterministic fast-path replies. The router stage classifies the turn; for
// well-known terminal routes (greeting, out_of_scope, unsafe) we skip the
// LLM, emit a canned message + starter chips, and finish in ~50 ms. This
// also makes safety routes immune to model persuasion (FLOW-3 fix).
function emitFastReply(
  writer: SseWriter,
  text: string,
  chips: Array<{ label: string; value: string }> | null,
): void {
  if (chips && chips.length >= 2) {
    writer.write({
      type: "options",
      options: chips.map((c) => ({ label: c.label, value: c.value })),
      layout: "chips",
    });
  }
  writer.write({ type: "message", id: nanoid(), role: "assistant", text });
  writer.write({ type: "status", state: "idle" });
}

const STARTER_CHIPS = [
  { label: "Birthday gift", value: "Show me birthday gifts" },
  { label: "Fresh flowers", value: "I want to send fresh flowers" },
  { label: "Cakes", value: "Show me cakes" },
  { label: "Surprise me", value: "Surprise me with something popular" },
];

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

  // Fast-path: deterministic canned reply for terminal routes. Skips the LLM
  // entirely, so a greeting turn lands in < 100 ms and an off-topic / unsafe
  // turn lands without any model persuasion risk. Routes that benefit from
  // model wording (clarify, search, checkout, etc.) fall through.
  if (decision.route === "out_of_scope" || decision.safety_flag === "out_of_scope") {
    log.info("response.fastPath", { route: decision.route, kind: "out_of_scope" });
    emitFastReply(
      writer,
      "I'm here to help you shop on Kapruka, not a general assistant. What can I help you find?",
      STARTER_CHIPS,
    );
    return;
  }
  if (decision.route === "unsafe") {
    log.info("response.fastPath", { route: decision.route, kind: "unsafe" });
    emitFastReply(
      writer,
      "I can't help with that. I can help you shop on Kapruka instead.",
      STARTER_CHIPS,
    );
    return;
  }
  if (decision.route === "greeting") {
    log.info("response.fastPath", { route: decision.route, kind: "greeting" });
    emitFastReply(
      writer,
      "Hi! I'm Juno, your Kapruka shopping helper. What are you in the mood for today?",
      STARTER_CHIPS,
    );
    return;
  }

  const model = stageModel("response");
  const client = modelClient();

  writer.write({ type: "status", state: "composing", label: pickStatusLabel("composing") });

  const uiToolCallCount = new Map<string, number>();
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
        // the model emits both (uncommon), the already-streamed partial is
        // retracted after the stream ends (empty-text message, same id). We
        // also avoid streaming if the accumulated buffer so far looks like a
        // tool-plan leak; the final `message` event carries sanitized text.
        if (!sawToolCall && !TOOL_LEAK_RE.test(accContent)) {
          TOOL_LEAK_RE.lastIndex = 0;
          if (!streamedMessageId) streamedMessageId = nanoid();
          writer.write({ type: "token", id: streamedMessageId, delta: delta.content });
        }
        TOOL_LEAK_RE.lastIndex = 0;
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

    if (toolCalls.length > 0 && streamedMessageId !== null) {
      // Tokens streamed before the tool_call surfaced already created a text
      // bubble on the client; leaving it would strand a half-sentence next to
      // the real reply from a later iteration. An empty-text `message` with
      // the same id retracts it (the store drops empty bubbles).
      stepLog.info("response.retractPartial", { id: streamedMessageId });
      writer.write({ type: "message", id: streamedMessageId, role: "assistant", text: "" });
    }

    if (toolCalls.length === 0) {
      const text = stripToolPlanLeak(accContent);
      if (text) {
        // Reuse the streamed id so the client's `message` handler replaces
        // the running text bubble with the final, trimmed copy.
        const id = streamedMessageId ?? nanoid();
        writer.write({ type: "message", id, role: "assistant", text });
      }
      writer.write({ type: "status", state: "idle" });
      stepLog.info("response.final", {
        textBytes: text.length,
        textPreview: text.slice(0, 140),
        leakStripped: text.length !== accContent.trim().length,
      });
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
      const name = call.function.name;
      const prev = uiToolCallCount.get(name) ?? 0;
      if (prev >= SAME_UI_TOOL_CAP) {
        // Force the model to stop re-calling the same UI tool. The tool
        // response steers it to either commit to text or pick a different tool.
        stepLog.warn("response.tool.sameToolCap", { tool: name, count: prev });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: `You have already called ${name} ${prev} times this turn. Do not call it again. Either reply with shopper-facing text now and stop, or call a different UI tool.`,
        });
        continue;
      }
      uiToolCallCount.set(name, prev + 1);
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

interface ProductFacts {
  image?: string;
  url?: string;
  rating?: number;
}

/**
 * Index every product the tool loop actually fetched this turn, keyed by id.
 * Kapruka returns `image_url`; the UI tools expect `image`. The model is
 * instructed to copy the mapping but routinely nulls it, so the gateway
 * backfills deterministically instead of trusting the copy step.
 */
function buildProductFacts(bundle: ToolBundle | null): Map<string, ProductFacts> {
  const facts = new Map<string, ProductFacts>();
  if (!bundle) return facts;
  const harvest = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) harvest(item);
      return;
    }
    const rec = node as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : undefined;
    if (id && (rec.image_url || rec.image || rec.url)) {
      const prev = facts.get(id) ?? {};
      const image = rec.image_url ?? rec.image;
      const url = rec.url ?? rec.product_url;
      facts.set(id, {
        image: typeof image === "string" && image.startsWith("http") ? image : prev.image,
        url: typeof url === "string" && url.startsWith("http") ? url : prev.url,
        rating: typeof rec.rating === "number" ? rec.rating : prev.rating,
      });
    }
    for (const value of Object.values(rec)) {
      if (value && typeof value === "object") harvest(value);
    }
  };
  for (const call of bundle.calls) {
    if (!call.ok) continue;
    if (call.tool !== "kapruka_search_products" && call.tool !== "kapruka_get_product") continue;
    let result: unknown = call.result;
    if (typeof result === "string") {
      try {
        result = JSON.parse(result);
      } catch {
        continue;
      }
    }
    harvest(result);
  }
  return facts;
}

/**
 * Chip hygiene: the model sometimes converts a kapruka_list_delivery_cities
 * result into a chip row of alphabetical city names, which is useless next to
 * the form's autocomplete. Compare chip labels against the city names fetched
 * THIS turn and drop the matches. If that guts the row, block the call so the
 * model falls back to the delivery form.
 */
function stripCityChips(
  args: Record<string, unknown>,
  bundle: ToolBundle | null,
): { removed: number; blocked: boolean } | null {
  if (!bundle || !Array.isArray(args.options)) return null;
  const cities = new Set<string>();
  const collect = (node: unknown): void => {
    if (typeof node === "string") {
      cities.add(node.toLowerCase());
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) collect(item);
      return;
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      if (typeof rec.canonical === "string") cities.add(rec.canonical.toLowerCase());
      if (typeof rec.name === "string") cities.add(rec.name.toLowerCase());
      for (const v of Object.values(rec)) {
        if (v && typeof v === "object") collect(v);
        else if (typeof v === "string") continue;
      }
    }
  };
  for (const call of bundle.calls) {
    if (call.tool !== "kapruka_list_delivery_cities" || !call.ok) continue;
    let result: unknown = call.result;
    if (typeof result === "string") {
      try {
        result = JSON.parse(result);
      } catch {
        continue;
      }
    }
    collect(result);
  }
  if (cities.size === 0) return null;
  const options = args.options as Array<Record<string, unknown>>;
  const kept = options.filter((o) => {
    const label = typeof o?.label === "string" ? o.label.trim().toLowerCase() : "";
    const value = typeof o?.value === "string" ? o.value.trim().toLowerCase() : "";
    return !cities.has(label) && !cities.has(value);
  });
  const removed = options.length - kept.length;
  if (removed === 0) return null;
  if (kept.length >= 2) {
    args.options = kept;
    return { removed, blocked: false };
  }
  return { removed, blocked: true };
}

/** Fill image/url/rating the model dropped, straight from this turn's tool results. */
function enrichProductArgs(
  name: string,
  args: Record<string, unknown>,
  bundle: ToolBundle | null,
  log: Logger,
): void {
  if (name !== "present_products" && name !== "present_product_detail") return;
  const facts = buildProductFacts(bundle);
  if (facts.size === 0) return;
  let filled = 0;
  const fix = (item: unknown): void => {
    if (!item || typeof item !== "object") return;
    const p = item as Record<string, unknown>;
    const known = typeof p.id === "string" ? facts.get(p.id) : undefined;
    if (!known) return;
    if (!p.image && known.image) {
      p.image = known.image;
      filled += 1;
    }
    if (!p.url && known.url) p.url = known.url;
    if (p.rating == null && known.rating != null) p.rating = known.rating;
  };
  if (Array.isArray(args.items)) for (const item of args.items) fix(item);
  if (args.product) fix(args.product);
  // present_product_detail requires images[] (min 1); recover it from the
  // product image when the model sent nothing usable.
  if (name === "present_product_detail") {
    const product = args.product as Record<string, unknown> | undefined;
    const images = Array.isArray(args.images) ? (args.images as unknown[]) : [];
    const usable = images.filter((u) => typeof u === "string" && u.startsWith("http"));
    if (usable.length === 0 && typeof product?.image === "string") {
      args.images = [product.image];
      filled += 1;
    }
  }
  if (filled > 0) log.info("response.enrichedProductArgs", { tool: name, filled });
}

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

  enrichProductArgs(name, args, bundle, log);

  if (name === "present_options") {
    const veto = stripCityChips(args, bundle);
    if (veto) {
      log.warn("response.tool.cityChipsBlocked", { removed: veto.removed });
      if (veto.blocked) {
        return (
          "Refused: do not present delivery cities as chips. Collect the city through the " +
          "request_info delivery form (its city field has autocomplete over the full list)."
        );
      }
    }
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
