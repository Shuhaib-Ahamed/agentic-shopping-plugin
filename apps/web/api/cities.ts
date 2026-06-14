import { makeLogger } from "./_lib/log.js";
import { callTool } from "./_lib/mcp.js";

const log = makeLogger({ ctx: "cities" });

export const config = {
  runtime: "nodejs",
  maxDuration: 8,
};

// Backs the CityAutocompleteField molecule. Proxies kapruka_list_delivery_cities
// so we never expose the MCP transport to the browser.
async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  const url = new URL(req.url, "http://localhost");
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = clampInt(url.searchParams.get("limit"), 1, 20, 8);
  if (q.length < 2) {
    return json({ items: [] }, 200);
  }
  log.info("cities.request", { q, limit });
  const t0 = Date.now();
  try {
    const result = await callTool("kapruka_list_delivery_cities", { query: q, limit });
    const data = (result.json ?? {}) as { items?: unknown; cities?: unknown };
    const raw = (data.items ?? data.cities ?? []) as Array<Record<string, unknown>>;
    const items = raw
      .map((c) => ({
        canonical: String(c.canonical ?? c.name ?? c.city ?? "").trim(),
        aliases: ((c.aliases ?? c.altNames ?? []) as unknown[]).map(String),
      }))
      .filter((c) => c.canonical.length > 0)
      .slice(0, limit);
    log.info("cities.ok", { q, count: items.length, durationMs: Date.now() - t0 });
    return json({ items }, 200, { "Cache-Control": "public, max-age=60, s-maxage=300" });
  } catch (err) {
    log.error("cities.error", {
      q,
      durationMs: Date.now() - t0,
      error: (err as Error).message,
    });
    return json({ error: "lookup failed", message: (err as Error).message }, 502);
  }
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export const GET = handler;
