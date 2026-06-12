import { useEffect, useRef } from "react";
import type { Product, Variant } from "@kapruka/protocol";
import { selectMessages, selectStatus, useAppStore } from "@/store";
import { MessageBubble, TypingIndicator } from "@/components/molecules";
import { ProductCarouselInline } from "./ProductCarouselInline";
import { DeliveryQuoteCard } from "./DeliveryQuoteCard";
import { DeliveryDetailsCard } from "./DeliveryDetailsCard";
import { ProductDetailInline } from "./ProductDetailInline";
import { pickStrings } from "@/i18n";

export interface MessageListProps {
  onOpenProduct?: (p: Product) => void;
  onAddProduct?: (p: Product, variant?: Variant) => void;
  /** True while a chat request is in flight. Drives the typing indicator
      so the UI isn't frozen during the network gap before the first SSE
      event arrives. */
  pending?: boolean;
}

// Renders the chat timeline — text turns, inline product carousels, inline
// delivery quote cards — chronologically. This is where the editorial
// feel lives: generous spacing between groups, clear hierarchy.
export function MessageList({ onOpenProduct, onAddProduct, pending }: MessageListProps) {
  const messages = useAppStore(selectMessages);
  const status = useAppStore(selectStatus);
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll only when the user is near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 120) {
      anchor.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, status.state, status.label, pending]);

  // Show the typing indicator whenever a request is in flight AND no
  // assistant message has started streaming yet. The moment tokens land
  // (`m.kind === "text" && m.role === "assistant"` as the tail item),
  // the indicator hides and the streaming message bubble takes over.
  const last = messages[messages.length - 1];
  const assistantStreaming =
    last?.kind === "text" && last.role === "assistant";
  const showTyping = (pending || status.state !== "idle") && !assistantStreaming;
  const typingLabel =
    status.label ??
    (status.state === "working" ? t.status.working : t.status.thinking);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-quiet"
      style={{ scrollPaddingBlock: 24 }}
    >
      <div className="mx-auto max-w-[760px] px-4 md:px-8 py-8 md:py-12 space-y-6 md:space-y-8">
        {messages.map((m) => {
          if (m.kind === "products") {
            return (
              <div key={m.id} className="animate-[message-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
                <ProductCarouselInline
                  title={m.title}
                  items={m.items}
                  layout={m.layout}
                  onOpen={onOpenProduct}
                  onAdd={onAddProduct}
                />
              </div>
            );
          }
          if (m.kind === "delivery-quote") {
            return (
              <div key={m.id}>
                <DeliveryQuoteCard quote={m.payload} />
              </div>
            );
          }
          if (m.kind === "product-detail") {
            return (
              <div key={m.id} className="animate-[message-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
                <ProductDetailInline
                  detail={m.payload}
                  onAdd={(product, variant) => onAddProduct?.(product, variant)}
                />
              </div>
            );
          }
          if (m.kind === "delivery-details") {
            return (
              <div key={m.id} className="animate-[message-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
                <DeliveryDetailsCard values={m.values} />
              </div>
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
        {showTyping && (
          <TypingIndicator
            label={status.state === "working" ? typingLabel : undefined}
          />
        )}
        <div ref={anchorRef} aria-hidden />
      </div>
    </div>
  );
}
