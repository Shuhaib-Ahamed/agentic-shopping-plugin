import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeLogger } from "./_lib/log.js";
import { callTool } from "./_lib/mcp.js";

const log = makeLogger({ ctx: "cities" });

export const config = {
  runtime: "nodejs",
  maxDuration: 8,
};

// Two-tier cache for the MCP city lookup. Upstream is ~1.3s and the
// autocomplete fires per keystroke. 60s TTL respects "re-fetch before
// re-presenting" while absorbing in-turn repeats.
//
// Tier 1: in-process Map. Hot path, ~0 ms. Persists in prod (Fluid Compute
// reuses function instances) but resets per request under `vercel dev`.
// Tier 2: filesystem JSON at /tmp/juno-cities-cache.json. Cross-process,
// ~1-3 ms. Bridges the dev-env per-request process boundary so dev meets
// the same PERF-11 budget as prod.
interface CityCacheEntry {
  items: Array<{ canonical: string; aliases: string[] }>;
  at: number;
}
const CITIES_CACHE_TTL_MS = 60_000;
const CITIES_CACHE_MAX = 256;
const citiesCache = new Map<string, CityCacheEntry>();

const FS_CACHE_DIR = join(tmpdir(), "juno-cache");
const FS_CACHE_PATH = join(FS_CACHE_DIR, "cities.json");

function fsCacheRead(): Record<string, CityCacheEntry> {
  try {
    const raw = readFileSync(FS_CACHE_PATH, "utf8");
    return JSON.parse(raw) as Record<string, CityCacheEntry>;
  } catch {
    return {};
  }
}

function fsCacheWrite(all: Record<string, CityCacheEntry>): void {
  try {
    mkdirSync(FS_CACHE_DIR, { recursive: true });
    writeFileSync(FS_CACHE_PATH, JSON.stringify(all));
  } catch (err) {
    log.warn("cities.fsCache.writeFail", { error: (err as Error).message });
  }
}

function cacheGet(key: string): CityCacheEntry["items"] | null {
  const hit = citiesCache.get(key);
  if (hit && Date.now() - hit.at <= CITIES_CACHE_TTL_MS) {
    citiesCache.delete(key);
    citiesCache.set(key, hit);
    return hit.items;
  }
  if (hit) citiesCache.delete(key);
  const fsAll = fsCacheRead();
  const fsHit = fsAll[key];
  if (fsHit && Date.now() - fsHit.at <= CITIES_CACHE_TTL_MS) {
    citiesCache.set(key, fsHit);
    return fsHit.items;
  }
  return null;
}

function cacheSet(key: string, items: CityCacheEntry["items"]): void {
  if (citiesCache.size >= CITIES_CACHE_MAX) {
    const oldest = citiesCache.keys().next().value;
    if (oldest !== undefined) citiesCache.delete(oldest);
  }
  const entry: CityCacheEntry = { items, at: Date.now() };
  citiesCache.set(key, entry);
  const fsAll = fsCacheRead();
  fsAll[key] = entry;
  // Best-effort prune: drop entries that already expired so the file
  // doesn't grow unbounded.
  const now = Date.now();
  for (const [k, v] of Object.entries(fsAll)) {
    if (now - v.at > CITIES_CACHE_TTL_MS) delete fsAll[k];
  }
  fsCacheWrite(fsAll);
}

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
  const cacheKey = `${q.toLowerCase()}|${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    log.info("cities.cacheHit", { q, count: cached.length });
    return json({ items: cached }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Cache": "HIT",
    });
  }
  log.info("cities.request", { q, limit });
  const t0 = Date.now();
  try {
    // Upstream tool schema wraps args in `params` (Pydantic model). Without the wrapper
    // the MCP server returns "params Field required" and the lookup silently yields zero
    // matches, which blocks the entire checkout flow.
    const result = await callTool("kapruka_list_delivery_cities", { params: { query: q, limit } });
    const data = (result.json ?? {}) as { items?: unknown; cities?: unknown };
    const raw = (data.items ?? data.cities ?? []) as Array<Record<string, unknown>>;
    let items = raw
      .map((c) => ({
        canonical: String(c.canonical ?? c.name ?? c.city ?? "").trim(),
        aliases: ((c.aliases ?? c.altNames ?? []) as unknown[]).map(String),
      }))
      .filter((c) => c.canonical.length > 0)
      .slice(0, limit);
    if (items.length === 0 && typeof result.text === "string" && result.text.length > 0) {
      // Upstream returns a Markdown bullet list ("- **Colombo 01**  _aliases: Colombo1_").
      // Fall back to parsing that shape so the autocomplete can still surface options.
      items = parseMarkdownCities(result.text).slice(0, limit);
    }
    cacheSet(cacheKey, items);
    log.info("cities.ok", { q, count: items.length, durationMs: Date.now() - t0 });
    return json({ items }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Cache": "MISS",
    });
  } catch (err) {
    log.error("cities.error", {
      q,
      durationMs: Date.now() - t0,
      error: (err as Error).message,
    });
    return json({ error: "lookup failed", message: (err as Error).message }, 502);
  }
}

function parseMarkdownCities(text: string): Array<{ canonical: string; aliases: string[] }> {
  const out: Array<{ canonical: string; aliases: string[] }> = [];
  const lineRegex = /^[-*]\s+\*\*([^*]+)\*\*(?:\s+_aliases:\s*([^_]+)_)?/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(lineRegex);
    if (!m) continue;
    const canonical = (m[1] ?? "").trim();
    const aliases = m[2]
      ? m[2]
          .split(/[,\s]+/)
          .map((a) => a.trim())
          .filter((a) => a.length > 0)
      : [];
    if (canonical) out.push({ canonical, aliases });
  }
  return out;
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
