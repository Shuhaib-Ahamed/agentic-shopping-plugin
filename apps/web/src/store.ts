import type {
  CartLine,
  CheckoutEvent,
  DeliveryQuoteEvent,
  Locale,
  Currency,
  Money,
  OptionsEvent,
  OrderConfirmedEvent,
  OrderSummary,
  Product,
  ProductDetailEvent,
  Recipient,
  RequestInfoEvent,
  SseEvent,
} from "@kapruka/protocol";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

// -----------------------------------------------------------------------------
// Timeline items - the chat is a heterogeneous stream of text turns plus
// inline UI cards (products, delivery quotes).
// -----------------------------------------------------------------------------

export type TextMessage = {
  kind: "text";
  id: string;
  role: "user" | "assistant";
  text: string;
  lang?: Locale;
  ts: string;
};

export type ProductsBlock = {
  kind: "products";
  id: string;
  title?: string;
  layout: "carousel" | "grid";
  items: Product[];
  ts: string;
};

export type DeliveryQuoteBlock = {
  kind: "delivery-quote";
  id: string;
  payload: DeliveryQuoteEvent;
  ts: string;
};

export type ProductDetailBlock = {
  kind: "product-detail";
  id: string;
  payload: ProductDetailEvent;
  ts: string;
};

export type DeliveryDetailsBlock = {
  kind: "delivery-details";
  id: string;
  /** Free-form key=value pairs from the submitted form, in the order the AI
   *  asked for them. Rendering side decides which keys deserve icons + labels. */
  values: Record<string, string>;
  ts: string;
};

export type TimelineItem =
  | TextMessage
  | ProductsBlock
  | DeliveryQuoteBlock
  | ProductDetailBlock
  | DeliveryDetailsBlock;

/** @deprecated Use TimelineItem. */
export type ChatMessage = TextMessage;

/** Mirrors the protocol's StatusState so the UI can narrate stage progress. */
export type StatusState =
  | "idle"
  | "thinking"
  | "routing"
  | "searching"
  | "fetching"
  | "checking"
  | "creating"
  | "tracking"
  | "composing"
  | "working";

export type ActionSurface =
  | { kind: "none" }
  | { kind: "request_info"; payload: RequestInfoEvent }
  | { kind: "checkout"; payload: CheckoutEvent }
  | { kind: "order_confirmed"; payload: OrderConfirmedEvent }
  | { kind: "error"; code: string; message: string; recoverable: boolean };

export interface AppState {
  sessionId: string;
  locale: Locale;
  currency: Currency;
  messages: TimelineItem[];
  status: { state: StatusState; label?: string; detail?: string };
  cart: { lines: CartLine[]; subtotal: Money };
  cartOpen: boolean;
  surface: ActionSurface;
  pollingOrderId: string | null;
  /** Quick-reply chips above the composer. Lives only until the next user
   *  reply (clicked chip or typed message). Never persisted. */
  quickOptions: OptionsEvent | null;
  /** Recipient captured by the delivery form. Persisted so a reload + click on
   *  "Proceed to checkout" skips the form. The direct checkout endpoint also
   *  mirrors this into server-side session_state. */
  recipient: Recipient | null;
  /** Optional gift message. */
  giftMessage: string | null;
  /** True when the cart "Proceed to checkout" flow opened the synthetic delivery
   *  form. App.tsx reads this in the form's onSubmit to route to /api/checkout
   *  instead of the LLM. Transient; never persisted. */
  checkoutFlowActive: boolean;
  /** Perishable-goods warning returned by the direct /api/checkout flow, shown
   *  on the checkout panel. Transient; never persisted. */
  checkoutPerishableWarning: string | null;

