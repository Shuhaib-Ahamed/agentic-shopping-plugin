// GET /api/admin/turns/:id. Single turn trace. Guarded.
import { jsonResponse, withAdmin } from "../../_lib/console/auth";
import { getTurn } from "../../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() ?? "";
  const turn = await getTurn(id);
  if (!turn) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(turn);
});
