// GET /api/admin/me. Returns the current admin or 401. Used by the SPA to
// decide whether to show the login screen on first paint.
import { jsonResponse, readSession } from "../_lib/console/auth.js";

export const config = { runtime: "nodejs", maxDuration: 5 };

async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  const identity = await readSession(req);
  if (!identity) return jsonResponse({ authenticated: false }, 401);
  return jsonResponse({ authenticated: true, email: identity.email });
}

export const GET = handler;
