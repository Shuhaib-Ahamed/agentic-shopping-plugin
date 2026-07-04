import type {
  CartLine,
  ChatRequest,
  Money,
  OptionsEvent,
  Product,
  Recipient,
  Variant,
} from "@kapruka/protocol";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ErrorBanner, ProductQuickView, type CityOption } from "@/components/molecules";
import {
  CartPanel,
  CheckoutPanel,
  Composer,
  ComposerStack,
  ComposerTray,
  DeliveryForm,
  FlyToCartProvider,
  GiftMessageField,
  HeroIntro,
  HeroPrompts,
  MessageList,
  OptionsBar,
  SuccessCard,
} from "@/components/organisms";
import { ChatLayout } from "@/components/templates/ChatLayout";
import { pickStrings } from "@/i18n";
import { emitTelemetry } from "@/lib/telemetry";
import type { TextMessage } from "@/store";
import { selectCart, selectStatus, selectSurface, useAppStore } from "@/store";
import { pollOrderStatus, postCheckout, streamChat } from "@/transport";

// Safety net: shown when the AI didn't emit `present_options` so the chips
// bar above the composer is never empty. The system prompt mandates chips
// every turn, but a misbehaving turn shouldn't strand the shopper.
const DEFAULT_OPTIONS: OptionsEvent = {
  type: "options",
  prompt: "Or pick a shortcut",
  layout: "chips",
  options: [
    { label: "Show me options", value: "Show me my options", icon: "Layers" },
    { label: "Help me decide", value: "Help me decide", icon: "Compass" },
    { label: "Surprise me", value: "Surprise me", icon: "Sparkles" },
  ],
};

