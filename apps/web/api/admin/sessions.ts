// GET /api/admin/sessions. Paginated, filterable list. Guarded.
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { getSessionList } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 10 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const url = new URL(req.url);
  const page = clampInt(url.searchParams.get("page"), 0, 0, 1000);
  const pageSize = clampInt(url.searchParams.get("pageSize"), 50, 5, 200);
  const outcome = url.searchParams.get("outcome") ?? undefined;
  const locale = url.searchParams.get("locale") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const data = await getSessionList({ page, pageSize, outcome, locale, search });
  return jsonResponse(data);
});

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
