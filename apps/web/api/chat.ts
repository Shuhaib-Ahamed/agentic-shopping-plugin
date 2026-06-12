import { ChatRequestSchema } from "@kapruka/protocol";
import { runAgent } from "./_lib/agent";
import { createSseWriter } from "./_lib/sse";
import { makeLogger, newTraceId } from "./_lib/log";

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
      try {
        await runAgent({ request: parsed.data, writer, signal: ctrl.signal, traceId });
      } catch (err) {
        reqLog.error("chat.internalError", { error: (err as Error).message });
        writer.fail("internal", (err as Error).message ?? "Internal error", true);
      } finally {
        writer.done();
        writer.close();
        req.signal.removeEventListener("abort", onClientAbort);
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
      "Connection": "keep-alive",
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
