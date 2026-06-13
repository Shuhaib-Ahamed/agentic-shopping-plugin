// GET /api/admin/overview. Aggregated headline + charts for the dashboard.
// Guarded.
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { getOverview } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 15 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const overview = await getOverview();
  return jsonResponse(overview);
});
