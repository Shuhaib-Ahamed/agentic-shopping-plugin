import type { OrderConfirmedEvent } from "@kapruka/protocol";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button, Price } from "@/components/atoms";
import { pickStrings } from "@/i18n";
import { useAppStore } from "@/store";

export interface SuccessCardProps {
  event: OrderConfirmedEvent;
  onShopAgain: () => void;
}

const TIMELINE_STEPS = [
  { key: "received", labelKey: "Order received" },
  { key: "preparing", labelKey: "Preparing" },
  { key: "out_for_delivery", labelKey: "Out for delivery" },
  { key: "delivered", labelKey: "Delivered" },
];

export function SuccessCard({ event, onShopAgain }: SuccessCardProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);

  return (
    <section className="px-4 md:px-6 py-4 md:py-6 animate-[surface-in_700ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="glass-strong overflow-hidden">
        <div
          className="px-5 md:px-6 py-5 md:py-6 text-[var(--color-success)] bg-[color:var(--color-success-bg)]"
          style={{ borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={22} />
            <span className="text-[var(--text-sm)] font-semibold uppercase tracking-wide">
              {t.success.title}
            </span>
          </div>
          <p
            className="mt-1 text-[var(--text-2xl)] font-bold text-[var(--color-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.orderId}
          </p>
        </div>

        <div className="p-5 md:p-6">
          <ul className="divide-y divide-[var(--color-border)]">
            {event.summary.lines.map((l) => (
              <li
                key={l.productId + (l.variantId ?? "")}
                className="flex items-center justify-between py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[var(--text-sm)] font-medium">{l.title}</p>
                  <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] tabular">
                    x{l.qty}
                  </p>
                </div>
                <Price money={{ ...l.price, amount: l.price.amount * l.qty }} size="sm" />
              </li>
            ))}
          </ul>

          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[var(--text-base)] font-semibold text-[var(--color-primary)]">
              {t.cart.total}
            </span>
            <Price money={event.summary.total} size="xl" />
          </div>

          <ol className="mt-6 pl-1">
            {TIMELINE_STEPS.map((s, idx) => (
              <li key={s.key} className="relative pl-6 pb-5 last:pb-0">
                <span
                  className={
                    idx === 0
                      ? "absolute left-0 top-1 w-3 h-3 rounded-full bg-[var(--color-cta)]"
                      : "absolute left-0 top-1 w-3 h-3 rounded-full bg-[var(--color-border)]"
                  }
                />
                {idx < TIMELINE_STEPS.length - 1 && (
                  <span className="absolute left-[5px] top-4 bottom-0 border-l-2 border-dotted border-[var(--color-border)]" />
                )}
                <p
                  className={
                    idx === 0
                      ? "text-[var(--text-base)] font-semibold text-[var(--color-text)]"
                      : "text-[var(--text-base)] text-[var(--color-text-muted)]"
                  }
                >
                  {s.labelKey}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            {event.trackingUrl && (
              <Button
                variant="secondary"
                size="lg"
                block
                iconRight={<ExternalLink size={16} />}
                onClick={() => window.open(event.trackingUrl, "_blank", "noopener,noreferrer")}
              >
                {t.success.tracking}
              </Button>
            )}
            <Button variant="primary" size="lg" block onClick={onShopAgain}>
              {t.success.shopAgain}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
