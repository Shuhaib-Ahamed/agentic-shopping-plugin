import type { CartLine, Money } from "@kapruka/protocol";
import { ShoppingBag, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, Price } from "@/components/atoms";
import { CartLineItem } from "@/components/molecules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { pickStrings } from "@/i18n";
import { instant, springs } from "@/lib/motion";
import { useAppStore } from "@/store";

export interface CartPanelProps {
  lines: CartLine[];
  subtotal: Money;
  onProceed: () => void;
}

export function CartPanel({ lines, subtotal, onProceed }: CartPanelProps) {
  const locale = useAppStore((s) => s.locale);
  const clearCart = useAppStore((s) => s.clearCart);
  const removeCartLine = useAppStore((s) => s.removeCartLine);
  const t = pickStrings(locale);
  const reduced = useReducedMotion();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const totalItems = lines.reduce((n, l) => n + l.qty, 0);

  if (lines.length === 0) {
    return (
      <section className="px-4 md:px-6 py-6">
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 text-center">
          <ShoppingBag size={28} className="mx-auto text-[var(--color-text-muted)]" />
          <p className="mt-3 text-[var(--color-text-muted)]">{t.cart.empty}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? instant : springs.sheet}
        className="px-4 md:px-6 py-4 md:py-6"
      >
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4 md:p-5">
          <header className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h3
                className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)] truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t.cart.title}
              </h3>
              <span className="text-[var(--text-sm)] text-[var(--color-text-muted)] tabular shrink-0">
                · {totalItems}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setClearConfirmOpen(true)}
              className="inline-flex items-center gap-1 text-[var(--text-xs)] font-semibold text-[var(--color-text-muted)] hover:text-[color:var(--color-error)] transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-error)] rounded px-1"
              aria-label="Clear cart"
            >
              <Trash2 size={12} strokeWidth={2.2} />
              Clear
            </button>
          </header>
          <ul className="divide-y divide-[var(--color-border)]">
            {lines.map((l) => (
              <CartLineItem
                key={l.productId + (l.variantId ?? "")}
                line={l}
                onRemove={removeCartLine}
              />
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
              {t.cart.subtotal}
            </span>
            <Price money={subtotal} size="lg" />
          </div>
          <div className="mt-4">
            <Button block size="lg" onClick={onProceed}>
              {t.cart.proceed}
            </Button>
          </div>
        </div>
      </motion.section>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every item from your cart. The conversation stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearCart();
                setClearConfirmOpen(false);
              }}
              className="bg-[color:var(--color-error)] hover:bg-[color:var(--color-error)] hover:opacity-90 text-white"
            >
              Empty cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
