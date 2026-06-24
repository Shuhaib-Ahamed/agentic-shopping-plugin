import type { Product } from "@kapruka/protocol";
import { motion, useReducedMotion } from "motion/react";
import { ProductCard, ProductCardSkeleton, SingleProductCard } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { fadeUpVariants, instant, springs, staggerContainer } from "@/lib/motion";

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
  const reduced = useReducedMotion();
  const itemTransition = reduced ? instant : undefined;

  // Single-item shortcut: ProductCard's vertical aspect-ratio image gets huge
  // at full chat width. Swap to the horizontal SingleProductCard instead.
  const soloItem = !loading && items.length === 1 ? items[0] : undefined;
  if (soloItem) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? instant : springs.gentle}
        className={cn("w-full", className)}
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
      </motion.section>
    );
  }

  // Tighter minimum for the explicit "grid" layout - the AI uses this when
  // it expects many small thumbnails.
  const minCol = layout === "grid" ? "180px" : "240px";

  return (
    <motion.section
      variants={staggerContainer(0.06, 0.07)}
      initial="hidden"
      animate="visible"
      className={cn("w-full", className)}
      aria-label={title ?? "Products"}
    >
      {title && (
        <motion.h3
          variants={fadeUpVariants}
          transition={itemTransition}
          className="text-[var(--text-md)] font-semibold text-primary mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </motion.h3>
      )}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minCol}), 1fr))`,
        }}
      >
        {(loading ? skeletons : items).map((p, idx) =>
          loading ? (
            <motion.div key={idx} variants={fadeUpVariants} transition={itemTransition}>
              <ProductCardSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key={(p as Product).id}
              variants={fadeUpVariants}
              transition={itemTransition}
            >
              <ProductCard product={p as Product} onOpen={onOpen} onAdd={onAdd} />
            </motion.div>
          ),
        )}
      </div>
    </motion.section>
  );
}
