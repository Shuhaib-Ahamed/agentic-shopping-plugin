import type { CartLine } from "@kapruka/protocol";
import { X } from "lucide-react";
import { IconButton, Price } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { QuantityStepper } from "./QuantityStepper";

export interface CartLineItemProps {
  line: CartLine;
  onQtyChange?: (productId: string, qty: number) => void;
  onRemove?: (productId: string, variantId?: string) => void;
  className?: string;
}

export function CartLineItem({ line, onQtyChange, onRemove, className }: CartLineItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3 border-b border-[var(--color-border)] last:border-b-0",
        className,
      )}
    >
      <div
        className="relative shrink-0 rounded-[10px] overflow-hidden bg-[var(--color-lavender)]"
        style={{ width: 56, height: 56 }}
      >
        {line.image && (
          <img
            src={line.image}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            className="block w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-sm)] font-semibold leading-snug truncate" title={line.title}>
          {line.title}
        </p>
        {line.variantId && (
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{line.variantId}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          {onQtyChange ? (
            <QuantityStepper
              value={line.qty}
              onChange={(next) => onQtyChange(line.productId, next)}
            />
          ) : (
            <span className="text-[var(--text-sm)] text-[var(--color-text-muted)] tabular">
              x{line.qty}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Price money={{ ...line.price, amount: line.price.amount * line.qty }} size="sm" />
        {onRemove && (
          <IconButton
            aria-label={`Remove ${line.title} from cart`}
            size="sm"
            variant="ghost"
            icon={<X size={16} />}
            onClick={() => onRemove(line.productId, line.variantId)}
          />
        )}
      </div>
    </li>
  );
}
