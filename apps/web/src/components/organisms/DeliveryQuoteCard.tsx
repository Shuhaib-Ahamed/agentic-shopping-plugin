import { Truck, AlertTriangle, Calendar, MapPin } from "lucide-react";
import type { DeliveryQuoteEvent } from "@kapruka/protocol";
import { Price } from "@/components/atoms";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface DeliveryQuoteCardProps {
  quote: DeliveryQuoteEvent;
  className?: string;
}

// Inline card showing the delivery quote returned by kapruka_check_delivery.
// Compact, chat-bubble-sized: city + date + rate + optional perishable warning.
export function DeliveryQuoteCard({ quote, className }: DeliveryQuoteCardProps) {
  return (
    <section
      className={cn(
        "w-full max-w-[480px] rounded-[var(--radius-lg)] bg-surface border border-border",
        "shadow-[var(--shadow-sm)] overflow-hidden",
        "animate-[surface-in_420ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          aria-hidden
          className="grid place-items-center w-10 h-10 rounded-full text-white shrink-0"
          style={{ background: "var(--gradient-cta)" }}
        >
          <Truck size={18} strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-muted">
            Delivery quote
          </p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <h4
              className="text-[var(--text-lg)] font-semibold text-primary leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {quote.city}
            </h4>
            <Price money={quote.rate} size="lg" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[var(--text-sm)] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} />
              <span className="tabular">{formatDate(quote.date)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              <span className="truncate">{quote.city}</span>
            </span>
          </div>
        </div>
      </div>

      {quote.perishableWarning && (
        <div
          role="status"
          className="flex items-start gap-2 px-4 py-3 border-t border-border"
          style={{ background: "var(--color-warn-bg)" }}
        >
          <AlertTriangle
            size={14}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--color-warn)" }}
          />
          <p className="text-[var(--text-sm)] leading-snug" style={{ color: "var(--color-warn)" }}>
            {quote.perishableWarning}
          </p>
        </div>
      )}
    </section>
  );
}
