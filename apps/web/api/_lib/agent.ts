// 3-stage Juno pipeline orchestrator.
//
// Pipeline (full spec in instructuctions.md, "Juno LLM Pipeline" addendum):
//
//   user turn
//      │
//      ▼
//   Stage 1: Router   cheap classifier, JSON only, no tools.
//      │
//      │ needs_tools ? ───────────────┐
//      ▼                              │
//   Stage 2: Tool loop                │ no
//   kapruka_* (MCP + local cart).     │
//      │                              │
//      └──────────────┬───────────────┘
//                     ▼
//                Stage 3: Response
//                UI tools only, streams text.
//
// Stage 3 always runs. Stage 2 runs only when Stage 1 says so. State that
// survives the 3-message rolling window (cart, current product, delivery,
// order) lives in sessionState.

import type { ChatMessage, ChatRequest } from "@kapruka/protocol";
import { env } from "./env.js";
import { makeLogger, newTraceId, type Logger } from "./log.js";
import { prewarmMcp } from "./mcp.js";
import { modelProvider } from "./openai.js";
import { mergeShopperBrief, getOrCreateSession } from "./sessionState.js";
import type { SseWriter } from "./sse.js";
import { runResponse } from "./stages/response.js";
import { EMPTY_BRIEF_DELTA, routeTurn, type RoutingDecision } from "./stages/router.js";
import { runToolLoop, type ToolBundle } from "./stages/toolLoop.js";
import { pickStatusLabel } from "./statusPool.js";

// Kick the MCP cold handshake (~2-9 s) before any user turn, so the first
// shopper request doesn't eat it. Fire-and-forget; the promise is awaited by
// the first real `callTool`. Safe to call multiple times — `listTools` is
// memoized.
prewarmMcp();

// Whole-message greeting detector. Only matches when the entire message is a
// greeting token — "hello" passes, "hello, find me cakes" does not. Skipping
// the router LLM here drops first-token latency from ~3 s to < 50 ms for the
// most common opening turn.
const GREETING_RE =
  /^\s*(?:hi+|hello+|hey+|hiya|howdy|good\s+(?:morning|afternoon|evening|day)|yo|sup|ayubowan|ayubowen|salaam|salam|vanakkam|vanakam|ආයුබෝවන්|வணக்கம்)\s*[\s.!?,]*\s*$/i;

function tryHeuristicRoute(text: string): RoutingDecision | null {
  if (!text || text.length > 60) return null;
  if (!GREETING_RE.test(text)) return null;
  return {
    in_scope: true,
    needs_tools: false,
    route: "greeting",
    intent_summary: "Heuristic greeting (pre-router)",
    missing_info: [],
    safety_flag: "none",
    direct_reply_hint: "greet",
    brief_delta: EMPTY_BRIEF_DELTA,
  };
}

// Per-stage raw-message windows. The shopper brief carries older context, so
// the raw window can stay small without losing recipient, occasion, budget,
// or rejected SKUs. Router needs the least, response the most.
const WINDOW_ROUTER = 4;
const WINDOW_TOOLS = 6;
const WINDOW_RESPONSE = 8;

// Soft char budget per stage. If the picked window blows the budget, drop
// oldest messages first. Roughly 4 chars per token, so 8000 chars ≈ 2000
// tokens of raw chat, well within prompt-cache prefix limits.
const WINDOW_CHAR_BUDGET = 8000;

function pickWindow(messages: ChatMessage[], count: number): ChatMessage[] {
  const slice = messages.slice(-count);
  // Always keep the latest user message (last entry). Trim from the front
  // when the slice blows the soft char budget.
  while (slice.length > 1 && totalChars(slice) > WINDOW_CHAR_BUDGET) {
    slice.shift();
  }
  return slice;
}

function totalChars(messages: ChatMessage[]): number {
  let sum = 0;
  for (const m of messages) sum += m.content.length;
  return sum;
}

const baseLog = makeLogger({ ctx: "agent" });

interface RunAgentOptions {
  request: ChatRequest;
  writer: SseWriter;
  signal?: AbortSignal;
  traceId?: string;
}

