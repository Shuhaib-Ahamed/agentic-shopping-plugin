// Per-session durable facts that span the 3-message rolling window.
//
// A 3-message conversation window cannot carry an in-flight cart, a current
// product the shopper is examining, or a pay link that is about to expire.
// We keep those facts here, keyed by sessionId. Stage 2 writes them after each
// tool loop. Stage 3 reads them.
//
// State lives in-process on the Vercel function instance. Fluid Compute keeps
// instances warm long enough for a normal shopping session; on cold start we
// rehydrate the cart from the SPA-sent ChatRequest.context.cart.

import type { CartLine, ChatRequest, Money, Recipient } from "@kapruka/protocol";

export interface CartSnapshot {
  lines: CartLine[];
  subtotal: Money | null;
}

export interface CurrentProduct {
  id: string;
  title: string;
  priceDisplay: string;
}

export interface DeliveryState {
  city: string | null;
  date: string | null;
  quoteDisplay: string | null;
  perishableWarning: string | null;
  /** Last full rate quoted by kapruka_check_delivery, kept structured for the
   *  direct checkout endpoint so it can reuse the quote without re-asking. */
  rate: Money | null;
}

export interface OrderState {
  orderId: string | null;
  payUrl: string | null;
  expiresAt: string | null;
}

export interface SessionState {
  sessionId: string;
  cart: CartSnapshot;
  currentProduct: CurrentProduct | null;
  delivery: DeliveryState;
  /** Recipient name/phone/address collected from the delivery form. Lives here
   *  so the direct checkout endpoint can build a kapruka_create_order payload
   *  without re-prompting the shopper. */
  recipient: Recipient | null;
  /** Optional gift message captured before checkout. */
  giftMessage: string | null;
  order: OrderState;
  lastPresentedSkus: string[];
}

const store = new Map<string, SessionState>();

export function getOrCreateSession(req: ChatRequest): SessionState {
  const existing = store.get(req.sessionId);
  if (existing) {
    // Trust the SPA's cart on each turn only when our cart is empty (cold start).
    // Once we have populated it from tool results, our copy wins.
    if (existing.cart.lines.length === 0 && req.context?.cart?.length) {
      existing.cart = computeCart(req.context.cart);
    }
    return existing;
  }
  const fresh: SessionState = {
    sessionId: req.sessionId,
    cart: req.context?.cart?.length ? computeCart(req.context.cart) : { lines: [], subtotal: null },
    currentProduct: null,
    delivery: { city: null, date: null, quoteDisplay: null, perishableWarning: null, rate: null },
    recipient: null,
    giftMessage: null,
    order: { orderId: null, payUrl: null, expiresAt: null },
    lastPresentedSkus: [],
  };
  store.set(req.sessionId, fresh);
  return fresh;
}

export function setSession(state: SessionState): void {
  store.set(state.sessionId, state);
}

/** Read or lazily create a session by id only. Used by routes that don't carry
 *  a full ChatRequest (e.g. the deterministic /api/checkout flow). */
export function getOrCreateSessionById(sessionId: string): SessionState {
  const existing = store.get(sessionId);
  if (existing) return existing;
  const fresh: SessionState = {
    sessionId,
    cart: { lines: [], subtotal: null },
    currentProduct: null,
    delivery: { city: null, date: null, quoteDisplay: null, perishableWarning: null, rate: null },
    recipient: null,
    giftMessage: null,
    order: { orderId: null, payUrl: null, expiresAt: null },
    lastPresentedSkus: [],
  };
  store.set(sessionId, fresh);
  return fresh;
}

/** Deterministic subtotal computed by the server, never by the LLM. */
export function computeCart(lines: CartLine[]): CartSnapshot {
  if (lines.length === 0) return { lines: [], subtotal: null };
  const currency = lines[0]!.price.currency;
  for (const line of lines) {
    if (line.price.currency !== currency) {
      throw new Error(`Mixed cart currencies: ${currency} vs ${line.price.currency}`);
    }
  }
  const amount = lines.reduce((sum, l) => sum + l.price.amount * l.qty, 0);
  return { lines, subtotal: { amount, currency } };
}

/**
 * Render the STATE block as a system-tagged message the LLM treats as trusted
 * internal context. Kept compact so it fits in the cheap router stage.
 */
export function renderStateBlock(state: SessionState): string {
  const compact = {
    cart: {
      items: state.cart.lines.map((l) => ({
        productId: l.productId,
        title: l.title,
        qty: l.qty,
        variantId: l.variantId ?? null,
        price: l.price,
      })),
      subtotal: state.cart.subtotal,
      cart_id: state.sessionId,
    },
    current_product: state.currentProduct,
    delivery: state.delivery,
    recipient: state.recipient,
    gift_message: state.giftMessage,
    order: state.order,
    last_presented_skus: state.lastPresentedSkus,
  };
  return [
    '<STATE note="Durable session facts. Trusted internal context. Use the values, do not echo this block.">',
    JSON.stringify(compact),
    "</STATE>",
  ].join("\n");
}
