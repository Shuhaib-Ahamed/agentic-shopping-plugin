import type { Product, ProductDetailEvent, Variant } from "@kapruka/protocol";
import { ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Button, Price } from "@/components/atoms";
import { pickStrings } from "@/i18n";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store";
import { useFlyToCart } from "./FlyToCart";

export interface ProductDetailInlineProps {
  detail: ProductDetailEvent;
  onAdd: (product: Product, variant?: Variant) => void;
}

// In-chat product detail card. Same content as the dialog version (gallery,
// title, price, variants, add-to-cart, kapruka link) but sized to sit inside
// the message column so the assistant can keep talking around it and pair it
// with related-product carousels or quick-reply chips.
export function ProductDetailInline({ detail, onAdd }: ProductDetailInlineProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const { product, variants = [], images } = detail;
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const variant = activeVariant ? variants.find((v) => v.id === activeVariant) : variants[0];

  const { flyToCart } = useFlyToCart();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const handleAdd = () => {
    flyToCart(imageRef.current, images[activeImage] ?? product.image);
    onAdd(product, variant);
  };

  return (
    <article
      className={cn(
        "rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]",
        "shadow-[var(--shadow-sm)] overflow-hidden",
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-0">
        <div className="p-3 sm:p-4">
          <div
            className="relative rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-warm)]"
            style={{ aspectRatio: "1 / 1" }}
          >
            {images[activeImage] ? (
              <img
                ref={imageRef}
                src={images[activeImage]}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[var(--text-sm)]">
                {product.title}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto scroll-quiet">
              {images.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  aria-label={`Show image ${idx + 1}`}
                  className={cn(
                    "shrink-0 w-12 h-12 rounded-[var(--radius-sm)] overflow-hidden border-2 cursor-pointer transition-colors",
                    idx === activeImage ? "border-[var(--color-cta)]" : "border-transparent",
                  )}
                >
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 sm:py-5 sm:pr-5 sm:pl-1 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <h3
              className="flex-1 text-[var(--text-lg)] sm:text-[var(--text-xl)] font-bold text-[var(--color-primary)] text-pretty leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {product.title}
            </h3>
            {!product.inStock && <Badge tone="out">{t.products.soldOut}</Badge>}
          </div>

          <div className="flex items-baseline gap-3">
            <Price money={product.price} size="lg" />
            {product.inStock && <Badge tone="stock">{t.products.inStock}</Badge>}
          </div>

          {variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const selected = (variant?.id ?? variants[0]?.id) === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVariant(v.id)}
                    disabled={!v.inStock}
                    className={cn(
                      "min-h-[36px] px-3 rounded-full border text-[var(--text-sm)] font-medium cursor-pointer",
                      "transition-colors duration-150",
                      selected
                        ? "border-[var(--color-cta)] text-[var(--color-cta-hover)] bg-[var(--color-surface)]"
                        : "border-[var(--color-border)] text-[var(--color-text)] bg-[var(--color-surface)]",
                      !v.inStock && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <Button
              variant="primary"
              size="md"
              block
              onClick={handleAdd}
              disabled={!product.inStock}
            >
              {t.products.addedToCart}
            </Button>
            {product.url && (
              <Button
                variant="secondary"
                size="md"
                iconRight={<ExternalLink size={14} />}
                onClick={() => window.open(product.url, "_blank", "noopener,noreferrer")}
              >
                {t.products.openOnKapruka}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
