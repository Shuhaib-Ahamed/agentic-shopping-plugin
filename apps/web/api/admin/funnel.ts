// GET /api/admin/funnel. Conversion funnel with drop-off pairs.
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { getFunnel } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const data = await getFunnel();
  return jsonResponse(data);
});
