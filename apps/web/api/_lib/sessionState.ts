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
  /** Always a concrete Money: an empty cart carries a zero subtotal so the
   *  snapshot can be emitted as a `cart` SSE event without violating the
   *  protocol's non-nullable subtotal. */
  subtotal: Money;
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

/**
 * Distilled conversational intent that survives beyond the per-stage raw
 * message window. Maintained by the router's brief_delta (Phase 4). Never
 * overrides system rules: the delivery address still comes only from explicit
 * shopper input in the delivery form, never inferred from the brief.
 */
export interface ShopperBrief {
  recipient: string | null;
  occasion: string | null;
  budget: string | null;
  preferences: string[];
  rejectedSkus: string[];
  language: string | null;
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
  shopperBrief: ShopperBrief;
}

function emptyBrief(): ShopperBrief {
  return {
    recipient: null,
    occasion: null,
    budget: null,
    preferences: [],
    rejectedSkus: [],
    language: null,
  };
}

const store = new Map<string, SessionState>();

export function getOrCreateSession(req: ChatRequest): SessionState {
  const existing = store.get(req.sessionId);
  if (existing) {
    // The SPA is the source of truth for the cart between turns: it applied
    // every `cart` event we emitted, plus any optimistic edits (remove line,
    // change qty) the shopper made directly in the cart panel. Adopting its
    // copy each turn keeps those edits instead of silently reverting them.
    // During the turn the tool loop mutates our copy and re-emits it.
    if (req.context?.cart) {
      existing.cart = computeCart(req.context.cart, existing.cart.subtotal.currency);
    }
    return existing;
  }
  const fresh: SessionState = {
    sessionId: req.sessionId,
    cart: computeCart(req.context?.cart ?? []),
    currentProduct: null,
    delivery: { city: null, date: null, quoteDisplay: null, perishableWarning: null, rate: null },
    recipient: null,
    giftMessage: null,
    order: { orderId: null, payUrl: null, expiresAt: null },
    lastPresentedSkus: [],
    shopperBrief: emptyBrief(),
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
    cart: computeCart([]),
    currentProduct: null,
    delivery: { city: null, date: null, quoteDisplay: null, perishableWarning: null, rate: null },
    recipient: null,
    giftMessage: null,
    order: { orderId: null, payUrl: null, expiresAt: null },
    lastPresentedSkus: [],
    shopperBrief: emptyBrief(),
  };
  store.set(sessionId, fresh);
  return fresh;
}

/**
 * Deterministic subtotal computed by the server, never by the LLM.
 *
 * Never throws on untrusted input: client-sent carts flow straight in here
 * during session init, and a hard failure there would 500 the whole turn.
 * A cart holds exactly one currency; if mixed lines sneak in, lines that do
 * not match the first line's currency are dropped rather than crashing.
 * Zero/negative quantities are dropped for the same reason.
 */
export function computeCart(
  lines: CartLine[],
  fallbackCurrency: Money["currency"] = "LKR",
): CartSnapshot {
  const valid = lines.filter((l) => Number.isFinite(l.qty) && l.qty > 0);
  if (valid.length === 0) {
    return { lines: [], subtotal: { amount: 0, currency: fallbackCurrency } };
  }
  const currency = valid[0]!.price.currency;
  const sameCurrency = valid.filter((l) => l.price.currency === currency);
  const amount = sameCurrency.reduce((sum, l) => sum + l.price.amount * l.qty, 0);
  return { lines: sameCurrency, subtotal: { amount, currency } };
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

/**
 * Delta produced by the router each turn. Scalar fields use null to mean
 * "no change" so the merge never wipes a previously known value just because
 * the latest turn did not restate it. Array fields are additive only.
 */
export interface ShopperBriefDelta {
  recipient?: string | null;
  occasion?: string | null;
  budget?: string | null;
  preferences?: string[];
  rejectedSkus?: string[];
  language?: string | null;
}

function unique(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Merge a delta into the durable brief. Scalar fields only update when the
 * delta carries a non-null value, so a quiet turn never wipes the recipient
 * or occasion the shopper stated earlier. Arrays are additive and deduped,
 * capped to avoid runaway growth across long sessions.
 */
export function mergeShopperBrief(
  current: ShopperBrief,
  delta: ShopperBriefDelta | null | undefined,
): ShopperBrief {
  if (!delta) return current;
  return {
    recipient: delta.recipient ?? current.recipient,
    occasion: delta.occasion ?? current.occasion,
    budget: delta.budget ?? current.budget,
    preferences: unique([...current.preferences, ...(delta.preferences ?? [])]).slice(-20),
    rejectedSkus: unique([...current.rejectedSkus, ...(delta.rejectedSkus ?? [])]).slice(-20),
    language: delta.language ?? current.language,
  };
}

/**
 * Render the BRIEF block. Derived from the shopper's own messages, never from
 * tool results. Treated as trusted internal context, same as STATE. Skipped
 * entirely when the brief is empty so we do not pay for an empty wrapper.
 */
export function renderBriefBlock(state: SessionState): string | null {
  const b = state.shopperBrief;
  const isEmpty =
    b.recipient === null &&
    b.occasion === null &&
    b.budget === null &&
    b.language === null &&
    b.preferences.length === 0 &&
    b.rejectedSkus.length === 0;
  if (isEmpty) return null;
  return [
    '<BRIEF note="Distilled shopper intent across the session. Trusted internal context. Use the values, do not echo this block.">',
    JSON.stringify(b),
    "</BRIEF>",
  ].join("\n");
}
