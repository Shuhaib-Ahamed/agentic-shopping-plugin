import {
  ChatRequestSchema,
  type CartLine,
  type ChatRequest,
  type Currency,
  type OrderSummary,
  type Recipient,
  type SseEvent,
  SseEventSchema,
} from "@kapruka/protocol";

export interface PostCheckoutInput {
  sessionId: string;
  cart: CartLine[];
  recipient: Recipient;
  delivery: { city: string; date: string };
  giftMessage?: string;
  sender?: { name?: string; phone?: string; email?: string };
  currency?: Currency;
}

export type PostCheckoutResult =
  | {
      ok: true;
      orderId: string;
      payUrl: string;
      expiresAt: string;
      summary: OrderSummary;
      perishableWarning: string | null;
    }
  | {
      ok: false;
      code: "bad_request" | "mcp_failed" | "rate_limited" | "internal";
      message: string;
    };

/**
 * Direct checkout: POSTs to /api/checkout, which calls Kapruka MCP without
 * touching the LLM. Returns a single JSON payload — no SSE, no streaming.
 */
export async function postCheckout(input: PostCheckoutInput): Promise<PostCheckoutResult> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as PostCheckoutResult;
    return json;
  } catch (err) {
    return {
      ok: false,
      code: "internal",
      message: (err as Error).message ?? "Network error during checkout.",
    };
  }
}

export interface ChatStreamHandlers {
  onEvent: (event: SseEvent) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
}

/**
 * Streams an SSE response from /api/chat. Uses fetch + ReadableStream because the
 * request is a POST with a body; EventSource cannot do POST.
 *
 * Returns a function that aborts the stream.
 */
export function streamChat(
  request: ChatRequest,
  handlers: ChatStreamHandlers,
): { abort: () => void } {
  const parsed = ChatRequestSchema.safeParse(request);
  if (!parsed.success) {
    handlers.onError(new Error(`Bad chat request: ${parsed.error.message}`));
    handlers.onClose();
    return { abort: () => {} };
  }

  const ctrl = new AbortController();
  (async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(parsed.data),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Chat request failed: ${res.status} ${res.statusText}`);
      }
      await readSseStream(res.body, (raw) => {
        const event = parseSseFrame(raw);
        if (event) handlers.onEvent(event);
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      handlers.onError(err);
    } finally {
      handlers.onClose();
    }
  })();

  return {
    abort: () => ctrl.abort(),
  };
}

/** Read SSE frames from a ReadableStream of bytes; call `onFrame(raw)` for each. */
async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onFrame: (frame: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  // Frames separated by blank line.
  // Each frame can contain multiple `field: value` lines.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (frame.trim().length > 0) onFrame(frame);
    }
  }
}

/** Parse a single SSE frame into a typed event, or null if it does not pass schema. */
function parseSseFrame(raw: string): SseEvent | null {
  const lines = raw.split(/\r?\n/);
  let data = "";
  for (const line of lines) {
    if (line.startsWith(":")) continue; // comment
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }
  if (!data) return null;
  try {
    const parsed = SseEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Poll /api/order-status until status changes from pending or until aborted. */
export interface OrderStatusPollerOptions {
  orderId: string;
  intervalMs?: number;
  maxAttempts?: number;
  onStatus: (status: "pending" | "paid" | "failed", trackingUrl?: string) => void;
  onError?: (err: unknown) => void;
}

export function pollOrderStatus({
  orderId,
  intervalMs = 4000,
  maxAttempts = 120,
  onStatus,
  onError,
}: OrderStatusPollerOptions): { stop: () => void } {
  let stopped = false;
  let attempt = 0;
  let timer: number | undefined;
  const tick = async () => {
    if (stopped) return;
    attempt += 1;
    try {
      const res = await fetch(`/api/order-status?orderId=${encodeURIComponent(orderId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Order status failed: ${res.status}`);
      const json = (await res.json()) as {
        status: "pending" | "paid" | "failed";
        trackingUrl?: string;
      };
      onStatus(json.status, json.trackingUrl);
      if (json.status !== "pending") {
        stopped = true;
        return;
      }
    } catch (err) {
      onError?.(err);
    }
    if (!stopped && attempt < maxAttempts) {
      timer = window.setTimeout(tick, intervalMs);
    }
  };
  timer = window.setTimeout(tick, intervalMs);
  return {
    stop: () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    },
  };
}
