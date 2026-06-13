import type { CheckoutEvent } from "@kapruka/protocol";
import { Copy, ExternalLink, AlertCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Price, Spinner } from "@/components/atoms";
import { CountdownPill } from "@/components/molecules";
import { pickStrings } from "@/i18n";
import { useAppStore } from "@/store";

export interface CheckoutPanelProps {
  event: CheckoutEvent;
  /** Called when the shopper taps "I just paid". */
  onIPaid: () => void;
  /** Polled payment status (drives the inline label). */
  paymentStatus: "pending" | "paid" | "failed" | "expired";
  /** When the link expires, the agent should re-create. This is the recovery CTA. */
  onCreateFreshOrder: () => void;
  perishableWarning?: string;
}

export function CheckoutPanel({
  event,
  onIPaid,
  paymentStatus,
  onCreateFreshOrder,
  perishableWarning,
}: CheckoutPanelProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const [copied, setCopied] = useState(false);

  const openPay = () => {
    window.open(event.payUrl, "_blank", "noopener,noreferrer");
  };

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(event.orderId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const expired = paymentStatus === "expired";
  const failed = paymentStatus === "failed";

  return (
    <section className="px-4 md:px-6 py-4 md:py-6 animate-[surface-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="glass-strong p-4 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3
              className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.checkout.title}
            </h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {t.checkout.orderId}
              </span>
              <code className="text-[var(--text-xs)] font-mono text-[var(--color-text)]">
                {event.orderId}
              </code>
              <IconButton
                aria-label="Copy order id"
                size="sm"
                variant="ghost"
                icon={<Copy size={14} />}
                onClick={copyOrderId}
              />
              {copied && (
                <span className="text-[var(--text-xs)] text-[var(--color-cta)]">Copied</span>
              )}
            </div>
          </div>
          {!expired && !failed && <CountdownPill expiresAt={event.expiresAt} />}
        </header>

        {perishableWarning && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-[10px] bg-[color:var(--color-warn-bg)] border border-[var(--color-warn)] text-[var(--color-warn)]"
            role="status"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="text-[var(--text-sm)]">{perishableWarning}</p>
          </div>
        )}

        <ul className="mt-4 divide-y divide-[var(--color-border)]">
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

        <div className="mt-3 flex items-center justify-between text-[var(--text-sm)] text-[var(--color-text-muted)]">
          <span>{t.cart.delivery}</span>
          <Price money={event.summary.delivery} size="sm" />
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[var(--text-base)] font-semibold text-[var(--color-primary)]">
            {t.cart.total}
          </span>
          <Price money={event.summary.total} size="xl" />
        </div>

        {event.summary.recipient && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">
            <p>
              <span className="text-[var(--color-text)]">{event.summary.recipient.name}</span>
              <br />
              <span className="tabular">{event.summary.recipient.phone}</span>
            </p>
            <p>
              {event.summary.recipient.line1}
              {event.summary.recipient.line2 && (
                <>
                  <br />
                  {event.summary.recipient.line2}
                </>
              )}
              <br />
              {event.summary.recipient.city}
            </p>
          </div>
        )}

        {event.summary.giftMessage && (
          <p className="mt-3 italic text-[var(--text-sm)] text-[var(--color-text-muted)] border-l-2 border-[var(--color-border)] pl-3">
            "{event.summary.giftMessage}"
          </p>
        )}

        {expired ? (
          <div className="mt-5 p-4 rounded-[10px] border-l-4 border-[var(--color-error)] bg-[var(--color-surface)]">
            <div className="flex items-start gap-2 text-[var(--color-error)]">
              <AlertCircle size={18} className="mt-0.5" />
              <p className="text-[var(--text-sm)]">{t.checkout.expired}</p>
            </div>
            <div className="mt-3">
              <Button block size="lg" onClick={onCreateFreshOrder}>
                {t.checkout.expiredCta}
              </Button>
            </div>
          </div>
        ) : failed ? (
          <div className="mt-5 p-4 rounded-[10px] border-l-4 border-[var(--color-error)] bg-[var(--color-surface)]">
            <p className="text-[var(--text-sm)] text-[var(--color-error)]">{t.checkout.failed}</p>
            <div className="mt-3">
              <Button block size="lg" onClick={onCreateFreshOrder}>
                {t.checkout.failedCta}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <Button block size="lg" iconRight={<ExternalLink size={16} />} onClick={openPay}>
                {t.checkout.payNow}
              </Button>
              <p className="mt-2 text-center text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {t.checkout.pricesLocked}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">
                <Spinner size={14} />
                {t.checkout.waiting}
              </span>
              <Button variant="ghost" size="sm" onClick={onIPaid}>
                {t.checkout.iPaid}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
