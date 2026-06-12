import { loadPrompt } from "../_lib/prompts";

export const config = {
  runtime: "nodejs",
  maxDuration: 5,
};

// Serves /api/prompts/<name>.md. Editing the prompt file and redeploying changes
// agent behavior without touching code (the gateway loads it at request time).
async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const name = last.replace(/\.md$/i, "");
  if (!/^[a-z0-9_-]+$/i.test(name)) {
    return new Response("Bad name", { status: 400 });
  }
  try {
    const md = await loadPrompt(name);
    const etag = `"${hashCode(md).toString(16)}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        ETag: etag,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export const GET = handler;