export async function runAgent({
  request,
  writer,
  signal,
  traceId,
}: RunAgentOptions): Promise<void> {
  void env(); // fail fast on bad env
  const tid = traceId ?? newTraceId();
  const provider = modelProvider();
  const log = baseLog.child({ traceId: tid, sessionId: request.sessionId, provider });
  const reqStart = Date.now();

  // Per-stage raw windows. The shopper brief carries older intent so the raw
  // window can stay small. The last entry is always the current user turn.
  const routerWindow = pickWindow(request.messages, WINDOW_ROUTER);
  const toolsWindow = pickWindow(request.messages, WINDOW_TOOLS);
  const responseWindow = pickWindow(request.messages, WINDOW_RESPONSE);
  const session = getOrCreateSession(request);

  log.info("agent.start", {
    locale: request.context?.locale,
    currency: request.context?.currency,
    messageCount: request.messages.length,
    windowRouter: routerWindow.length,
    windowTools: toolsWindow.length,
    windowResponse: responseWindow.length,
    cartLines: session.cart.lines.length,
  });

  // STAGE 1: Router. Try a fast heuristic first; if it matches we skip the
  // LLM call entirely, dropping ~3 s of first-token latency for greetings.
  const lastUserText = routerWindow[routerWindow.length - 1]?.content ?? "";
  const heuristic = tryHeuristicRoute(lastUserText);
  let decision: RoutingDecision | null;
  if (heuristic) {
    log.info("agent.router.heuristic", { route: heuristic.route });
    decision = heuristic;
  } else {
    writer.write({ type: "status", state: "routing", label: pickStatusLabel("routing") });
    decision = await runStage(log, "router", () =>
      routeTurn({ recent: routerWindow, session, log: log.child({ ctx: "router" }) }),
    );
    if (!decision) {
      writer.fail("router_failed", "I had trouble understanding that. Want to try again?", true);
      return;
    }
  }

  // Merge the router's brief_delta into the durable session brief BEFORE
  // Stage 2 and Stage 3 render <BRIEF>. Brief is derived from the shopper's
  // own messages, never from tool results, so it does not bypass any safety
  // rule. Delivery address still comes only from the explicit delivery form.
  session.shopperBrief = mergeShopperBrief(session.shopperBrief, {
    recipient: decision.brief_delta.recipient,
    occasion: decision.brief_delta.occasion,
    budget: decision.brief_delta.budget,
    preferences: decision.brief_delta.preferences,
    rejectedSkus: decision.brief_delta.rejected_skus,
    language: decision.brief_delta.language,
  });
  log.info("agent.briefMerged", { brief: session.shopperBrief });

  // STAGE 2: Tool loop, only when needed and not blocked by safety.
  let bundle: ToolBundle | null = null;
  if (decision.needs_tools && decision.safety_flag !== "out_of_scope") {
    if (decision.safety_flag === "injection_detected") {
      log.warn("agent.injectionDetected", { intent: decision.intent_summary });
    }
    bundle = await runStage(log, "toolLoop", () =>
      runToolLoop({
        recent: toolsWindow,
        session,
        decision,
        writer,
        log: log.child({ ctx: "toolLoop" }),
        signal,
      }),
    );
    if (!bundle) {
      writer.fail("tools_failed", "The store didn't respond. Want me to try again?", true);
      return;
    }
    log.info("agent.toolBundle", {
      calls: bundle.calls.length,
      errors: bundle.errors.length,
      truncated: bundle.truncated,
    });
  } else {
    log.info("agent.skipTools", { route: decision.route, safety: decision.safety_flag });
  }

  // STAGE 3: Response. Always runs.
  await runStage(log, "response", () =>
    runResponse({
      recent: responseWindow,
      session,
      decision,
      bundle,
      writer,
      log: log.child({ ctx: "response" }),
      signal,
    }),
  );

  log.info("agent.done", { totalMs: Date.now() - reqStart });
}

async function runStage<T>(log: Logger, name: string, fn: () => Promise<T>): Promise<T | null> {
  const t0 = Date.now();
  try {
    const result = await fn();
    log.info(`agent.stage.${name}.ok`, { durationMs: Date.now() - t0 });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`agent.stage.${name}.error`, {
      durationMs: Date.now() - t0,
      error: redactSensitive(message),
    });
    return null;
  }
}

function redactSensitive(s: string): string {
  return s
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "sk-***")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "***@***")
    .replace(/\b(?:\+?94|0)?7\d{8}\b/g, "***-***-****");
}
