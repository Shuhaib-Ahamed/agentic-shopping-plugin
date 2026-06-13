// Admin auth: bcrypt verify + signed JWT cookie via jose.
// Single-admin mode by default (ADMIN_EMAIL + ADMIN_PASSWORD_HASH env).
// Falls back to a demo identity so the console works out of the box.
// Production must set SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH.
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// Demo defaults. PRODUCTION MUST OVERRIDE. The password for the demo hash
// below is "kapruka-demo" (bcrypt round 10). The session secret is a constant
// only used when running unconfigured. Both should be rotated for prod.
const DEMO_EMAIL = "admin@kapruka.local";
// bcrypt of "kapruka-demo" (round 10). Rotate via ADMIN_PASSWORD_HASH.
const DEMO_PASSWORD_HASH = "$2b$10$B42wDvkX1Rd/6q1Jjn77teUd66noQIc6cUR2QGhQTXxUxrOq8g6bC";
const DEMO_SECRET = "kapruka-console-demo-secret-please-rotate-in-prod";

export const COOKIE_NAME = "kpk_console_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSessionKey(): Uint8Array {
  const raw = process.env.SESSION_SECRET ?? DEMO_SECRET;
  return new TextEncoder().encode(raw);
}

export interface AdminIdentity {
  email: string;
  role: "admin";
}

export async function verifyPassword(
  email: string,
  password: string,
): Promise<AdminIdentity | null> {
  const expectedEmail = process.env.ADMIN_EMAIL ?? DEMO_EMAIL;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH ?? DEMO_PASSWORD_HASH;
  // Constant time email check by always hashing the password.
  const emailOk = email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  let passwordOk: boolean;
  try {
    passwordOk = await bcrypt.compare(password, expectedHash);
  } catch {
    passwordOk = false;
  }
  if (!emailOk || !passwordOk) return null;
  return { email: expectedEmail, role: "admin" };
}

export async function signSession(identity: AdminIdentity): Promise<string> {
  return new SignJWT({ email: identity.email, role: identity.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSessionKey());
}

export async function readSession(req: Request): Promise<AdminIdentity | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    if (typeof payload.email !== "string" || payload.role !== "admin") return null;
    return { email: payload.email, role: "admin" };
  } catch {
    return null;
  }
}

export function buildSessionCookie(token: string, opts: { secure: boolean }): string {
  const flags = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (opts.secure) flags.push("Secure");
  return flags.join("; ");
}

export function buildClearCookie(opts: { secure: boolean }): string {
  const flags = [`${COOKIE_NAME}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Strict"];
  if (opts.secure) flags.push("Secure");
  return flags.join("; ");
}

// Wraps an admin handler with auth + a JSON guard. Returns 401 when missing.
export function withAdmin(
  handler: (req: Request, identity: AdminIdentity) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const identity = await readSession(req);
    if (!identity) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    return handler(req, identity);
  };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// Tiny per-IP login rate limit so brute force is slow. In-memory; resets on
// cold start. For real prod use a KV store with a longer window.
const ATTEMPTS = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryInMs: number } {
  const now = Date.now();
  const cur = ATTEMPTS.get(ip);
  if (!cur || now - cur.firstAt > WINDOW_MS) {
    ATTEMPTS.set(ip, { count: 1, firstAt: now });
    return { ok: true };
  }
  cur.count += 1;
  if (cur.count > MAX_ATTEMPTS) {
    return { ok: false, retryInMs: WINDOW_MS - (now - cur.firstAt) };
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
