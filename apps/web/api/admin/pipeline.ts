// GET /api/admin/pipeline. Pipeline topology derived over the range.
import { jsonResponse, withAdmin } from "../_lib/console/auth.js";
import { getPipeline } from "../_lib/console/store.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const data = await getPipeline();
  return jsonResponse(data);
});
