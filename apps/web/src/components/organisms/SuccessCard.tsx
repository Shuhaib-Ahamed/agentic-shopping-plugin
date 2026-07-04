import type { OrderConfirmedEvent } from "@kapruka/protocol";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button, Price } from "@/components/atoms";
import { pickStrings } from "@/i18n";
import { instant, springs } from "@/lib/motion";
import { useAppStore } from "@/store";

export type FulfillmentStep = "received" | "preparing" | "out_for_delivery" | "delivered";

export interface SuccessCardProps {
  event: OrderConfirmedEvent;
  /** Live fulfilment stage from the order-status poller. Steps up to and
   *  including this one render as reached on the timeline. */
  fulfillment?: FulfillmentStep;
  onShopAgain: () => void;
}

const TIMELINE_STEPS: Array<{ key: FulfillmentStep; label: string }> = [
  { key: "received", label: "Order received" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export function SuccessCard({ event, fulfillment = "received", onShopAgain }: SuccessCardProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const reduced = useReducedMotion();
  const reachedIdx = Math.max(
    0,
    TIMELINE_STEPS.findIndex((s) => s.key === fulfillment),
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? instant : springs.celebrate}
      className="px-4 md:px-6 py-4 md:py-6"
    >
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
                key={`${l.productId}::${l.variantId ?? ""}`}
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

          <ol className="mt-6 pl-1" aria-label="Delivery progress" aria-live="polite">
            {TIMELINE_STEPS.map((s, idx) => {
              const reached = idx <= reachedIdx;
              const current = idx === reachedIdx;
              return (
                <li
                  key={s.key}
                  className="relative pl-6 pb-5 last:pb-0"
                  aria-current={current ? "step" : undefined}
                >
                  <span
                    className={
                      reached
                        ? "absolute left-0 top-1 w-3 h-3 rounded-full bg-[var(--color-cta)]"
                        : "absolute left-0 top-1 w-3 h-3 rounded-full bg-[var(--color-border)]"
                    }
                  />
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <span
                      className={
                        idx < reachedIdx
                          ? "absolute left-[5px] top-4 bottom-0 border-l-2 border-dotted border-[var(--color-cta)]"
                          : "absolute left-[5px] top-4 bottom-0 border-l-2 border-dotted border-[var(--color-border)]"
                      }
                    />
                  )}
                  <p
                    className={
                      current
                        ? "text-[var(--text-base)] font-semibold text-[var(--color-text)]"
                        : reached
                          ? "text-[var(--text-base)] text-[var(--color-text)]"
                          : "text-[var(--text-base)] text-[var(--color-text-muted)]"
                    }
                  >
                    {s.label}
                  </p>
                </li>
              );
            })}
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
    </motion.section>
  );
}
