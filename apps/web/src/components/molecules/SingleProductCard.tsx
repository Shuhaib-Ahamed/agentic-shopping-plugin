import type { Product } from "@kapruka/protocol";
import { Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { useFlyToCart } from "@/components/organisms/FlyToCart";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { springs } from "@/lib/motion";

export interface SingleProductCardProps {
  product: Product;
  onOpen?: (product: Product) => void;
  onAdd?: (product: Product) => void;
  className?: string;
}

// Horizontal full-width product card. Used when a `present_products` event
// returns a single item - a slider would feel silly with one slide, so the
// card stretches to the chat column and the image sits beside the details
// instead of stacking on top of them.
export function SingleProductCard({ product, onOpen, onAdd, className }: SingleProductCardProps) {
  const promo = derivePromo(product);

  const { flyToCart } = useFlyToCart();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const reduced = useReducedMotion();
  const handleAdd = () => {
    flyToCart(imageRef.current, product.image);
    onAdd?.(product);
  };

  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -2, scale: 1.003 }}
      whileTap={reduced ? undefined : { scale: 0.995 }}
      transition={springs.snappy}
      className={cn(
        "group relative flex flex-col sm:flex-row overflow-hidden rounded-[var(--radius-xl)] bg-white",
        "shadow-[var(--shadow-md)]",
        "hover:shadow-[var(--shadow-lg)]",
        "transition-shadow duration-300 ease-[var(--easing-emphasized)]",
        className,
      )}
    >
      <div
        className="relative flex items-center justify-center shrink-0 sm:w-[42%]"
        style={{
          aspectRatio: "1 / 1",
          background: "var(--color-lavender)",
        }}
      >
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

      <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col gap-3 justify-center">
        <h3
          className="text-[var(--text-lg)] sm:text-[var(--text-xl)] font-semibold text-primary leading-snug text-pretty"
          title={product.title}
        >
          {product.title}
        </h3>

        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span
            className="tabular text-[var(--text-xl)] sm:text-[var(--text-2xl)] font-bold"
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

        <div className="flex items-center gap-3 mt-1">
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
              "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full cursor-pointer ml-auto",
              "text-[var(--text-sm)] font-bold",
              "transition-[transform,background-color,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
              "hover:-translate-y-0.5 active:scale-95",
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
            Add to cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function derivePromo(product: Product): string | null {
  if (product.compareAtPrice && product.compareAtPrice.amount > product.price.amount) {
    const pct = Math.round((1 - product.price.amount / product.compareAtPrice.amount) * 100);
    if (pct > 0) return `${pct}% OFF`;
  }
  return product.badge ?? null;
}
