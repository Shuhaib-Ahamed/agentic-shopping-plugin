import type { Product } from "@kapruka/protocol";
import { ProductCard } from "@/components/molecules";

export interface ProductGridProps {
  title?: string;
  items: Product[];
  onOpen?: (p: Product) => void;
  onAdd?: (p: Product) => void;
}

export function ProductGrid({ title, items, onOpen, onAdd }: ProductGridProps) {
  return (
    <section
      className="w-full px-4 md:px-6 animate-[surface-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]"
      aria-label={title ?? "Products"}
    >
      {title && (
        <h3
          className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} onOpen={onOpen} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
