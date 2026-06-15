import type { Product } from "@kapruka/protocol";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { IconButton } from "@/components/atoms";
import { ProductCard } from "@/components/molecules";
import { fadeUpVariants, instant, staggerContainer } from "@/lib/motion";

export interface ProductCarouselProps {
  title?: string;
  items: Product[];
  onOpen?: (p: Product) => void;
  onAdd?: (p: Product) => void;
}

export function ProductCarousel({ title, items, onOpen, onAdd }: ProductCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const itemTransition = reduced ? instant : undefined;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  return (
    <motion.section
      variants={staggerContainer(0.06, 0.07)}
      initial="hidden"
      animate="visible"
      className="w-full"
      aria-label={title ?? "Products"}
    >
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        {title && (
          <motion.h3
            variants={fadeUpVariants}
            transition={itemTransition}
            className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </motion.h3>
        )}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <IconButton
            aria-label="Scroll left"
            size="sm"
            variant="secondary"
            icon={<ChevronLeft size={18} />}
            onClick={() => scrollBy(-1)}
          />
          <IconButton
            aria-label="Scroll right"
            size="sm"
            variant="secondary"
            icon={<ChevronRight size={18} />}
            onClick={() => scrollBy(1)}
          />
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-snap-x scroll-quiet p-8 md:px-6"
        style={{ scrollPaddingInline: 16 }}
      >
        {items.map((p, idx) => (
          <motion.div
            key={p.id}
            variants={fadeUpVariants}
            transition={itemTransition}
            className="scroll-snap-start shrink-0"
            style={{ width: 240 }}
          >
            <ProductCard product={p} onOpen={onOpen} onAdd={onAdd} emphasized={idx === 0} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
