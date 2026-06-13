// GET /api/admin/datasets       -> list
// POST /api/admin/datasets      -> create from filter
import { AdminDatasetCreateBodySchema } from "@kapruka/protocol";
import { jsonResponse, withAdmin } from "../_lib/console/auth";
import { createDataset, listDatasets } from "../_lib/console/store";

export const config = { runtime: "nodejs", maxDuration: 15 };

export const GET = withAdmin(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const items = await listDatasets();
  return jsonResponse({ items });
});

export const POST = withAdmin(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = AdminDatasetCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const dataset = await createDataset(parsed.data);
  return jsonResponse(dataset, 201);
});
