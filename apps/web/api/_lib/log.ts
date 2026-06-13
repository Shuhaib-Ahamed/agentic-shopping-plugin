// Structured JSON logger for the gateway.
//
// Writes one JSON object per line to stdout/stderr so Vercel surfaces every
// field as a queryable column. Every log line carries a ctx (subsystem) and
// optionally a traceId (per-request correlation). Sensitive values are
// redacted and large strings are truncated.

import { randomUUID } from "node:crypto";
import { getActiveTracer } from "./console/traceContext";

export type LogLevel = "debug" | "info" | "warn" | "error";

const MAX_STRING_LEN = 2000;
const MAX_ARRAY_LEN = 50;
const REDACT_KEY_RE = /\b(api[_-]?key|secret|token|password|authorization|cookie|set-cookie)\b/i;
const PII_KEY_RE =
  /\b(phone|email|recipient|pay[_-]?url|address|line1|line2|postal|gift[_-]?message)\b/i;

function redactString(s: string): string {
  return s
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "sk-***")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "***@***")
    .replace(/\b(?:\+?94|0)?7\d{8}\b/g, "***-***-****");
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth-limit]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    const redacted = redactString(value);
    return redacted.length > MAX_STRING_LEN
      ? `${redacted.slice(0, MAX_STRING_LEN)}…<${redacted.length} chars>`
      : redacted;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const trimmed = value.slice(0, MAX_ARRAY_LEN).map((v) => sanitize(v, depth + 1));
    if (value.length > MAX_ARRAY_LEN) trimmed.push(`…<${value.length - MAX_ARRAY_LEN} more>`);
    return trimmed;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEY_RE.test(k)) {
        out[k] = "***";
      } else if (PII_KEY_RE.test(k)) {
        out[k] = typeof v === "string" ? "<redacted>" : sanitize(v, depth + 1);
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

function emit(level: LogLevel, msg: string, fields: Record<string, unknown>): void {
  const sanitized = sanitize(fields) as Record<string, unknown>;
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...sanitized,
  };
  let line: string;
  try {
    line = JSON.stringify(payload);
  } catch {
    line = JSON.stringify({ ts: payload.ts, level, msg, _err: "stringify-failed" });
  }
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  // Tee to the active tracer so the admin console gets every debug line.
  try {
    const tracer = getActiveTracer();
    if (tracer) {
      const ctx = typeof sanitized.ctx === "string" ? sanitized.ctx : undefined;
      tracer.recordLog({ at: payload.ts, level, ctx, msg, fields: sanitized });
    }
  } catch {
    // Tracer hook must never break logging.
  }
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

export function makeLogger(base: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, fields) => emit("debug", msg, { ...base, ...fields }),
    info: (msg, fields) => emit("info", msg, { ...base, ...fields }),
    warn: (msg, fields) => emit("warn", msg, { ...base, ...fields }),
    error: (msg, fields) => emit("error", msg, { ...base, ...fields }),
    child: (extra) => makeLogger({ ...base, ...extra }),
  };
}

export function newTraceId(): string {
  return randomUUID();
}
