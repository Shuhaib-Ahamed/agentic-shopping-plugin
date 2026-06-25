import type { Product, Variant, OptionsEvent } from "@kapruka/protocol";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { MessageBubble } from "@/components/molecules";
import { pickStrings } from "@/i18n";
import { fadeUpVariants, instant } from "@/lib/motion";
import { selectMessages, selectStatus, useAppStore } from "@/store";
import { DeliveryDetailsCard } from "./DeliveryDetailsCard";
import { DeliveryQuoteCard } from "./DeliveryQuoteCard";
import { ProductCarouselInline } from "./ProductCarouselInline";
import { ProductDetailInline } from "./ProductDetailInline";
import { StatusBubble } from "./StatusBubble";

export interface MessageListProps {
  onOpenProduct?: (p: Product) => void;
  onAddProduct?: (p: Product, variant?: Variant) => void;
  /** True while a chat request is in flight. Drives the typing indicator
      so the UI isn't frozen during the network gap before the first SSE
      event arrives. */
  pending?: boolean;
}

// Renders the chat timeline - text turns, inline product carousels, inline
// delivery quote cards - chronologically. This is where the editorial
// feel lives: generous spacing between groups, clear hierarchy.
export function MessageList({ onOpenProduct, onAddProduct, pending }: MessageListProps) {
  const messages = useAppStore(selectMessages);
  const status = useAppStore(selectStatus);
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  // Stick-to-bottom controller. `stickRef` is the live decision: while true,
  // every content change pins the viewport to the latest message. The shopper
  // flips it to false the moment they scroll away from the bottom; it flips
  // back the next time they return to the bottom (or close enough). All
  // programmatic scrolls call `pinToBottom`, which marks the moment so the
  // `scroll` listener doesn't mistake them for shopper input.
  const stickRef = useRef(true);
  const lastProgrammaticScrollAt = useRef(0);

  const isNearBottom = (el: HTMLElement) => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < 96;
  };

  const pinToBottom = (smooth: boolean) => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    lastProgrammaticScrollAt.current = performance.now();
    anchor.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  };

  // Subscribe to user-input scroll. Native `scroll` covers wheel, touchpad,
  // touch, scrollbar, and keyboard, but it also fires while smooth-scroll
  // animations run. The 700ms guard window ignores any scroll event landing
  // within that window after a programmatic call so the animation can't flip
  // the stick state.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (performance.now() - lastProgrammaticScrollAt.current < 700) return;
      stickRef.current = isNearBottom(el);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Streaming tokens grow the latest text message in place, so `messages.length`
  // doesn't change. Track the tail-text length to re-fire the scroll effect on
  // every appended chunk.
  const tail = messages[messages.length - 1];
  const tailText = tail?.kind === "text" ? tail.text : "";

  // Run the scroll AFTER layout so the new content is already measured -
  // useEffect would paint the new content briefly above the fold first.
  // The first arrival of a new message gets the smooth behaviour; subsequent
  // token-stream growth uses instant so it doesn't queue smooth animations
  // on top of each other.
  useLayoutEffect(() => {
    if (!stickRef.current) return;
    const smooth = tailText.length === 0 || tailText.length < 16;
    pinToBottom(smooth);
  }, [messages.length, tailText, status.state, status.label, pending]);

  // Quick-reply chips don't live in `messages`; they sit in the `quickOptions`
  // slot. Without this, a turn that emits ONLY chips (or chips before the
  // final text) would keep the status bubble visible because the timeline
  // detector finds no assistant-side content.
  const quickOptions: OptionsEvent | null = useAppStore((s) => s.quickOptions);

  // Hide the status bubble the moment ANY assistant-side content has landed
  // for the current turn: a text bubble, a UI block (products / quote /
  // detail), or quick-reply chips above the composer.
  //
  // `delivery-details` is the user echoing back what they just filled into a
  // form — it's user-side, not an assistant reply. Treating it as a reply
  // here was the dead-air bug: the form submit pushed a delivery-details
  // block and then kicked off a chat turn, but the bubble never mounted
  // because this walk-back stopped at the freshly pushed block.
  const hasAssistantResponded = (() => {
    if (quickOptions) return true;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.kind === "text") {
        // Walk back to the most recent user turn. If we hit it without seeing
        // any assistant content first, the agent has not replied yet.
        if (m.role === "user") return false;
        // An assistant text bubble with content counts.
        if (m.role === "assistant" && m.text.length > 0) return true;
        continue;
      }
      if (m.kind === "delivery-details") {
        // User-side echo of a submitted form; same semantics as a user text turn.
        return false;
      }
      // Any other non-text timeline block is assistant-side and counts as a reply.
      return true;
    }
    return false;
  })();
  // Bubble only shows while the BE is actively narrating progress AND nothing
  // has arrived yet. Once content lands or status returns to idle, hide.
  const showStatus = status.state !== "idle" && !hasAssistantResponded;
  // `pending` is the safety net for the brief window between send() and the
  // first SSE status event: surface a bubble even if status hasn't been
  // pushed yet, so the input never feels frozen.
  const earlyPendingBubble = pending && !hasAssistantResponded && status.state === "idle";
  const renderBubble = showStatus || earlyPendingBubble;
  // Fallback for when only `pending` is true (no SSE status arrived yet).
  const fallbackState = status.state === "idle" ? "thinking" : status.state;

  const reduced = useReducedMotion();
  const itemTransition = reduced ? instant : undefined;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-quiet"
      style={{ scrollPaddingBlock: 24 }}
    >
      <div
        className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 md:py-12 space-y-6 md:space-y-8"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
        aria-label={t.app.title}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            if (m.kind === "products") {
              return (
                <motion.div
                  key={m.id}
                  variants={fadeUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={itemTransition}
                  layout="position"
                >
                  <ProductCarouselInline
                    title={m.title}
                    items={m.items}
                    layout={m.layout}
                    onOpen={onOpenProduct}
                    onAdd={onAddProduct}
                  />
                </motion.div>
              );
            }
            if (m.kind === "delivery-quote") {
              return (
                <motion.div
                  key={m.id}
                  variants={fadeUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={itemTransition}
                  layout="position"
                >
                  <DeliveryQuoteCard quote={m.payload} />
                </motion.div>
              );
            }
            if (m.kind === "product-detail") {
              return (
                <motion.div
                  key={m.id}
                  variants={fadeUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={itemTransition}
                  layout="position"
                >
                  <ProductDetailInline
                    detail={m.payload}
                    onAdd={(product, variant) => onAddProduct?.(product, variant)}
                  />
                </motion.div>
              );
            }
            if (m.kind === "delivery-details") {
              return (
                <motion.div
                  key={m.id}
                  variants={fadeUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={itemTransition}
                  layout="position"
                >
                  <DeliveryDetailsCard values={m.values} />
                </motion.div>
              );
            }
            return (
              <MessageBubble
                key={m.id}
                role={m.role}
                text={m.text}
                lang={m.lang ?? locale}
                agentName={t.app.title}
              />
            );
          })}
          {renderBubble && (
            <StatusBubble
              key="status-bubble"
              state={fallbackState}
              label={status.label}
              detail={status.detail}
            />
          )}
        </AnimatePresence>
        <div ref={anchorRef} aria-hidden />
      </div>
    </div>
  );
}
