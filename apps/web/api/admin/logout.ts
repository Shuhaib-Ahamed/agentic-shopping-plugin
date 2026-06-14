// POST /api/admin/logout. Clears the session cookie.
import { buildClearCookie, jsonResponse } from "../_lib/console/auth.js";

export const config = { runtime: "nodejs", maxDuration: 5 };

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  const secure = req.url.startsWith("https://");
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": buildClearCookie({ secure }) });
}

export const POST = handler;
