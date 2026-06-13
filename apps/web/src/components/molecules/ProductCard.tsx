import type { Product } from "@kapruka/protocol";
import { Plus } from "lucide-react";
import { useRef } from "react";
import { useFlyToCart } from "@/components/organisms/FlyToCart";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export interface ProductCardProps {
  product: Product;
  onOpen?: (product: Product) => void;
  onAdd?: (product: Product) => void;
  className?: string;
  emphasized?: boolean;
}

// Approximate character budget for a 2-line title at our card width
// (240–320px) using the display font. Empirically tuned so titles like the
// 55-char "I Love You Slab With Caramel Lips 8 Pcs Sleeve Box" land at a
// clean 2-line break instead of leaking past the clamp.
const TITLE_CHAR_BUDGET = 46;

// Word-aware truncation. Tries to break at the last word boundary that
// fits inside the budget; falls back to a hard cut if no good break exists.
// Always appends a single ellipsis when truncation happens.
function truncateTitle(title: string, max = TITLE_CHAR_BUDGET): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;
  const window = trimmed.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(" ");
  // Only honour the word break if it's not absurdly short - otherwise
  // a single super-long word at the start could collapse the title to "...".
  const cut = lastSpace > Math.floor(max * 0.55) ? lastSpace : max;
  return `${trimmed.slice(0, cut).trimEnd()}…`;
}

// Two-pane product card. Top pane is a lavender canvas with a centered image
// and a yellow promo pill in the corner. Bottom pane is white and holds the
// title (JS-truncated + CSS clamp as a safety net), price + strikethrough,
// a Details link, and the yellow "+ Add" CTA.
export function ProductCard({ product, onOpen, onAdd, className, emphasized }: ProductCardProps) {
  // Compute % off when a compare-at price is present and higher than the
  // current price. Fall back to product.badge if MCP only sends a label.
  const promo = derivePromo(product);
  const displayTitle = truncateTitle(product.title);

  const { flyToCart } = useFlyToCart();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const handleAdd = () => {
    flyToCart(imageRef.current, product.image);
    onAdd?.(product);
  };

  return (
    <article
      className={cn(
        "group relative my-4 flex flex-col rounded-[22px] overflow-hidden bg-white",
        "shadow-[var(--shadow-md)]",
        "transition-[transform,box-shadow] duration-300 ease-[var(--easing-emphasized)]",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
        emphasized && "ring-1 ring-[color:var(--color-cta)]",
        className,
      )}
    >
      {/* Top pane - lavender canvas with the product image centered. */}
      <div
        className="relative flex items-center justify-center"
        style={{
          aspectRatio: "1 / 1",
          background: "var(--color-lavender)",
        }}
      >
        {/* Promo pill - yellow, top-left. */}
        {promo && (
          <span
            className={cn(
              "absolute top-3 left-3 z-10",
              "inline-flex items-center px-2.5 py-1 rounded-full",
              "text-[var(--text-2xs)] font-bold uppercase tracking-wide",
            )}
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-cta-deep)",
            }}
          >
            {promo}
          </span>
        )}

        {/* Out-of-stock badge - top-right when applicable. */}
        {!product.inStock && (
          <span className="absolute top-3 right-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full text-[var(--text-2xs)] font-bold uppercase tracking-wide bg-white/85 text-[color:var(--color-text-muted)] backdrop-blur-sm">
            Sold out
          </span>
        )}

        {product.image ? (
          <img
            ref={imageRef}
            src={product.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="max-w-[100%] max-h-[100%] object-contain transition-transform duration-500 ease-[var(--easing-emphasized)] group-hover:scale-[1.04]"
          />
        ) : (
          <span
            className="px-4 text-center text-[var(--text-md)] font-semibold leading-tight text-balance"
            style={{ color: "var(--color-cta-deep)", fontFamily: "var(--font-display)" }}
          >
            {product.title}
          </span>
        )}
      </div>

      {/* Bottom pane - white, holds title, price, and actions. */}
      <div className="p-4 md:p-5 flex flex-col gap-3">
        <h3
          className={cn(
            "text-[var(--text-md)] md:text-[var(--text-lg)] font-semibold text-primary leading-snug",
            "line-clamp-2 overflow-hidden break-words",
          )}
          /* Reserve space so cards align even when titles are 1 line. */
          style={{ minHeight: "2.6em" }}
          /* Full untruncated title surfaces via native tooltip / a11y name. */
          title={product.title}
          aria-label={product.title}
        >
          {displayTitle}
        </h3>

        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span
            className="tabular text-[var(--text-lg)] md:text-[var(--text-xl)] font-bold"
            style={{
              color: "var(--color-cta-deep)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMoney(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice.amount > product.price.amount && (
            <span
              className="tabular text-[var(--text-sm)] font-medium line-through text-[color:var(--color-text-muted)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-1">
          <button
            type="button"
            onClick={() => onOpen?.(product)}
            className={cn(
              "text-[var(--text-sm)] font-semibold cursor-pointer",
              "px-1 py-1 -mx-1 rounded",
              "transition-colors duration-150",
              "hover:underline",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
            )}
            style={{ color: "var(--color-cta)" }}
          >
            Details
          </button>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.inStock}
            aria-label={`Add ${product.title} to cart`}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full cursor-pointer",
              "text-[var(--text-sm)] font-bold",
              "transition-[transform,background-color,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
              "hover:-translate-y-0.5",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            style={{
              background: "var(--color-accent)",
              color: "var(--color-text)",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            <Plus size={16} strokeWidth={3} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

// Derive the promo pill label. Prefers a real "X% OFF" from compareAtPrice;
// otherwise renders product.badge verbatim.
function derivePromo(product: Product): string | null {
  if (product.compareAtPrice && product.compareAtPrice.amount > product.price.amount) {
    const pct = Math.round((1 - product.price.amount / product.compareAtPrice.amount) * 100);
    if (pct > 0) return `${pct}% OFF`;
  }
  return product.badge ?? null;
}
