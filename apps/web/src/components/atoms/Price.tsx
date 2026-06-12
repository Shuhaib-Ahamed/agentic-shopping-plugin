import type { Money } from "@kapruka/protocol";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export interface PriceProps {
  money: Money;
  /** Size variant. Defaults to "md". */
  size?: "sm" | "md" | "lg" | "xl";
  /** Mute the color, useful for struck-through compare-at prices. */
  muted?: boolean;
  className?: string;
}

// Master rule: tabular numerals so digits do not jitter. Currency formatting lives
// in @/lib/format and only this component calls it.
export function Price({ money, size = "md", muted, className }: PriceProps) {
  const sizeClass =
    size === "xl"
      ? "text-[var(--text-xl)] font-bold"
      : size === "lg"
        ? "text-[var(--text-lg)] font-semibold"
        : size === "sm"
          ? "text-[var(--text-sm)] font-medium"
          : "text-[var(--text-base)] font-semibold";
  return (
    <span
      className={cn(
        "tabular",
        muted ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]",
        sizeClass,
        className,
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatMoney(money)}
    </span>
  );
}
