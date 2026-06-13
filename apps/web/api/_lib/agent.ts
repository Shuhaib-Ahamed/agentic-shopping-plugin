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

import type { ChatRequest } from "@kapruka/protocol";
import { env } from "./env";
import { modelProvider } from "./openai";
import { getOrCreateSession } from "./sessionState";
import { routeTurn } from "./stages/router";
import { runToolLoop, type ToolBundle } from "./stages/toolLoop";
import { runResponse } from "./stages/response";
import { pickStatusLabel } from "./statusPool";
import type { SseWriter } from "./sse";
import { makeLogger, newTraceId, type Logger } from "./log";

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

  // Last 3 messages, per spec. The last entry is the current user turn.
  const recent = request.messages.slice(-3);
  const session = getOrCreateSession(request);

  log.info("agent.start", {
    locale: request.context?.locale,
    currency: request.context?.currency,
    messageCount: request.messages.length,
    recentCount: recent.length,
    cartLines: session.cart.lines.length,
  });

  // STAGE 1: Router.
  writer.write({ type: "status", state: "routing", label: pickStatusLabel("routing") });
  const decision = await runStage(log, "router", () =>
    routeTurn({ recent, session, log: log.child({ ctx: "router" }) }),
  );
  if (!decision) {
    writer.fail("router_failed", "I had trouble understanding that. Want to try again?", true);
    return;
  }

  // STAGE 2: Tool loop, only when needed and not blocked by safety.
  let bundle: ToolBundle | null = null;
  if (decision.needs_tools && decision.safety_flag !== "out_of_scope") {
    if (decision.safety_flag === "injection_detected") {
      log.warn("agent.injectionDetected", { intent: decision.intent_summary });
    }
    bundle = await runStage(log, "toolLoop", () =>
      runToolLoop({
        recent,
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
      recent,
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
