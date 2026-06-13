import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  CartLine,
  ChatRequest,
  Money,
  OptionsEvent,
  Product,
  Variant,
} from "@kapruka/protocol";
import { ChatLayout } from "@/components/templates/ChatLayout";
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
import { selectCart, selectStatus, selectSurface, useAppStore } from "@/store";
import { pollOrderStatus, streamChat } from "@/transport";
import { ErrorBanner, ProductQuickView, type CityOption } from "@/components/molecules";
import { pickStrings } from "@/i18n";
import { emitTelemetry } from "@/lib/telemetry";

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

  const [pending, setPending] = useState(false);
  /* Quick-view modal — opens with the Product object the card already has,
     no API roundtrip. */
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed" | "expired">(
    "pending",
  );
  /* The chips bar is never empty: if the AI didn't emit options, we fall back
     to a small generic set. This tracks which assistant turn the shopper
     dismissed those defaults for, so they reappear on the next AI reply. */
  const [defaultsDismissedFor, setDefaultsDismissedFor] = useState<string | null>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const t = pickStrings(locale);

  // Compose the chat request from current state.
  const makeRequest = useCallback(
    (text: string): ChatRequest => {
      const next = [
        ...messages
          .filter((m): m is import("@/store").TextMessage => m.kind === "text")
          .map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: text },
      ];
      return {
        sessionId,
        messages: next.slice(-40),
        context: {
          locale,
          currency,
          cart: cart.lines,
        },
      };
    },
    [messages, sessionId, locale, currency, cart.lines],
  );

  const send = useCallback(
    (text: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) pushUserMessage(text);
      emitTelemetry({
        sessionId,
        kind: "ui_input",
        payload: { source: opts.silent ? "system" : "composer", textLength: text.length },
      });
      setPending(true);
      abortRef.current?.abort();
      abortRef.current = streamChat(makeRequest(text), {
        onEvent: (e) => {
          applyEvent(e);
          emitTelemetry({
            sessionId,
            kind: "render_ack",
            payload: { event: e.type },
          });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : t.error.generic;
          setError("transport", message, true);
          emitTelemetry({
            sessionId,
            kind: "client_error",
            payload: { scope: "transport", message },
          });
        },
        onClose: () => setPending(false),
      });
    },
    [applyEvent, makeRequest, pushUserMessage, setError, sessionId, t.error.generic],
  );

  // Polling lives below `send` so it can use it.
  useEffect(() => {
    if (surface.kind !== "checkout") return;
    setPaymentStatus("pending");
    const checkoutOrderId = surface.payload.orderId;
    const poller = pollOrderStatus({
      orderId: checkoutOrderId,
      onStatus: (status, trackingUrl) => {
        setPaymentStatus(status);
        if (status === "paid") {
          send(
            `payment completed for ${checkoutOrderId}${trackingUrl ? ` (${trackingUrl})` : ""}`,
            { silent: true },
          );
        }
        if (status === "failed") {
          setError("payment_failed", t.checkout.failed, true);
        }
      },
      onError: () => {},
    });
    return () => poller.stop();
  }, [surface, send, setError, t.checkout.failed]);

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
  // already has. No API roundtrip — the deep-dive (variants, full gallery,
  // description) lives behind the "View on Kapruka" link.
  const requestDetail = useCallback((p: Product) => {
    setQuickViewProduct(p);
  }, []);

  const addProduct = useCallback(
    (p: Product, variant?: Variant) => {
      const line: CartLine = {
        productId: p.id,
        title: p.title,
        qty: 1,
        variantId: variant?.id,
        price: variant?.price ?? p.price,
        image: p.image,
      };
      const existingIdx = cart.lines.findIndex(
        (l) => l.productId === line.productId && l.variantId === line.variantId,
      );
      const lines =
        existingIdx >= 0
          ? cart.lines.map((l, i) => (i === existingIdx ? { ...l, qty: l.qty + 1 } : l))
          : [...cart.lines, line];
      const subtotal: Money = {
        amount: lines.reduce((s, l) => s + l.price.amount * l.qty, 0),
        currency,
      };
      applyEvent({ type: "cart", lines, subtotal });
      send(`Add ${p.title}${variant ? ` (${variant.label})` : ""} to my cart.`, { silent: true });
    },
    [cart.lines, currency, applyEvent, send],
  );

  const showHero = messages.length === 0;

  // Pull `clearError` once so the banner can dismiss.
  const clearError = useAppStore((s) => s.clearError);

  // Most recent assistant text turn — keys the per-turn dismissal of default
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
  // Tray content — every contextual surface (cart, form, checkout, success)
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
        trayBody: (
          <CartPanel
            lines={cart.lines}
            subtotal={subtotal}
            onProceed={() => {
              setCartOpen(false);
              send("Proceed to checkout, please.");
            }}
          />
        ),
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
              perishableWarning={undefined}
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
    cityQuery,
    t,
    cartOpen,
    cart.lines,
    cart.subtotal,
    currency,
    setCartOpen,
    send,
    pushDeliveryDetails,
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
        messages={<MessageList onOpenProduct={requestDetail} onAddProduct={addProduct} pending={pending} />}
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
