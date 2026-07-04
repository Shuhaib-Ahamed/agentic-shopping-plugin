// Deterministic checkout endpoint. No LLM, no chat pipeline.
//
// Why this exists: checkout is a workflow, not a conversation. Once a shopper
// has a cart, a recipient, and a delivery date, the order-creation path is a
// pair of MCP calls (kapruka_check_delivery → kapruka_create_order). Routing
// that through the 3-stage LLM pipeline costs latency, money, and reliability
// (the LLM forgets recipient data once it falls out of the 3-message window).
//
// This route is the data-plane bypass: it reads the cart from session_state,
// merges the form payload into session_state.recipient/giftMessage, hits MCP
// directly, and returns the checkout payload as plain JSON.

import {
  CartLineSchema,
  CurrencySchema,
  MoneySchema,
  RecipientSchema,
  type CartLine,
  type Money,
  type OrderSummary,
  type Recipient,
} from "@kapruka/protocol";
import { z } from "zod";
import { makeLogger, newTraceId } from "./_lib/log";
import { callTool } from "./_lib/mcp";
import { computeCart, getOrCreateSessionById, setSession } from "./_lib/sessionState";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const log = makeLogger({ ctx: "checkout" });

/** Today's date in Sri Lanka (UTC+05:30), as YYYY-MM-DD. */
function todayIsoColombo(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const CheckoutRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  /** Authoritative cart from the client. If session_state already has a cart,
   *  we still trust the client (the client is the UI source of truth between
   *  turns), but we recompute the subtotal server-side. */
  cart: z.array(CartLineSchema).min(1),
  recipient: RecipientSchema.refine((r) => r.phone.replace(/\D/g, "").length >= 7, {
    message: "recipient phone must contain at least 7 digits",
    path: ["phone"],
  }),
  delivery: z.object({
    city: z.string().min(1),
    /** ISO date YYYY-MM-DD, today or later (Sri Lanka time). */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "delivery date must be YYYY-MM-DD")
      .refine((d) => d >= todayIsoColombo(), {
        message: "delivery date is in the past",
      }),
  }),
  giftMessage: z.string().max(500).optional(),
  /** Optional sender info. If omitted the recipient phone is used as a fallback. */
  sender: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  currency: CurrencySchema.optional(),
});

type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

interface CheckoutOk {
  ok: true;
  orderId: string;
  payUrl: string;
  expiresAt: string;
  summary: OrderSummary;
  perishableWarning: string | null;
}

interface CheckoutErr {
  ok: false;
  code: "bad_request" | "mcp_failed" | "rate_limited" | "internal";
  message: string;
}

type CheckoutOutcome = { body: CheckoutOk | CheckoutErr; status: number };

// Idempotency guard: a fast double-click, Enter+click, or client retry must
// not create two real orders. Keyed per session on the exact order-defining
// payload. While a checkout is in flight, duplicates await the same promise;
// after success the result replays for a short window. Failures are evicted
// so the shopper can genuinely retry.
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const inFlightCheckouts = new Map<
  string,
  { key: string; ts: number; result: Promise<CheckoutOutcome> }
>();

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const traceId = newTraceId();
  const tlog = log.child({ traceId });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    tlog.warn("checkout.badJson");
    return json({ ok: false, code: "bad_request", message: "Bad JSON" } satisfies CheckoutErr, 400);
  }
  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    tlog.warn("checkout.invalidBody", { issues: parsed.error.issues.slice(0, 5) });
    return json(
      { ok: false, code: "bad_request", message: parsed.error.message } satisfies CheckoutErr,
      400,
    );
  }
  const data = parsed.data;

  const idemKey = JSON.stringify([
    data.cart,
    data.recipient,
    data.delivery,
    data.giftMessage ?? null,
    data.currency ?? null,
  ]);
  const existing = inFlightCheckouts.get(data.sessionId);
  if (existing && existing.key === idemKey && Date.now() - existing.ts < IDEMPOTENCY_TTL_MS) {
    tlog.info("checkout.idempotentReplay", { sessionId: data.sessionId });
    const replay = await existing.result;
    return json(replay.body, replay.status);
  }

  const entry = {
    key: idemKey,
    ts: Date.now(),
    result: performCheckout(data, tlog).catch((err: unknown): CheckoutOutcome => {
      tlog.error("checkout.unhandled", { error: err instanceof Error ? err.message : String(err) });
      return {
        body: {
          ok: false,
          code: "internal",
          message: "Checkout hit an unexpected error. Please try again.",
        },
        status: 500,
      };
    }),
  };
  inFlightCheckouts.set(data.sessionId, entry);
  const outcome = await entry.result;
  // Only successful orders are worth replaying; let failures retry for real.
  if (!outcome.body.ok && inFlightCheckouts.get(data.sessionId) === entry) {
    inFlightCheckouts.delete(data.sessionId);
  }
  return json(outcome.body, outcome.status);
}

