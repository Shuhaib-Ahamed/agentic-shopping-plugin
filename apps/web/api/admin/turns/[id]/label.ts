// POST /api/admin/turns/:id/label. Curation: rate, tag, correct.
import { AdminLabelBodySchema } from "@kapruka/protocol";
import { jsonResponse, withAdmin } from "../../../_lib/console/auth";
import { getTurn, setTurnLabel } from "../../../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

export const POST = withAdmin(async (req, identity) => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  // .../turns/:id/label
  const idx = parts.findIndex((p) => p === "turns");
  const id = idx >= 0 ? (parts[idx + 1] ?? "") : "";
  if (!id) return jsonResponse({ error: "missing_id" }, 400);
  const existing = await getTurn(id);
  if (!existing) return jsonResponse({ error: "not_found" }, 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = AdminLabelBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const label = {
    rating: parsed.data.rating,
    tags: parsed.data.tags ?? [],
    reason: parsed.data.reason,
    correctedResponse: parsed.data.correctedResponse,
    by: identity.email,
    at: new Date().toISOString(),
  } as const;
  const next = await setTurnLabel(id, label);
  if (!next) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(next);
});