export function App() {
  const sessionId = useAppStore((s) => s.sessionId);
  const locale = useAppStore((s) => s.locale);
  const currency = useAppStore((s) => s.currency);
  const messages = useAppStore((s) => s.messages);
  const cart = useAppStore(selectCart);
  const cartOpen = useAppStore((s) => s.cartOpen);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const surface = useAppStore(selectSurface);
  const status = useAppStore(selectStatus);
  const quickOptions = useAppStore((s) => s.quickOptions);
  const clearQuickOptions = useAppStore((s) => s.clearQuickOptions);
  const applyEvent = useAppStore((s) => s.applyEvent);
  const pushUserMessage = useAppStore((s) => s.pushUserMessage);
  const pushDeliveryDetails = useAppStore((s) => s.pushDeliveryDetails);
  const setError = useAppStore((s) => s.setError);
  const resetSurface = useAppStore((s) => s.resetSurface);
  const recipient = useAppStore((s) => s.recipient);
  const giftMessage = useAppStore((s) => s.giftMessage);
  const checkoutFlowActive = useAppStore((s) => s.checkoutFlowActive);
  const checkoutPerishableWarning = useAppStore((s) => s.checkoutPerishableWarning);
  const setRecipient = useAppStore((s) => s.setRecipient);
  const openCheckoutDeliveryForm = useAppStore((s) => s.openCheckoutDeliveryForm);
  const applyDirectCheckout = useAppStore((s) => s.applyDirectCheckout);

  const [pending, setPending] = useState(false);
  /* Quick-view modal - opens with the Product object the card already has,
     no API roundtrip. */
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed" | "expired">(
    "pending",
  );
  /* Fulfilment step for the post-payment tracking timeline on SuccessCard.
     Advanced by polling /api/order-status after order_confirmed. */
  const [fulfillment, setFulfillment] = useState<
    "received" | "preparing" | "out_for_delivery" | "delivered"
  >("received");
  /* The chips bar is never empty: if the AI didn't emit options, we fall back
     to a small generic set. This tracks which assistant turn the shopper
     dismissed those defaults for, so they reappear on the next AI reply. */
  const [defaultsDismissedFor, setDefaultsDismissedFor] = useState<string | null>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);
  /* Monotonic id per stream. A superseded stream's late onClose/onError must
     not flip `pending` or raise errors for the stream that replaced it. */
  const streamGenRef = useRef(0);
  /* One "payment completed" notification per order, ever. Without this, a
     poller restart could re-observe "paid" and spam the agent. */
  const paidNotifiedRef = useRef<Set<string>>(new Set());
  /* Reentrancy guard: a double-click on the delivery form must not POST
     /api/checkout twice (each POST creates a real order). */
  const checkoutInFlightRef = useRef(false);
  const t = pickStrings(locale);
  /* Latest-value refs so long-lived effects (payment poller) never need the
     changing callbacks in their dependency arrays. */
  const tRef = useRef(t);
  tRef.current = t;

  // Compose the chat request from the store's LIVE state, not render-time
  // closures. Handlers often mutate the store and send() in the same tick
  // (optimistic add-to-cart, form submits); a closure would post the
  // pre-mutation cart and the gateway would adopt stale state.
  const makeRequest = useCallback((text: string): ChatRequest => {
    const s = useAppStore.getState();
    const next = [
      ...s.messages
        .filter((m): m is TextMessage => m.kind === "text")
        .map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text },
    ];
    return {
      sessionId: s.sessionId,
      messages: next.slice(-40),
      context: {
        locale: s.locale,
        currency: s.currency,
        cart: s.cart.lines,
      },
    };
  }, []);

  const send = useCallback(
    (text: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) pushUserMessage(text);
      emitTelemetry({
        sessionId,
        kind: "ui_input",
        payload: { source: opts.silent ? "system" : "composer", textLength: text.length },
      });
      // Abort any in-flight stream first; its callbacks resolve asynchronously,
      // so gate every handler on the generation id. Otherwise the old stream's
      // late onClose flips `pending` off while the new stream is mid-turn.
      const gen = ++streamGenRef.current;
      abortRef.current?.abort();
      setPending(true);
      abortRef.current = streamChat(makeRequest(text), {
        onEvent: (e) => {
          if (streamGenRef.current !== gen) return;
          applyEvent(e);
          emitTelemetry({
            sessionId,
            kind: "render_ack",
            payload: { event: e.type },
          });
        },
        onError: (err) => {
          if (streamGenRef.current !== gen) return;
          const message = err instanceof Error ? err.message : t.error.generic;
          setError("transport", message, true);
          emitTelemetry({
            sessionId,
            kind: "client_error",
            payload: { scope: "transport", message },
          });
        },
        onClose: () => {
          if (streamGenRef.current !== gen) return;
          setPending(false);
        },
      });
    },
    [applyEvent, makeRequest, pushUserMessage, setError, sessionId, t.error.generic],
  );
  /* Latest send, for effects that must not restart when `send` re-binds. */
  const sendRef = useRef(send);
  sendRef.current = send;

  // -----------------------------------------------------------------------
  // Direct checkout: cart -> /api/checkout, no LLM. The checkoutFlowActive
  // flag in the store tells us the delivery form was opened by the cart
  // proceed button (not by the AI), so its submit should call the gateway
  // directly and render the CheckoutPanel from the JSON response.
  // -----------------------------------------------------------------------
  const proceedFromCart = useCallback(() => {
    setCartOpen(false);
    // If we already remember a recipient from a prior order, still show the
    // form so the shopper can confirm the delivery date for THIS order.
    // Pre-filling makes it a one-tap confirmation in the common case.
    openCheckoutDeliveryForm({
      defaults: {
        ...(recipient ?? {}),
        giftMessage,
      },
    });
  }, [setCartOpen, openCheckoutDeliveryForm, recipient, giftMessage]);

  const submitDirectCheckout = useCallback(
    async (values: Record<string, string>) => {
      // Each POST creates a real order upstream, so a double-submit (fast
      // double click, Enter + click) must be swallowed here, synchronously.
      if (checkoutInFlightRef.current) return;

      const builtRecipient: Recipient = {
        name: (values.recipient_name ?? "").trim(),
        phone: (values.recipient_phone ?? "").trim(),
        line1: (values.address_line1 ?? "").trim(),
        line2: values.address_line2?.trim() || undefined,
        city: (values.city ?? "").trim(),
        postalCode: values.postal_code?.trim() || undefined,
      };
      const deliveryDate = (values.delivery_date ?? "").trim();
      const gift = values.gift_message?.trim() || undefined;

      if (
        !builtRecipient.name ||
        !builtRecipient.phone ||
        !builtRecipient.line1 ||
        !builtRecipient.city ||
        !deliveryDate
      ) {
        setError("checkout_form", "Please fill the required delivery fields.", true);
        return;
      }
      if (builtRecipient.phone.replace(/\D/g, "").length < 7) {
        setError("checkout_form", "That phone number looks too short. Please check it.", true);
        return;
      }
      if (cart.lines.length === 0) {
        setError("empty_cart", "Your cart is empty. Add something first.", true);
        return;
      }

      checkoutInFlightRef.current = true;
      // Persist client-side so a reload preserves them.
      setRecipient(builtRecipient, gift ?? null);
      // Render a delivery-details block in the timeline so the shopper has
      // a visible record of what they just submitted.
      pushDeliveryDetails(values);
      resetSurface();
      setPending(true);

      try {
        const result = await postCheckout({
          sessionId,
          cart: cart.lines,
          recipient: builtRecipient,
          delivery: { city: builtRecipient.city, date: deliveryDate },
          giftMessage: gift,
          currency,
        });
        setPending(false);

        if (!result.ok) {
          setError("checkout_failed", result.message, true);
          emitTelemetry({
            sessionId,
            kind: "client_error",
            payload: { scope: "direct_checkout", code: result.code, message: result.message },
          });
          // FLOW-10: a quote/validation failure (bad city, unquotable date) is
          // fixable. Re-open the form with EVERYTHING pre-filled, date included,
          // so the shopper only touches the field that was actually wrong.
          if (result.code === "mcp_failed" || result.code === "bad_request") {
            openCheckoutDeliveryForm({
              defaults: { ...builtRecipient, giftMessage: gift ?? null, deliveryDate },
            });
          }
          return;
        }
        applyDirectCheckout({
          orderId: result.orderId,
          payUrl: result.payUrl,
          expiresAt: result.expiresAt,
          summary: result.summary,
          perishableWarning: result.perishableWarning,
        });
        emitTelemetry({
          sessionId,
          kind: "render_ack",
          payload: { event: "checkout", source: "direct" },
        });
      } finally {
        checkoutInFlightRef.current = false;
        setPending(false);
      }
    },
    [
      cart.lines,
      currency,
      sessionId,
      setError,
      setRecipient,
      pushDeliveryDetails,
      resetSurface,
      applyDirectCheckout,
      openCheckoutDeliveryForm,
    ],
  );

  // -----------------------------------------------------------------------
  // Payment watch. Keyed on the orderId alone: everything else the callback
  // needs comes in via refs, so a streaming token or locale switch can never
  // tear the poller down, reset the attempt budget, or regress the visible
  // payment status. `setError` is a zustand action and therefore stable.
  // -----------------------------------------------------------------------
  const checkoutOrderId = surface.kind === "checkout" ? surface.payload.orderId : null;
  useEffect(() => {
    if (!checkoutOrderId) return;
    setPaymentStatus("pending");
    const poller = pollOrderStatus({
      orderId: checkoutOrderId,
      onStatus: (status, trackingUrl) => {
        const paidOrBeyond =
          status === "paid" ||
          status === "processing" ||
          status === "dispatched" ||
          status === "delivered";
        setPaymentStatus((prev) => {
          // A local countdown expiry outranks a stale "pending" from the API.
          if (prev === "expired" && !paidOrBeyond && status !== "failed") return prev;
          return paidOrBeyond ? "paid" : status === "failed" ? "failed" : prev;
        });
        if (paidOrBeyond && !paidNotifiedRef.current.has(checkoutOrderId)) {
          paidNotifiedRef.current.add(checkoutOrderId);
          sendRef.current(
            `payment completed for ${checkoutOrderId}${trackingUrl ? ` (${trackingUrl})` : ""}`,
            { silent: true },
          );
        }
        if (status === "failed") {
          setError("payment_failed", tRef.current.checkout.failed, true);
        }
      },
      onError: () => {},
    });
    return () => poller.stop();
  }, [checkoutOrderId, setError]);

  // -----------------------------------------------------------------------
  // Fulfilment tracking. Once the order is confirmed, keep polling through
  // paid → processing → dispatched → delivered so the SuccessCard timeline
  // advances live instead of sitting frozen on "Order received".
  // -----------------------------------------------------------------------
  const confirmedOrderId = surface.kind === "order_confirmed" ? surface.payload.orderId : null;
  useEffect(() => {
    if (!confirmedOrderId) return;
    setFulfillment("preparing");
    const poller = pollOrderStatus({
      orderId: confirmedOrderId,
      intervalMs: 8000,
      maxAttempts: 45,
      terminalStatuses: ["delivered", "failed"],
      onStatus: (status) => {
        if (status === "dispatched") setFulfillment("out_for_delivery");
        else if (status === "delivered") setFulfillment("delivered");
        else if (status === "paid" || status === "processing") setFulfillment("preparing");
      },
      onError: () => {},
    });
    return () => poller.stop();
  }, [confirmedOrderId]);

  const cityQuery = useCallback(async (q: string): Promise<CityOption[]> => {
    if (!q || q.length < 2) return [];
    try {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}&limit=8`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        items: Array<{ canonical: string; aliases?: string[] }>;
      };
      return json.items.map((c) => ({
        canonical: c.canonical,
        label: c.aliases && c.aliases.length > 0 ? `${c.canonical} (${c.aliases[0]})` : c.canonical,
      }));
    } catch {
      return [];
    }
  }, []);

  // Opens the local quick-view modal using the Product object the card
  // already has. No API roundtrip - the deep-dive (variants, full gallery,
  // description) lives behind the "View on Kapruka" link.
  const requestDetail = useCallback((p: Product) => {
    setQuickViewProduct(p);
  }, []);

  const addProduct = useCallback(
    (p: Product, variant?: Variant) => {
      const price = variant?.price ?? p.price;
      // A cart holds one currency (the server enforces the same rule). Refuse
      // the mix up front with a readable message instead of a corrupt total.
      const cartCurrency = cart.lines[0]?.price.currency;
      if (cartCurrency && price.currency !== cartCurrency) {
        setError(
          "currency_mismatch",
          `Your cart is in ${cartCurrency}. Empty it first to shop in ${price.currency}.`,
          true,
        );
        return;
      }
      const line: CartLine = {
        productId: p.id,
        title: p.title,
        qty: 1,
        variantId: variant?.id,
        price,
        image: p.image,
      };
      const existingIdx = cart.lines.findIndex(
        (l) => l.productId === line.productId && l.variantId === line.variantId,
      );
      const lines =
        existingIdx >= 0
          ? cart.lines.map((l, i) => (i === existingIdx ? { ...l, qty: l.qty + 1 } : l))
          : [...cart.lines, line];
      // Denominate the subtotal by the lines themselves, not the UI currency
      // toggle: the store recomputes it anyway (FLOW-8), this keeps the event
      // internally consistent.
      const subtotal: Money = {
        amount: lines.reduce((s, l) => s + l.price.amount * l.qty, 0),
        currency: lines[0]!.price.currency,
      };
      applyEvent({ type: "cart", lines, subtotal });
      // Declarative sync note, not an instruction: the cart in context already
      // contains the item, so the model must not call kapruka_add_to_cart
      // again (that would double-count on top of this optimistic add).
      send(
        `I added ${p.title}${variant ? ` (${variant.label})` : ""} to my cart using the card's Add button. The cart is already updated, do not add it again; just confirm the cart total and suggest a next step.`,
        { silent: true },
      );
    },
    [cart.lines, applyEvent, send, setError],
  );

  const showHero = messages.length === 0;

  // Pull `clearError` once so the banner can dismiss.
  const clearError = useAppStore((s) => s.clearError);

  // Most recent assistant text turn - keys the per-turn dismissal of default
  // chips so they reappear on every fresh reply.
  const lastAssistantTextId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.kind === "text" && m.role === "assistant") return m.id;
    }
    return null;
  }, [messages]);

  const displayOptions: OptionsEvent | null = useMemo(() => {
    if (quickOptions) return quickOptions;
    if (surface.kind === "error") return null;
    if (status.state !== "idle") return null;
    if (!lastAssistantTextId) return null;
    if (defaultsDismissedFor === lastAssistantTextId) return null;
    return DEFAULT_OPTIONS;
  }, [quickOptions, surface.kind, status.state, lastAssistantTextId, defaultsDismissedFor]);

  // -----------------------------------------------------------------------
  // Tray content - every contextual surface (cart, form, checkout, success)
  // now slides up from above the composer instead of mounting in a side
  // panel. Computes both the title and the body in a single useMemo so the
  // open/close state stays in sync.
  // -----------------------------------------------------------------------
  const { trayTitle, trayBody } = useMemo<{
    trayTitle: string | undefined;
    trayBody: ReactNode;
  }>(() => {
    if (cartOpen) {
      const subtotal = cart.subtotal ?? { amount: 0, currency };
      return {
        trayTitle: t.cart.title,
        trayBody: <CartPanel lines={cart.lines} subtotal={subtotal} onProceed={proceedFromCart} />,
      };
    }
    switch (surface.kind) {
      case "request_info": {
        const body =
          surface.payload.intent === "delivery" ? (
            <DeliveryForm
              event={surface.payload}
              onCityQuery={cityQuery}
              onSubmit={(values) => {
                if (checkoutFlowActive) {
                  void submitDirectCheckout(values);
                  return;
                }
                pushDeliveryDetails(values);
                // Close the tray the moment the form is submitted; the
                // delivery card now lives inline in the chat timeline.
                resetSurface();
                send(
                  `Delivery details: ${Object.entries(values)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("; ")}`,
                  { silent: true },
                );
              }}
              isPending={pending}
            />
          ) : surface.payload.intent === "gift" ? (
            <GiftMessageField
              onSave={(msg) => {
                resetSurface();
                send(msg ? `Gift message: ${msg}` : "No gift message.");
              }}
            />
          ) : (
            <DeliveryForm
              event={surface.payload}
              onCityQuery={cityQuery}
              onSubmit={(values) => {
                pushDeliveryDetails(values);
                resetSurface();
                send(
                  Object.entries(values)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("; "),
                  { silent: true },
                );
              }}
              isPending={pending}
            />
          );
        return { trayTitle: surface.payload.title, trayBody: body };
      }
      case "checkout":
        return {
          trayTitle: t.checkout.title,
          trayBody: (
            <CheckoutPanel
              event={surface.payload}
              paymentStatus={paymentStatus}
              perishableWarning={checkoutPerishableWarning ?? undefined}
              onExpire={() => setPaymentStatus((prev) => (prev === "pending" ? "expired" : prev))}
              onIPaid={() => send(`I just paid for order ${surface.payload.orderId}.`)}
              onCreateFreshOrder={() =>
                send("The pay link expired. Please create a fresh order so I can pay.")
              }
            />
          ),
        };
      case "order_confirmed":
        return {
          trayTitle: t.success.title,
          trayBody: (
            <SuccessCard
              event={surface.payload}
              fulfillment={fulfillment}
              onShopAgain={() => send("I'd like to shop again.")}
            />
          ),
        };
      // "error" renders as an inline banner above the composer.
      // "product_detail" renders inline in the chat timeline, not as a tray.
      default:
        return { trayTitle: undefined, trayBody: null };
    }
  }, [
    surface,
    pending,
    paymentStatus,
    fulfillment,
    checkoutPerishableWarning,
    cityQuery,
    t,
    cartOpen,
    cart.lines,
    cart.subtotal,
    currency,
    send,
    pushDeliveryDetails,
    resetSurface,
    proceedFromCart,
    submitDirectCheckout,
    checkoutFlowActive,
  ]);

  const trayOpen = trayBody !== null;

  const handleCloseTray = useCallback(() => {
    setCartOpen(false);
    if (surface.kind !== "none" && surface.kind !== "error") resetSurface();
  }, [setCartOpen, resetSurface, surface.kind]);

  // Stop the stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Composer column. Slot order top → bottom: tray, error, options, composer.
  // The unified `ComposerStack` owns max-width, horizontal padding, vertical
  // gap, and per-slot spring transitions, so the column reads as one cohesive
  // surface that reflows smoothly as slots come and go.
  const composerColumn = (
    <ComposerStack
      tray={
        trayOpen ? (
          <ComposerTray open title={trayTitle} onClose={handleCloseTray}>
            {trayBody}
          </ComposerTray>
        ) : null
      }
      banner={
        surface.kind === "error" ? (
          <ErrorBanner
            message={surface.message || t.error.generic}
            code={surface.code}
            recoverable={surface.recoverable}
            retryLabel={t.error.retry}
            onRetry={() => {
              const recoverable = surface.recoverable;
              clearError();
              if (recoverable) send(t.error.retry);
            }}
            onDismiss={clearError}
          />
        ) : null
      }
      options={
        displayOptions ? (
          <OptionsBar
            options={displayOptions}
            onSelect={(value) => {
              clearQuickOptions();
              if (lastAssistantTextId) setDefaultsDismissedFor(lastAssistantTextId);
              send(value);
            }}
            onDismiss={() => {
              if (quickOptions) clearQuickOptions();
              if (lastAssistantTextId) setDefaultsDismissedFor(lastAssistantTextId);
            }}
          />
        ) : null
      }
      composer={<Composer onSubmit={send} isPending={pending} showBeam={showHero} />}
    />
  );

  return (
    <FlyToCartProvider>
      <ChatLayout
        showHero={showHero}
        heroIntro={<HeroIntro />}
        heroPrompts={<HeroPrompts onSuggestion={send} />}
        messages={
          <MessageList onOpenProduct={requestDetail} onAddProduct={addProduct} pending={pending} />
        }
        composer={composerColumn}
      />

      <ProductQuickView
        product={quickViewProduct}
        open={quickViewProduct !== null}
        onOpenChange={(o) => {
          if (!o) setQuickViewProduct(null);
        }}
        onAdd={(p) => {
          addProduct(p);
          setQuickViewProduct(null);
        }}
      />
    </FlyToCartProvider>
  );
}