async function performCheckout(
  data: CheckoutRequest,
  tlog: ReturnType<typeof makeLogger>,
): Promise<CheckoutOutcome> {
  const session = getOrCreateSessionById(data.sessionId);

  // Mirror form values into session_state so future LLM turns also see them.
  session.recipient = data.recipient;
  if (data.giftMessage !== undefined) session.giftMessage = data.giftMessage;
  session.cart = computeCart(data.cart);
  session.delivery = {
    ...session.delivery,
    city: data.delivery.city,
    date: data.delivery.date,
  };
  setSession(session);

  const reqStart = Date.now();
  tlog.info("checkout.start", {
    sessionId: data.sessionId,
    cartLines: data.cart.length,
    deliveryCity: data.delivery.city,
    deliveryDate: data.delivery.date,
    hasGiftMessage: Boolean(data.giftMessage),
  });

  // 1. Quote delivery against the first product. The Kapruka API checks
  //    perishability per product; for a multi-item cart we ask for the most
  //    perishable signal by checking each line. We keep it simple: quote on
  //    the first product and surface the perishable warning verbatim if any.
  const firstProductId = data.cart[0]!.productId;
  let rate: Money | null = session.delivery.rate;
  let perishableWarning: string | null = session.delivery.perishableWarning;
  try {
    // The Kapruka MCP wraps every tool's inputs in a top-level `params` object
    // (Pydantic-style schema). The LLM learns this from the tool inputSchema,
    // but we have to know it ahead of time here.
    const quote = await callTool("kapruka_check_delivery", {
      params: {
        city: data.delivery.city,
        delivery_date: data.delivery.date,
        product_id: firstProductId,
      },
    });
    tlog.info("checkout.mcpQuoteRaw", {
      hasJson: quote.json !== null,
      textBytes: quote.text.length,
      textPreview: quote.text.slice(0, 400),
    });
    const q = (quote.json ?? parseLooseJson(quote.text) ?? {}) as Record<string, unknown>;
    rate = readMoney(q.rate ?? q.delivery_rate) ?? readRateFromText(quote.text) ?? rate;
    if (typeof q.perishable_warning === "string") {
      perishableWarning = q.perishable_warning;
    } else {
      const m = quote.text.match(/Note:\s*([^\n]+)/);
      if (m) perishableWarning = m[1]!.trim();
    }
    session.delivery = {
      ...session.delivery,
      rate,
      perishableWarning,
      quoteDisplay: rate ? `${rate.currency} ${rate.amount}` : session.delivery.quoteDisplay,
    };
    tlog.info("checkout.deliveryQuoted", {
      durationMs: Date.now() - reqStart,
      rate,
      perishableWarning,
    });
  } catch (err) {
    return mcpError(tlog, "kapruka_check_delivery", err);
  }

  if (!rate) {
    const city = data.delivery.city;
    const date = data.delivery.date;
    return {
      body: {
        ok: false,
        code: "mcp_failed",
        message: `We couldn't get a delivery rate for ${city} on ${date}. Some city + date combinations aren't currently quotable. Try a different delivery date (1-2 days later often works), or pick a major hub like Colombo, Kandy, or Galle.`,
      } satisfies CheckoutErr,
      status: 502,
    };
  }

  // The quote parser defaults to LKR when the MCP reply is prose; a USD cart
  // would then sum USD + LKR into one number. Kapruka quotes in the order's
  // currency, so coerce the label rather than mixing denominations.
  const cartCurrency = data.currency ?? data.cart[0]!.price.currency;
  if (rate.currency !== cartCurrency) {
    tlog.warn("checkout.rateCurrencyCoerced", { from: rate.currency, to: cartCurrency });
    rate = { ...rate, currency: cartCurrency };
  }

  // 2. Create the order. Schema discovered from live MCP errors:
  //   recipient: { name, phone (>=7 chars) }
  //   delivery:  { address, city, date }            address is a single line
  //   sender:    { name, email? }                   phone not accepted
  const currency = cartCurrency;
  const address = [data.recipient.line1, data.recipient.line2].filter(Boolean).join(", ");
  const sender: Record<string, unknown> = {
    name: data.sender?.name ?? data.recipient.name,
  };
  if (data.sender?.email) sender.email = data.sender.email;

  const createParams: Record<string, unknown> = {
    cart: data.cart.map((l) => ({
      product_id: l.productId,
      quantity: l.qty,
      variant_id: l.variantId ?? undefined,
    })),
    recipient: {
      name: data.recipient.name,
      phone: data.recipient.phone,
    },
    delivery: {
      address,
      city: data.delivery.city,
      date: data.delivery.date,
    },
    sender,
    currency,
  };
  if (data.giftMessage) createParams.gift_message = data.giftMessage;

  let orderId: string | null;
  let payUrl: string | null;
  let expiresAt: string | null;
  try {
    const order = await callTool("kapruka_create_order", { params: createParams });
    tlog.info("checkout.mcpOrderRaw", {
      hasJson: order.json !== null,
      textBytes: order.text.length,
      textPreview: order.text.slice(0, 1500),
    });
    const o = (order.json ?? parseLooseJson(order.text) ?? {}) as Record<string, unknown>;
    orderId = String(o.order_id ?? o.order_number ?? "") || readOrderIdFromText(order.text);
    payUrl = String(o.pay_url ?? o.payUrl ?? o.payment_url ?? "") || readPayUrlFromText(order.text);
    expiresAt = String(o.expires_at ?? o.expiresAt ?? "") || readExpiresFromText(order.text);
    tlog.info("checkout.orderCreated", {
      durationMs: Date.now() - reqStart,
      orderId,
      hasPayUrl: Boolean(payUrl),
    });
  } catch (err) {
    return mcpError(tlog, "kapruka_create_order", err);
  }

  if (!orderId || !payUrl) {
    tlog.error("checkout.missingFields", { orderId, hasPayUrl: Boolean(payUrl) });
    return {
      body: {
        ok: false,
        code: "mcp_failed",
        message: "Order created but the response was missing fields. Please try again.",
      } satisfies CheckoutErr,
      status: 502,
    };
  }

  session.order = { orderId, payUrl, expiresAt };
  setSession(session);

  const summary = buildSummary(data.cart, rate, data.recipient, data.giftMessage, currency);
  const response: CheckoutOk = {
    ok: true,
    orderId,
    payUrl,
    expiresAt: expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    summary,
    perishableWarning,
  };

  tlog.info("checkout.done", { totalMs: Date.now() - reqStart, orderId });
  return { body: response, status: 200 };
}

