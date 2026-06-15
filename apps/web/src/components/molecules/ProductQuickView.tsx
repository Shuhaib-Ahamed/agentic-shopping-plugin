import type { Product } from "@kapruka/protocol";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Plus, Star, X } from "lucide-react";
import { useRef } from "react";
import { useFlyToCart } from "@/components/organisms/FlyToCart";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Product) => void;
}

// Local quick-view modal. Uses the same Product object the card already has
// - no API roundtrip. For the full product detail (variants, gallery,
// description), shoppers tap "View on Kapruka" which opens the source page.
export function ProductQuickView({ product, open, onOpenChange, onAdd }: ProductQuickViewProps) {
  const { flyToCart } = useFlyToCart();
  const imageRef = useRef<HTMLImageElement | null>(null);

  if (!product) return null;

  const promo = derivePromo(product);
  const showCompare =
    product.compareAtPrice && product.compareAtPrice.amount > product.price.amount;

  const handleAdd = () => {
    flyToCart(imageRef.current, product.image);
    onAdd(product);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40",
            "bg-[rgba(15,15,24,0.45)] backdrop-blur-md",
            "data-[state=open]:animate-[dialog-fade-in_200ms_ease-out]",
            "data-[state=closed]:animate-[dialog-fade-out_140ms_ease-in]",
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-[min(94vw,560px)] max-h-[92vh] overflow-y-auto scroll-quiet",
            "bg-white rounded-[22px] shadow-[var(--shadow-xl)]",
            "data-[state=open]:animate-[dialog-pop-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]",
            "data-[state=closed]:animate-[dialog-pop-out_160ms_ease-in_both]",
          )}
        >
          {/* Close button - floats over the lavender pane. */}
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className={cn(
                "absolute right-3 top-3 z-10 grid place-items-center w-9 h-9 rounded-full cursor-pointer",
                "bg-white/85 text-[color:var(--color-cta-deep)] backdrop-blur-sm",
                "hover:bg-white transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
              )}
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </Dialog.Close>

          {/* Lavender image pane - mirrors the card so the transition reads as
              an expansion of the card, not a wholly new surface. The image
              fills the whole pane (object-cover) so it always feels like a
              proper hero shot, not a thumbnail floating in space. */}
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: "4 / 3",
              background: "var(--color-lavender)",
            }}
          >
            <Dialog.Title asChild>
              {/* Visually hidden - title is shown in the body below. */}
              <span className="sr-only">{product.title}</span>
            </Dialog.Title>

            {product.image ? (
              <img
                ref={imageRef}
                src={product.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span
                  className="text-center text-[var(--text-lg)] font-semibold text-balance"
                  style={{
                    color: "var(--color-cta-deep)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {product.title}
                </span>
              </div>
            )}

            {/* Soft bottom gradient so the badges stay readable when the image
                is busy at the top. */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(15,15,24,0.32), rgba(15,15,24,0))",
              }}
            />

            {promo && (
              <span
                className={cn(
                  "absolute top-4 left-4 z-10",
                  "inline-flex items-center px-3 py-1.5 rounded-full",
                  "text-[var(--text-2xs)] font-bold uppercase tracking-wide shadow-[var(--shadow-sm)]",
                )}
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text)",
                }}
              >
                {promo}
              </span>
            )}
            {!product.inStock && (
              <span className="absolute top-4 right-16 z-10 inline-flex items-center px-3 py-1.5 rounded-full text-[var(--text-2xs)] font-bold uppercase tracking-wide bg-white/95 text-[color:var(--color-text-muted)] backdrop-blur-sm shadow-[var(--shadow-sm)]">
                Sold out
              </span>
            )}
          </div>

          {/* Detail pane. */}
          <div className="p-5 md:p-6 flex flex-col gap-4">
            <h2
              className="text-[var(--text-lg)] md:text-[var(--text-xl)] font-semibold text-primary leading-snug text-balance"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {product.title}
            </h2>

            {/* Price row. */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className="tabular text-[var(--text-xl)] md:text-[var(--text-2xl)] font-bold"
                style={{
                  color: "var(--color-cta-deep)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMoney(product.price)}
              </span>
              {showCompare && product.compareAtPrice && (
                <span
                  className="tabular text-[var(--text-md)] font-medium line-through text-[color:var(--color-text-muted)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatMoney(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Quick facts row. */}
            <div className="flex items-center gap-3 flex-wrap text-[var(--text-sm)]">
              {product.rating != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[color:var(--color-surface-warm)] font-semibold text-primary">
                  <Star
                    size={13}
                    fill="currentColor"
                    className="text-[color:var(--color-accent)]"
                  />
                  <span className="tabular">{product.rating.toFixed(1)}</span>
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold",
                  product.inStock
                    ? "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]"
                    : "bg-[color:var(--color-error-bg)] text-[color:var(--color-error)]",
                )}
              >
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "currentColor",
                  }}
                />
                {product.inStock ? "In stock" : "Sold out"}
              </span>
            </div>

            {/* Action row - Add to cart (primary) + View on Kapruka link. */}
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!product.inStock}
                className={cn(
                  "inline-flex items-center justify-center gap-2 flex-1 px-5 py-3 rounded-full cursor-pointer",
                  "text-[var(--text-md)] font-bold",
                  "transition-[transform,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
                  "hover:-translate-y-0.5 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                )}
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text)",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                <Plus size={18} strokeWidth={3} />
                Add to cart
              </button>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-3 rounded-full",
                    "text-[var(--text-sm)] font-semibold",
                    "border border-[color:var(--color-border-strong)]",
                    "hover:bg-[color:var(--color-surface-warm)] transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
                  )}
                  style={{ color: "var(--color-cta)" }}
                >
                  <span>View</span>
                  <ExternalLink size={14} strokeWidth={2.4} />
                </a>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function derivePromo(product: Product): string | null {
  if (product.compareAtPrice && product.compareAtPrice.amount > product.price.amount) {
    const pct = Math.round((1 - product.price.amount / product.compareAtPrice.amount) * 100);
    if (pct > 0) return `${pct}% OFF`;
  }
  return product.badge ?? null;
}
