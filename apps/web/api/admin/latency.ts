// GET /api/admin/latency. Latency percentiles per stage and per tool.
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { getLatency } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 15 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const data = await getLatency();
  return jsonResponse(data);
});
