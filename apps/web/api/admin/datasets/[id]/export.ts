// GET /api/admin/datasets/:id/export. Streams jsonl of the curated turns.
import { jsonResponse, withAdmin } from "../../../_lib/console/auth.js";
import { exportDataset } from "../../../_lib/console/store.js";

export const config = { runtime: "nodejs", maxDuration: 30 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const idx = parts.findIndex((p) => p === "datasets");
  const id = idx >= 0 ? (parts[idx + 1] ?? "") : "";
  if (!id) return jsonResponse({ error: "missing_id" }, 400);
  const out = await exportDataset(id);
  if (!out) return jsonResponse({ error: "not_found" }, 404);
  return new Response(out.body, {
    status: 200,
    headers: {
      "Content-Type": "application/jsonl",
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
