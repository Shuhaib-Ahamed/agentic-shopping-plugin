import { encodeSseEvent, type SseEvent } from "@kapruka/protocol";

export interface SseWriter {
  /** Write a typed event. */
  write(event: SseEvent): void;
  /** Write the terminating done event. */
  done(): void;
  /** Write a recoverable error and the terminating done event. */
  fail(code: string, message: string, recoverable?: boolean): void;
  /** Close the underlying stream. */
  close(): void;
  /** Has the stream been closed already? */
  isClosed(): boolean;
}

export function createSseWriter(
  controller: ReadableStreamDefaultController<Uint8Array>,
): SseWriter {
  const encoder = new TextEncoder();
  let closed = false;
  const enqueue = (event: SseEvent) => {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(encodeSseEvent(event)));
    } catch {
      closed = true;
    }
  };
  return {
    write: enqueue,
    done() {
      if (closed) return;
      enqueue({ type: "done" });
    },
    fail(code, message, recoverable = true) {
      if (closed) return;
      enqueue({ type: "error", code, message, recoverable });
      enqueue({ type: "done" });
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    isClosed: () => closed,
  };
}
