// Client telemetry channel. Buffers events and flushes on an interval or page
// hide so it never competes with the chat stream. Fire-and-forget: failures are
// swallowed. The gateway tracer is the source of truth for the turn record;
// these events add what only the browser knows (UI inputs, render acks, perf).
import type { ClientTelemetryEvent } from "@kapruka/protocol";

interface Buffer {
  events: ClientTelemetryEvent[];
}

const buffer: Buffer = { events: [] };
let flushTimer: number | undefined;
const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 32;

function scheduleFlush() {
  if (flushTimer !== undefined) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush() {
  if (buffer.events.length === 0) return;
  const batch = buffer.events.splice(0, MAX_BATCH);
  try {
    const body = JSON.stringify({ events: batch });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/telemetry", blob);
      return;
    }
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Swallow. Telemetry must never affect the shopper.
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}

function randomEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `te_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emitTelemetry(event: Omit<ClientTelemetryEvent, "eventId" | "at">) {
  buffer.events.push({
    ...event,
    eventId: randomEventId(),
    at: new Date().toISOString(),
  });
  if (buffer.events.length >= MAX_BATCH) {
    void flush();
    return;
  }
  scheduleFlush();
}
