// Single catch-all for every /api/admin/* route. Keeps the function count
// under the Hobby plan cap. Each branch reuses the same auth, store, and
// schema helpers the per-route files used before consolidation.
import {
  AdminDatasetCreateBodySchema,
  AdminLabelBodySchema,
  AdminPricingRowSchema,
} from "@kapruka/protocol";
import { z } from "zod";
import {
  buildClearCookie,
  buildSessionCookie,
  checkRateLimit,
  clientIp,
  jsonResponse,
  readSession,
  signSession,
  verifyPassword,
  withAdmin,
} from "../_lib/console/auth.js";
import {
  createDataset,
  exportDataset,
  getCost,
  getFunnel,
  getLatency,
  getOverview,
  getPipeline,
  getPricing,
  getQuality,
  getSessionDetail,
  getSessionList,
  getTurn,
  listDatasets,
  setPricing,
  setTurnLabel,
} from "../_lib/console/store.js";

export const config = { runtime: "nodejs", maxDuration: 30 };

const LoginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

const PricingBodySchema = z.object({ rows: z.array(AdminPricingRowSchema).max(64) });

async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method;

  // Public routes (no auth).
  if (path === "/api/admin/login" && method === "POST") return handleLogin(req);
  if (path === "/api/admin/logout" && method === "POST") return handleLogout(req);
  if (path === "/api/admin/me" && method === "GET") return handleMe(req);

  // Static guarded GETs.
  if (path === "/api/admin/overview" && method === "GET")
    return withAdmin(async () => jsonResponse(await getOverview()))(req);
  if (path === "/api/admin/cost" && method === "GET")
    return withAdmin(async () => jsonResponse(await getCost()))(req);
  if (path === "/api/admin/latency" && method === "GET")
    return withAdmin(async () => jsonResponse(await getLatency()))(req);
  if (path === "/api/admin/quality" && method === "GET")
    return withAdmin(async () => jsonResponse(await getQuality()))(req);
  if (path === "/api/admin/funnel" && method === "GET")
    return withAdmin(async () => jsonResponse(await getFunnel()))(req);
  if (path === "/api/admin/pipeline" && method === "GET")
    return withAdmin(async () => jsonResponse(await getPipeline()))(req);
  if (path === "/api/admin/sessions" && method === "GET") return withAdmin(handleSessionsList)(req);
  if (path === "/api/admin/datasets" && method === "GET")
    return withAdmin(async () => jsonResponse({ items: await listDatasets() }))(req);

  // Pricing GET + PUT.
  if (path === "/api/admin/pricing" && method === "GET")
    return withAdmin(async () => jsonResponse({ rows: await getPricing() }))(req);
  if (path === "/api/admin/pricing" && method === "PUT") return withAdmin(handlePricingPut)(req);

  // Datasets POST.
  if (path === "/api/admin/datasets" && method === "POST")
    return withAdmin(handleDatasetCreate)(req);

  // Dataset export /api/admin/datasets/:id/export
  const datasetExportMatch = path.match(/^\/api\/admin\/datasets\/([^/]+)\/export$/);
  if (datasetExportMatch && method === "GET") {
    const id = datasetExportMatch[1] ?? "";
    return withAdmin(() => handleDatasetExport(id))(req);
  }

  // Turn label POST /api/admin/turns/:id/label
  const turnLabelMatch = path.match(/^\/api\/admin\/turns\/([^/]+)\/label$/);
  if (turnLabelMatch && method === "POST") {
    const id = turnLabelMatch[1] ?? "";
    return withAdmin((req2, identity) => handleTurnLabel(req2, id, identity.email))(req);
  }

  // Turn detail /api/admin/turns/:id
  const turnMatch = path.match(/^\/api\/admin\/turns\/([^/]+)$/);
  if (turnMatch && method === "GET") {
    const id = turnMatch[1] ?? "";
    return withAdmin(() => handleTurnDetail(id))(req);
  }

  // Session detail /api/admin/sessions/:id
  const sessionMatch = path.match(/^\/api\/admin\/sessions\/([^/]+)$/);
  if (sessionMatch && method === "GET") {
    const id = sessionMatch[1] ?? "";
    return withAdmin(() => handleSessionDetail(id))(req);
  }

  return jsonResponse({ error: "not_found", path, method }, 404);
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
export const PATCH = dispatch;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleLogin(req: Request): Promise<Response> {
  const ip = clientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) return jsonResponse({ error: "rate_limited", retryInMs: rate.retryInMs }, 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = LoginBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const identity = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!identity) return jsonResponse({ error: "invalid_credentials" }, 401);
  const token = await signSession(identity);
  const secure = req.url.startsWith("https://");
  const cookie = buildSessionCookie(token, { secure });
  return jsonResponse({ ok: true, email: identity.email }, 200, { "Set-Cookie": cookie });
}

async function handleLogout(req: Request): Promise<Response> {
  const secure = req.url.startsWith("https://");
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": buildClearCookie({ secure }) });
}

async function handleMe(req: Request): Promise<Response> {
  const identity = await readSession(req);
  if (!identity) return jsonResponse({ authenticated: false }, 401);
  return jsonResponse({ authenticated: true, email: identity.email });
}

async function handleSessionsList(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const page = clampInt(url.searchParams.get("page"), 0, 0, 1000);
  const pageSize = clampInt(url.searchParams.get("pageSize"), 50, 5, 200);
  const outcome = url.searchParams.get("outcome") ?? undefined;
  const locale = url.searchParams.get("locale") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  return jsonResponse(await getSessionList({ page, pageSize, outcome, locale, search }));
}

async function handleSessionDetail(id: string): Promise<Response> {
  const detail = await getSessionDetail(id);
  if (!detail) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(detail);
}

async function handleTurnDetail(id: string): Promise<Response> {
  const turn = await getTurn(id);
  if (!turn) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(turn);
}

async function handleTurnLabel(req: Request, id: string, by: string): Promise<Response> {
  const existing = await getTurn(id);
  if (!existing) return jsonResponse({ error: "not_found" }, 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = AdminLabelBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const label = {
    rating: parsed.data.rating,
    tags: parsed.data.tags ?? [],
    reason: parsed.data.reason,
    correctedResponse: parsed.data.correctedResponse,
    by,
    at: new Date().toISOString(),
  } as const;
  const next = await setTurnLabel(id, label);
  if (!next) return jsonResponse({ error: "not_found" }, 404);
  return jsonResponse(next);
}

async function handlePricingPut(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = PricingBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  const rows = await setPricing(parsed.data.rows);
  return jsonResponse({ rows });
}

async function handleDatasetCreate(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const parsed = AdminDatasetCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "invalid_body" }, 400);
  return jsonResponse(await createDataset(parsed.data), 201);
}

async function handleDatasetExport(id: string): Promise<Response> {
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
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
