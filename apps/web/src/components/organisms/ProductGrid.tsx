import type { Product } from "@kapruka/protocol";
import { motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/molecules";
import { fadeUpVariants, instant, staggerContainer } from "@/lib/motion";

export interface ProductGridProps {
  title?: string;
  items: Product[];
  onOpen?: (p: Product) => void;
  onAdd?: (p: Product) => void;
}

export function ProductGrid({ title, items, onOpen, onAdd }: ProductGridProps) {
  const reduced = useReducedMotion();
  const itemTransition = reduced ? instant : undefined;

  return (
    <motion.section
      variants={staggerContainer(0.06, 0.07)}
      initial="hidden"
      animate="visible"
      className="w-full px-4 md:px-6"
      aria-label={title ?? "Products"}
    >
      {title && (
        <motion.h3
          variants={fadeUpVariants}
          transition={itemTransition}
          className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </motion.h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {items.map((p) => (
          <motion.div key={p.id} variants={fadeUpVariants} transition={itemTransition}>
            <ProductCard product={p} onOpen={onOpen} onAdd={onAdd} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