function buildSummary(
  cart: CartLine[],
  delivery: Money,
  recipient: Recipient,
  giftMessage: string | undefined,
  currency: CheckoutRequest["currency"],
): OrderSummary {
  const cartCurrency = cart[0]!.price.currency;
  const target = currency ?? cartCurrency;
  const cartSubtotal = cart.reduce((sum, l) => sum + l.price.amount * l.qty, 0);
  const total: Money = { amount: cartSubtotal + delivery.amount, currency: target };
  return {
    lines: cart,
    delivery,
    total,
    recipient,
    giftMessage,
  };
}

/** Best-effort parse: many MCP tools return prose + an embedded JSON fence. */
function parseLooseJson(text: string): unknown {
  if (!text) return null;
  // Try the whole text first.
  try {
    return JSON.parse(text);
  } catch {
    /* try fenced block */
  }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]!);
    } catch {
      /* fall through */
    }
  }
  // Last-ditch: find the first { ... } that parses.
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      /* nope */
    }
  }
  return null;
}

/** Pull `ORD-...` ids out of a markdown-formatted MCP response. */
function readOrderIdFromText(text: string): string | null {
  const m = text.match(/`?(ORD-[A-Z0-9-]+)`?/i);
  return m ? m[1]! : null;
}

/** Pull a kapruka.com/continue_order pay URL out of a markdown response. */
function readPayUrlFromText(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)]*continue_order[^\s)]*/i);
  return m ? m[0] : null;
}

/** Pull "expires at 2026-06-16T01:11:33+05:30" out of a markdown response. */
function readExpiresFromText(text: string): string | null {
  const m = text.match(/expires\s+at\s+([0-9T:+-]+)/i);
  return m ? m[1]! : null;
}

/** Heuristic: pull "Rs 1,075" or "LKR 1075" out of prose so a text-only quote
 *  still drives the deterministic flow. */
function readRateFromText(text: string): Money | null {
  if (!text) return null;
  const m = text.match(/(?:Rs|LKR|USD)\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const amount = Number(m[1]!.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const currency = /USD/i.test(m[0]) ? "USD" : "LKR";
  return { amount, currency };
}

function readMoney(value: unknown): Money | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const v = value as { amount?: number; currency?: string };
  if (typeof v.amount !== "number") return null;
  const parsed = MoneySchema.safeParse({
    amount: v.amount,
    currency: v.currency === "USD" ? "USD" : "LKR",
  });
  return parsed.success ? parsed.data : null;
}

function mcpError(log: ReturnType<typeof makeLogger>, tool: string, err: unknown): CheckoutOutcome {
  const message = err instanceof Error ? err.message : "Tool call failed";
  const rateLimited = /rate.?limit|429/i.test(message);
  log.error("checkout.mcpError", { tool, error: message, rateLimited });
  return {
    body: {
      ok: false,
      code: rateLimited ? "rate_limited" : "mcp_failed",
      message: rateLimited
        ? "Kapruka is busy. One moment, then try again."
        : "Kapruka couldn't complete that step. Please try again.",
    } satisfies CheckoutErr,
    status: rateLimited ? 429 : 502,
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = handler;