  // actions
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  pushUserMessage: (text: string) => TextMessage;
  /** Append a structured "delivery details" block as if the shopper submitted
   *  it. Use when the form replaces a plain user bubble - the raw text still
   *  goes to the AI via `send(..., { silent: true })`. */
  pushDeliveryDetails: (values: Record<string, string>) => DeliveryDetailsBlock;
  applyEvent: (e: SseEvent) => void;
  resetSurface: () => void;
  setError: (code: string, message: string, recoverable: boolean) => void;
  clearError: () => void;
  setPollingOrderId: (id: string | null) => void;
  setCartOpen: (open: boolean) => void;
  toggleCart: () => void;
  /** Dismiss the quick-reply chips. */
  clearQuickOptions: () => void;
  /** Wipe the persisted timeline AND cart and start a fresh session. */
  resetSession: () => void;
  /** Clear the conversation timeline only (keeps cart). */
  clearMessages: () => void;
  /** Empty the cart only (keeps conversation). */
  clearCart: () => void;
  /** Optimistically remove a single cart line. The trimmed cart is included in
   *  the next chat request context and the gateway adopts it, so the edit
   *  survives the next turn. */
  removeCartLine: (productId: string, variantId?: string) => void;
  /** Optimistically set a cart line's quantity (0 removes it). Same sync
   *  contract as removeCartLine: the next chat request carries the new cart. */
  setCartLineQty: (productId: string, qty: number, variantId?: string) => void;
  /** Persist the recipient (and optional gift message) collected on the
   *  client. Called by the direct checkout flow before posting to /api/checkout. */
  setRecipient: (recipient: Recipient, giftMessage?: string | null) => void;
  /** Open a synthetic delivery form without calling the LLM. The DeliveryForm
   *  organism renders off this surface, exactly as if the AI emitted it. Sets
   *  checkoutFlowActive so the form submit routes to /api/checkout. Pre-fills
   *  any recipient fields we already remember from a prior order. */
  openCheckoutDeliveryForm: (params?: {
    defaultCity?: string;
    defaults?: Partial<Recipient> & { giftMessage?: string | null; deliveryDate?: string };
  }) => void;
  /** Apply the JSON response from /api/checkout: synthesize a checkout surface
   *  and start polling for the pay status. No SSE involved. */
  applyDirectCheckout: (payload: {
    orderId: string;
    payUrl: string;
    expiresAt: string;
    summary: OrderSummary;
    perishableWarning?: string | null;
  }) => void;
  /** Clear the checkout-flow flag, e.g. when the shopper closes the tray. */
  endCheckoutFlow: () => void;
}

const initialCurrency: Currency = "LKR";
const initialMoney: Money = { amount: 0, currency: initialCurrency };

/** Sum of price x qty across lines, denominated by the first line. Falls back
 *  to the server-sent subtotal's currency when the cart is empty. */
function computeCartSubtotal(lines: CartLine[], fallback: Money): Money {
  if (lines.length === 0) return { amount: 0, currency: fallback.currency };
  return {
    amount: lines.reduce((n, l) => n + l.price.amount * l.qty, 0),
    currency: lines[0]!.price.currency,
  };
}

// SSR-safe sessionStorage adapter. Vite SPA never SSRs, but defensive checks
// keep this safe under React 19's StrictMode double-invocation and any future
// node-side rendering. Falls back to a no-op storage if sessionStorage is gone.
const sessionStorageAdapter = (): StateStorage => {
  const noop: StateStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  if (typeof window === "undefined") return noop;
  try {
    // Touch storage to surface privacy-mode errors early.
    window.sessionStorage.setItem("__kapruka_probe__", "1");
    window.sessionStorage.removeItem("__kapruka_probe__");
    return window.sessionStorage;
  } catch {
    return noop;
  }
};

