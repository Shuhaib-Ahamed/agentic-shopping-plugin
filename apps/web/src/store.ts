import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  CartLine,
  CheckoutEvent,
  DeliveryQuoteEvent,
  Locale,
  Currency,
  Money,
  OptionsEvent,
  OrderConfirmedEvent,
  Product,
  ProductDetailEvent,
  RequestInfoEvent,
  SseEvent,
} from "@kapruka/protocol";
import { nanoid } from "nanoid";

// -----------------------------------------------------------------------------
// Timeline items — the chat is a heterogeneous stream of text turns plus
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

export type StatusState = "thinking" | "working" | "idle";

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
  status: { state: StatusState; label?: string };
  cart: { lines: CartLine[]; subtotal: Money };
  cartOpen: boolean;
  surface: ActionSurface;
  pollingOrderId: string | null;
  /** Quick-reply chips above the composer. Lives only until the next user
   *  reply (clicked chip or typed message). Never persisted. */
  quickOptions: OptionsEvent | null;

  // actions
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  pushUserMessage: (text: string) => TextMessage;
  /** Append a structured "delivery details" block as if the shopper submitted
   *  it. Use when the form replaces a plain user bubble — the raw text still
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
  /** Optimistically remove a single cart line. The cart is server-authoritative,
   *  but the trimmed cart is included in the next chat request context, so the
   *  AI sees the new state on the next turn. */
  removeCartLine: (productId: string, variantId?: string) => void;
}

const initialCurrency: Currency = "LKR";
const initialMoney: Money = { amount: 0, currency: initialCurrency };

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

      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") document.documentElement.lang = locale;
      },
      setCurrency: (currency) =>
        set((s) => ({
          currency,
          // Keep the subtotal currency in sync.
          cart: { lines: s.cart.lines, subtotal: { ...s.cart.subtotal, currency } },
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
              return { status: { state: e.state, label: e.label } };

            case "message": {
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
              return { cart: { lines: e.lines, subtotal: e.subtotal } };

            case "checkout":
              return {
                surface: { kind: "checkout", payload: e },
                pollingOrderId: e.orderId,
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

      resetSurface: () => set({ surface: { kind: "none" } }),

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
        })),

      /** Clear the conversation timeline only — keeps cart, locale, currency. */
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
          const amount = lines.reduce((n, l) => n + l.price.amount * l.qty, 0);
          return {
            cart: { lines, subtotal: { amount, currency: s.cart.subtotal.currency } },
          };
        }),
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
