// GET /api/admin/pricing  -> current pricing table.
// PUT /api/admin/pricing  -> replace with a new table (admin only).
import { AdminPricingRowSchema } from "@kapruka/protocol";
import { z } from "zod";
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { getPricing, setPricing } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

const BodySchema = z.object({ rows: z.array(AdminPricingRowSchema).max(64) });

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const rows = await getPricing();
  return jsonResponse({ rows });
});

export const PUT = withAdmin(async (req) => {
  if (req.method !== "PUT") return jsonResponse({ error: "method_not_allowed" }, 405);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const rows = await setPricing(parsed.data.rows);
  return jsonResponse({ rows });
});
