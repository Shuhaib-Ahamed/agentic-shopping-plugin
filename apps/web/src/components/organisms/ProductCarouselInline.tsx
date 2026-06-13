import type { Product } from "@kapruka/protocol";
import { ProductCard, ProductCardSkeleton, SingleProductCard } from "@/components/molecules";
import { cn } from "@/lib/cn";

export interface ProductCarouselInlineProps {
  title?: string;
  items: Product[];
  layout?: "carousel" | "grid";
  onOpen?: (p: Product) => void;
  onAdd?: (p: Product) => void;
  /** Show skeleton loading state instead of items. */
  loading?: boolean;
  className?: string;
}

// Renders inside the chat conversation column. Layout is CSS-driven via
// `grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr))`
// so 1 → full width (handled by SingleProductCard), 2 → side by side,
// 3+ → wraps to multiple rows. No JS branching on item count.
export function ProductCarouselInline({
  title,
  items,
  layout = "carousel",
  onOpen,
  onAdd,
  loading,
  className,
}: ProductCarouselInlineProps) {
  const skeletons = Array.from({ length: 4 });

  // Single-item shortcut: ProductCard's vertical aspect-ratio image gets huge
  // at full chat width. Swap to the horizontal SingleProductCard instead.
  const soloItem = !loading && items.length === 1 ? items[0] : undefined;
  if (soloItem) {
    return (
      <section
        className={cn(
          "w-full animate-[surface-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]",
          className,
        )}
        aria-label={title ?? "Product"}
      >
        {title && (
          <h3
            className="text-[var(--text-md)] font-semibold text-primary mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h3>
        )}
        <SingleProductCard product={soloItem} onOpen={onOpen} onAdd={onAdd} />
      </section>
    );
  }

  // Tighter minimum for the explicit "grid" layout - the AI uses this when
  // it expects many small thumbnails.
  const minCol = layout === "grid" ? "180px" : "240px";

  return (
    <section
      className={cn("w-full animate-[surface-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]", className)}
      aria-label={title ?? "Products"}
    >
      {title && (
        <h3
          className="text-[var(--text-md)] font-semibold text-primary mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      )}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minCol}), 1fr))`,
        }}
      >
        {(loading ? skeletons : items).map((p, idx) =>
          loading ? (
            <ProductCardSkeleton key={idx} />
          ) : (
            <div
              key={(p as Product).id}
              style={{
                animation: `surface-in 420ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 50}ms both`,
              }}
            >
              <ProductCard product={p as Product} onOpen={onOpen} onAdd={onAdd} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
