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
    // The gateway answers JSON for both success and its own errors, but a
    // platform-level failure (504 HTML page, plain-text 405) does not. Guard
    // so those surface as a readable status instead of a JSON parse throw.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        code: res.status === 429 ? "rate_limited" : "internal",
        message: `Checkout failed (HTTP ${res.status}). Please try again.`,
      };
    }
    const json = (await res.json()) as PostCheckoutResult;
    if (!res.ok && json.ok !== false) {
      return {
        ok: false,
        code: "internal",
        message: `Checkout failed (HTTP ${res.status}). Please try again.`,
      };
    }
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
  // Watchdog: if the stream goes idle for this long with no terminal event,
  // abort and surface a timeout error so the shopper sees a recovery prompt
  // instead of staring at a stale "thinking" spinner forever. Status pings
  // count as activity (route changes etc. extend the idle window).
  const IDLE_TIMEOUT_MS = 30_000;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const armIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, IDLE_TIMEOUT_MS);
  };
  (async () => {
    let sawAnyEvent = false;
    let sawTerminal = false;
    armIdleTimer();
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
      await readSseStream(
        res.body,
        (raw) => {
          const event = parseSseFrame(raw);
          if (event) {
            sawAnyEvent = true;
            // "done", "error", and "message" all signal that the turn produced
            // *something* the shopper can react to. If none of these fire before
            // the stream closes, the FE was left silent — surface that as an
            // error rather than just clearing the spinner.
            if (event.type === "done" || event.type === "error" || event.type === "message") {
              sawTerminal = true;
            }
            handlers.onEvent(event);
          }
        },
        // Re-arm on raw bytes, not parsed frames: a long tool call that only
        // sends SSE comments/heartbeats still proves the server is alive, so
        // the watchdog measures true idle time on the wire.
        armIdleTimer,
      );
      // Stream closed cleanly but the gateway never produced a usable reply —
      // typical signature of a function timeout, a crash mid-stream, or a
      // dev-server restart. Don't leave the shopper staring at a blank chat.
      if (!sawAnyEvent || !sawTerminal) {
        throw new Error("The assistant didn't reply. The connection ended early — please retry.");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        if (timedOut) {
          // Watchdog tripped after a long idle window. Tell the UI so it can
          // swap the spinner for a retry banner.
          handlers.onError(
            new Error(
              `No reply within ${Math.round(IDLE_TIMEOUT_MS / 1000)} s. The connection went idle, please retry.`,
            ),
          );
        }
        // User-initiated abort: stay silent.
        return;
      }
      handlers.onError(err);
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
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
  onBytes?: () => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  // Frames separated by blank line.
  // Each frame can contain multiple `field: value` lines.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    onBytes?.();
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (frame.trim().length > 0) onFrame(frame);
    }
  }
  // Flush a final frame that the server did not terminate with a blank line
  // (e.g. the connection was cut right after the terminal event's newline).
  if (buffer.trim().length > 0) onFrame(buffer);
}

/** Parse a single SSE frame into a typed event, or null if it does not pass schema. */
function parseSseFrame(raw: string): SseEvent | null {
  const lines = raw.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(":")) continue; // comment
    if (line.startsWith("data:")) {
      // Per the SSE spec: strip one leading space, keep everything else, and
      // join multiple data lines with a newline (never concatenate raw).
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  const data = dataLines.join("\n");
  if (!data.trim()) return null;
  try {
    const parsed = SseEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Full order lifecycle reported by /api/order-status. */
export type OrderStatus = "pending" | "paid" | "processing" | "dispatched" | "delivered" | "failed";

/** Poll /api/order-status until a terminal status arrives or the poller is stopped. */
export interface OrderStatusPollerOptions {
  orderId: string;
  intervalMs?: number;
  maxAttempts?: number;
  /** Statuses that end polling. Defaults to payment-watch semantics: stop once
   *  the order is paid (or beyond) or failed. Pass ["delivered", "failed"] to
   *  keep polling through fulfilment for the tracking timeline. */
  terminalStatuses?: OrderStatus[];
  onStatus: (status: OrderStatus, trackingUrl?: string) => void;
  onError?: (err: unknown) => void;
}

const PAYMENT_TERMINAL: OrderStatus[] = ["paid", "processing", "dispatched", "delivered", "failed"];

export function pollOrderStatus({
  orderId,
  intervalMs = 4000,
  maxAttempts = 120,
  terminalStatuses = PAYMENT_TERMINAL,
  onStatus,
  onError,
}: OrderStatusPollerOptions): { stop: () => void } {
  let stopped = false;
  let attempt = 0;
  let timer: number | undefined;
  const terminal = new Set(terminalStatuses);
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
        status: OrderStatus;
        trackingUrl?: string;
      };
      if (stopped) return; // stop() raced the fetch; drop the stale result
      onStatus(json.status, json.trackingUrl);
      if (terminal.has(json.status)) {
        stopped = true;
        return;
      }
    } catch (err) {
      if (!stopped) onError?.(err);
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
