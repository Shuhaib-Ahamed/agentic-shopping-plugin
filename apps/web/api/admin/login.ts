// POST /api/admin/login
// Body: { email, password }. Returns 200 + Set-Cookie on success, 401 on miss.
// Rate limited per IP. Always responds in constant time-ish (bcrypt always
// runs even on missing email) to avoid trivial enumeration.
import { z } from "zod";
import {
  buildSessionCookie,
  checkRateLimit,
  clientIp,
  jsonResponse,
  signSession,
  verifyPassword,
} from "../_lib/console/auth";

export const config = { runtime: "nodejs", maxDuration: 10 };

const BodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  const ip = clientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return jsonResponse({ error: "rate_limited", retryInMs: rate.retryInMs }, 429);
  }
  let parsed: ReturnType<typeof BodySchema.safeParse>;
  try {
    const body = await req.json();
    parsed = BodySchema.safeParse(body);
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_body" }, 400);
  }
  const identity = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!identity) {
    return jsonResponse({ error: "invalid_credentials" }, 401);
  }
  const token = await signSession(identity);
  const secure = req.url.startsWith("https://");
  const cookie = buildSessionCookie(token, { secure });
  return jsonResponse({ ok: true, email: identity.email }, 200, { "Set-Cookie": cookie });
}

export const POST = handler;
