// Single writer for telemetry. Owns redaction, validation, mongo persistence,
// and a small in-memory buffer for the no-Mongo demo mode so the admin reads
// can still observe live client events.
import type { ClientTelemetryEvent } from "@kapruka/protocol";
import { collections, hasMongo } from "./mongo.js";

const MEMO: ClientTelemetryEvent[] = [];
const MEMO_CAP = 1000;

const PII_RULES: Array<{ re: RegExp; repl: string }> = [
  { re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, repl: "{{email}}" },
  { re: /\b(?:\+?94|0)?7\d{8}\b/g, repl: "{{phone}}" },
  { re: /\bKP-\d{4,10}\b/g, repl: "{{order_id}}" },
];

export function redactString(value: string): string {
  let out = value;
  for (const r of PII_RULES) out = out.replace(r.re, r.repl);
  return out;
}

function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string") out[k] = redactString(v);
    else if (v && typeof v === "object" && !Array.isArray(v))
      out[k] = redactPayload(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

export async function writeTelemetryBatch(
  events: ClientTelemetryEvent[],
): Promise<{ accepted: number }> {
  if (events.length === 0) return { accepted: 0 };
  const redacted = events.map((e) => ({
    ...e,
    payload: redactPayload(e.payload as Record<string, unknown>),
  }));
  if (hasMongo()) {
    try {
      const cols = await collections();
      if (cols) await cols.telemetry.insertMany(redacted);
    } catch {
      // Swallow: telemetry must never block the chat stream.
    }
  }
  // Always also push to MEMO so the admin can tail in no-mongo mode.
  for (const e of redacted) {
    MEMO.push(e);
    if (MEMO.length > MEMO_CAP) MEMO.shift();
  }
  return { accepted: events.length };
}

export function memoTelemetry(): ClientTelemetryEvent[] {
  return MEMO.slice();
}
