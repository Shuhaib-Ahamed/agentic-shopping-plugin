// GET /api/admin/sessions/:id. Full session detail with turns. Guarded.
import { jsonResponse, withAdmin } from "../../_lib/console/auth";
import { getSessionDetail } from "../../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() ?? "";
  const detail = await getSessionDetail(id);
  if (!detail) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(detail);
});
