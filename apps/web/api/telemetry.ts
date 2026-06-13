// POST /api/telemetry. Accepts a batch of client telemetry events. The single
// writer module owns redaction and persistence; this endpoint stays small.
// Idempotent enough for the demo via the eventId field.
import { TelemetryBatchSchema } from "@kapruka/protocol";
import { jsonResponse } from "./_lib/console/auth";
import { writeTelemetryBatch } from "./_lib/console/writer";

export const config = { runtime: "nodejs", maxDuration: 10 };

export async function POST(req: Request): Promise<Response> {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = TelemetryBatchSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const result = await writeTelemetryBatch(parsed.data.events);
  return jsonResponse({ ok: true, accepted: result.accepted });
}
