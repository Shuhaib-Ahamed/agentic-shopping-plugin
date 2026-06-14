import { ChatRequestSchema } from "@kapruka/protocol";
import { runAgent } from "./_lib/agent.js";
import { runWithTracer } from "./_lib/console/traceContext.js";
import { startTurnTrace } from "./_lib/console/tracer.js";
import { makeLogger, newTraceId } from "./_lib/log.js";
import { createSseWriter } from "./_lib/sse.js";

const log = makeLogger({ ctx: "chat" });

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    log.warn("chat.badJson");
    return json({ error: "Bad JSON" }, 400);
  }
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    log.warn("chat.invalidBody", { issues: parsed.error.issues.slice(0, 5) });
    return json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const traceId = newTraceId();
  const reqLog = log.child({ traceId, sessionId: parsed.data.sessionId });
  reqLog.info("chat.received", {
    messageCount: parsed.data.messages.length,
    locale: parsed.data.context?.locale,
    currency: parsed.data.context?.currency,
    cartLines: parsed.data.context?.cart?.length ?? 0,
  });

  const ctrl = new AbortController();
  const onClientAbort = () => {
    reqLog.warn("chat.clientAbort");
    ctrl.abort();
  };
  req.signal.addEventListener("abort", onClientAbort, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writer = createSseWriter(controller);
      // Wrap with the console tracer. Fire-and-forget persistence; failures
      // here must never delay or break the SSE stream.
      const tracer = startTurnTrace({
        request: parsed.data,
        writer,
        turnIndex: parsed.data.messages.filter((m) => m.role === "user").length - 1,
        traceId,
      });
      try {
        await runWithTracer(tracer, () =>
          runAgent({ request: parsed.data, writer: tracer.writer, signal: ctrl.signal, traceId }),
        );
      } catch (err) {
        reqLog.error("chat.internalError", { error: (err as Error).message });
        tracer.recordError({
          code: "internal",
          message: (err as Error).message ?? "Internal error",
          recoverable: true,
        });
        writer.fail("internal", (err as Error).message ?? "Internal error", true);
      } finally {
        writer.done();
        req.signal.removeEventListener("abort", onClientAbort);
        // Persist BEFORE closing the controller — once the response body is
        // closed, the function may be terminated and the await would never
        // resolve. Inner try/catch swallows tracer errors so persistence can
        // never delay or break chat.
        try {
          await tracer.finish();
        } catch {
          /* swallow */
        }
        writer.close();
        reqLog.info("chat.closed");
      }
    },
    cancel() {
      reqLog.info("chat.cancelled");
      ctrl.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = handler;
