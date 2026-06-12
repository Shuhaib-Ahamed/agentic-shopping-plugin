import { Minus, Plus } from "lucide-react";
import { IconButton } from "@/components/atoms";
import { cn } from "@/lib/cn";

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  ariaLabel?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  ariaLabel = "Quantity",
  className,
}: QuantityStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full",
        "px-1 py-1",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <IconButton
        aria-label="Decrease quantity"
        size="sm"
        variant="ghost"
        icon={<Minus size={16} />}
        onClick={dec}
        disabled={value <= min}
      />
      <span
        className="min-w-[24px] text-center text-[var(--text-base)] font-semibold tabular"
        style={{ fontVariantNumeric: "tabular-nums" }}
        aria-live="polite"
      >
        {value}
      </span>
      <IconButton
        aria-label="Increase quantity"
        size="sm"
        variant="ghost"
        icon={<Plus size={16} />}
        onClick={inc}
        disabled={value >= max}
      />
    </div>
  );
}
