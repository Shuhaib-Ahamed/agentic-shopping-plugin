import { env } from "./_lib/env";

export const config = {
  runtime: "nodejs",
  maxDuration: 5,
};

// Reliability checklist per build prompt Section 17: also pings Kapruka /health.
async function handler(_req: Request): Promise<Response> {
  const e = env();
  const checks: Record<string, "ok" | string> = { gateway: "ok" };
  try {
    const url = new URL(e.MCP_SERVER_URL);
    url.pathname = "/health";
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    checks.mcp = res.ok ? "ok" : `bad ${res.status}`;
  } catch (err) {
    checks.mcp = `unreachable: ${(err as Error).message}`;
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return new Response(JSON.stringify({ ok, checks }), {
    status: ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const GET = handler;
