// GET /api/admin/cost. Cost page aggregates.
import { jsonResponse, withAdmin } from "../_lib/console/auth.js";
import { getCost } from "../_lib/console/store.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const data = await getCost();
  return jsonResponse(data);
});