// Bump this whenever the persisted shape changes, then handle migration below.
const STORE_VERSION = 1;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessionId: nanoid(),
      locale: "en",
      currency: initialCurrency,
      messages: [],
      status: { state: "idle" },
      cart: { lines: [], subtotal: initialMoney },
      cartOpen: false,
      surface: { kind: "none" },
      pollingOrderId: null,
      quickOptions: null,
      recipient: null,
      giftMessage: null,
      checkoutFlowActive: false,
      checkoutPerishableWarning: null,

      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") document.documentElement.lang = locale;
      },
      setCurrency: (currency) =>
        set((s) => ({
          currency,
          // Only restamp the subtotal currency while the cart is empty. A
          // populated cart keeps its own denomination: relabeling Rs amounts
          // as $ without conversion would show a false total.
          cart:
            s.cart.lines.length === 0 ? { lines: [], subtotal: { amount: 0, currency } } : s.cart,
        })),

      pushUserMessage: (text) => {
        const msg: TextMessage = {
          kind: "text",
          id: nanoid(),
          role: "user",
          text,
          lang: undefined,
          ts: new Date().toISOString(),
        };
        // Sending a user message always dismisses any pending quick options.
        set((s) => ({ messages: [...s.messages, msg], quickOptions: null }));
        return msg;
      },

      pushDeliveryDetails: (values) => {
        const block: DeliveryDetailsBlock = {
          kind: "delivery-details",
          id: nanoid(),
          values,
          ts: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, block], quickOptions: null }));
        return block;
      },

      applyEvent: (e) =>
        set((s) => {
          const now = new Date().toISOString();
          switch (e.type) {
            case "status":
              return { status: { state: e.state, label: e.label, detail: e.detail } };

            case "message": {
              // Empty text is a retraction: the server streamed tokens for a
              // bubble, then decided the iteration was a tool call. Drop the
              // stranded partial without touching the turn's status.
              if (e.text.length === 0) {
                return {
                  messages: s.messages.filter((m) => !(m.kind === "text" && m.id === e.id)),
                };
              }
              const existing = s.messages.find(
                (m): m is TextMessage => m.kind === "text" && m.id === e.id,
              );
              if (existing) {
                return {
                  messages: s.messages.map((m) =>
                    m.kind === "text" && m.id === e.id ? { ...m, text: e.text } : m,
                  ),
                  status: { state: "idle" as StatusState },
                };
              }
              return {
                messages: [
                  ...s.messages,
                  {
                    kind: "text" as const,
                    id: e.id,
                    role: "assistant" as const,
                    text: e.text,
                    lang: s.locale,
                    ts: now,
                  },
                ],
                status: { state: "idle" as StatusState },
              };
            }

            case "token": {
              const existing = s.messages.find(
                (m): m is TextMessage => m.kind === "text" && m.id === e.id,
              );
              if (existing) {
                return {
                  messages: s.messages.map((m) =>
                    m.kind === "text" && m.id === e.id ? { ...m, text: m.text + e.delta } : m,
                  ),
                };
              }
              return {
                messages: [
                  ...s.messages,
                  {
                    kind: "text" as const,
                    id: e.id,
                    role: "assistant" as const,
                    text: e.delta,
                    lang: s.locale,
                    ts: now,
                  },
                ],
              };
            }

            case "products":
              return {
                messages: [
                  ...s.messages,
                  {
                    kind: "products" as const,
                    id: nanoid(),
                    title: e.title,
                    layout: e.layout,
                    items: e.items,
                    ts: now,
                  },
                ],
              };

            case "delivery_quote":
              return {
                messages: [
                  ...s.messages,
                  { kind: "delivery-quote" as const, id: nanoid(), payload: e, ts: now },
                ],
              };

            case "product_detail":
              return {
                messages: [
                  ...s.messages,
                  {
                    kind: "product-detail" as const,
                    id: nanoid(),
                    payload: e,
                    ts: now,
                  },
                ],
              };

            case "request_info":
              return { surface: { kind: "request_info", payload: e } };

            case "cart":
              // FLOW-8 invariant: the displayed subtotal always equals the sum
              // of price x qty over the displayed lines. Recompute locally so a
              // stale or inconsistent event can never desynchronize the two.
              return {
                cart: { lines: e.lines, subtotal: computeCartSubtotal(e.lines, e.subtotal) },
              };

            case "checkout":
              return {
                surface: { kind: "checkout", payload: e },
                pollingOrderId: e.orderId,
                // The LLM path carries no perishable info; clear any stale one.
                checkoutPerishableWarning: null,
              };

            case "order_confirmed":
              return {
                surface: { kind: "order_confirmed", payload: e },
                pollingOrderId: null,
              };

            case "error":
              return {
                surface: {
                  kind: "error",
                  code: e.code,
                  message: e.message,
                  recoverable: e.recoverable,
                },
                status: { state: "idle" as StatusState },
              };

            case "options":
              // Replace any earlier pending options for this turn.
              return { quickOptions: e };

            case "done":
              return { status: { state: "idle" as StatusState } };

            default:
              return s;
          }
        }),

      resetSurface: () => set({ surface: { kind: "none" }, checkoutFlowActive: false }),

      setError: (code, message, recoverable) =>
        set({
          surface: { kind: "error", code, message, recoverable },
          status: { state: "idle" },
        }),

      clearError: () =>
        set((s) => ({ surface: s.surface.kind === "error" ? { kind: "none" } : s.surface })),

      setPollingOrderId: (id) => set({ pollingOrderId: id }),

      setCartOpen: (open) => set({ cartOpen: open }),
      toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),

      clearQuickOptions: () => set({ quickOptions: null }),

      resetSession: () =>
        set((s) => ({
          sessionId: nanoid(),
          messages: [],
          status: { state: "idle" },
          cart: { lines: [], subtotal: { amount: 0, currency: s.currency } },
          cartOpen: false,
          surface: { kind: "none" },
          pollingOrderId: null,
          quickOptions: null,
          recipient: null,
          giftMessage: null,
          checkoutFlowActive: false,
          checkoutPerishableWarning: null,
        })),

      /** Clear the conversation timeline only - keeps cart, locale, currency. */
      clearMessages: () =>
        set({
          messages: [],
          status: { state: "idle" },
          surface: { kind: "none" },
          quickOptions: null,
        }),

      /** Empty the cart only. Keeps the conversation. */
      clearCart: () =>
        set((s) => ({
          cart: { lines: [], subtotal: { amount: 0, currency: s.currency } },
          cartOpen: false,
        })),

      removeCartLine: (productId, variantId) =>
        set((s) => {
          const lines = s.cart.lines.filter(
            (l) => !(l.productId === productId && (l.variantId ?? "") === (variantId ?? "")),
          );
          return { cart: { lines, subtotal: computeCartSubtotal(lines, s.cart.subtotal) } };
        }),

      setCartLineQty: (productId, qty, variantId) =>
        set((s) => {
          const clamped = Math.max(0, Math.min(99, Math.round(qty)));
          const lines = s.cart.lines
            .map((l) =>
              l.productId === productId && (l.variantId ?? "") === (variantId ?? "")
                ? { ...l, qty: clamped }
                : l,
            )
            .filter((l) => l.qty > 0);
          return { cart: { lines, subtotal: computeCartSubtotal(lines, s.cart.subtotal) } };
        }),

      setRecipient: (recipient, giftMessage) =>
        set((s) => ({
          recipient,
          giftMessage: giftMessage === undefined ? s.giftMessage : giftMessage,
        })),

      openCheckoutDeliveryForm: ({ defaultCity, defaults } = {}) =>
        set(() => {
          const d = defaults ?? {};
          // Synthetic RequestInfoEvent that mirrors what the AI used to emit.
          // The DeliveryForm renders identically off this, no LLM involved.
          const synthetic: RequestInfoEvent = {
            type: "request_info",
            title: "Where should we send it?",
            intent: "delivery",
            submitLabel: "Continue to checkout",
            fields: [
              {
                name: "recipient_name",
                label: "Recipient name",
                type: "text",
                required: true,
                placeholder: "Who is this for?",
                defaultValue: d.name,
              },
              {
                name: "recipient_phone",
                label: "Recipient phone",
                type: "tel",
                required: true,
                placeholder: "07X XXX XXXX",
                defaultValue: d.phone,
              },
              {
                name: "address_line1",
                label: "Address",
                type: "text",
                required: true,
                placeholder: "House / street",
                defaultValue: d.line1,
              },
              {
                name: "address_line2",
                label: "Apartment, suite, etc.",
                type: "text",
                required: false,
                placeholder: "Optional",
                defaultValue: d.line2,
              },
              {
                name: "city",
                label: "City",
                type: "city",
                required: true,
                placeholder: "Type a Sri Lankan city",
                defaultValue: d.city ?? defaultCity,
              },
              {
                name: "postal_code",
                label: "Postal code",
                type: "text",
                required: false,
                placeholder: "Optional",
                defaultValue: d.postalCode,
              },
              {
                name: "delivery_date",
                label: "Delivery date",
                type: "date",
                required: true,
                defaultValue: d.deliveryDate,
              },
              {
                name: "gift_message",
                label: "Gift message",
                type: "textarea",
                required: false,
                placeholder: "Optional, up to 200 characters",
                maxLength: 200,
                defaultValue: d.giftMessage ?? undefined,
              },
            ],
          };
          return {
            surface: { kind: "request_info", payload: synthetic },
            checkoutFlowActive: true,
          };
        }),

      applyDirectCheckout: ({ orderId, payUrl, expiresAt, summary, perishableWarning }) =>
        set(() => {
          const synthetic: CheckoutEvent = {
            type: "checkout",
            orderId,
            payUrl,
            expiresAt,
            summary,
          };
          return {
            surface: { kind: "checkout", payload: synthetic },
            pollingOrderId: orderId,
            status: { state: "idle" as StatusState },
            checkoutFlowActive: false,
            checkoutPerishableWarning: perishableWarning ?? null,
          };
        }),

      endCheckoutFlow: () => set({ checkoutFlowActive: false }),
    }),
    {
      name: "kapruka-chat-session",
      version: STORE_VERSION,
      storage: createJSONStorage(sessionStorageAdapter),
      // Persist only durable conversation + cart context. Skip transient UI
      // state (status, surface, cartOpen, pollingOrderId) so a reload resets
      // ephemeral interactions cleanly.
      partialize: (state) => ({
        sessionId: state.sessionId,
        locale: state.locale,
        currency: state.currency,
        messages: state.messages,
        cart: state.cart,
        recipient: state.recipient,
        giftMessage: state.giftMessage,
      }),
      // On rehydrate, re-sync html[lang] for the typography pipeline.
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          document.documentElement.lang = state.locale;
        }
      },
      // Migration hook for future schema changes.
      migrate: (persisted, fromVersion) => {
        if (fromVersion === STORE_VERSION) return persisted as AppState;
        // Older shape: drop persisted state and start fresh.
        return undefined as unknown as AppState;
      },
    },
  ),
);

// Selectors
export const selectMessages = (s: AppState) => s.messages;
export const selectStatus = (s: AppState) => s.status;
export const selectSurface = (s: AppState) => s.surface;
export const selectCart = (s: AppState) => s.cart;
