import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DeltaChipProps {
  value: number;
  format: "pct" | "absolute" | "ppt" | "ms" | "usd";
  invert?: boolean;
  className?: string;
}

// Semantic color: positive deltas are good by default; pass invert for metrics
// where smaller is better (error rate, latency).
export function DeltaChip({ value, format, invert = false, className }: DeltaChipProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const positive = direction === "up" ? !invert : direction === "down" ? invert : null;
  const tone =
    positive === null
      ? "text-[color:var(--color-status-mute)] bg-[color:var(--color-console-sunken)]"
      : positive
        ? "text-[color:var(--color-status-ok)] bg-[color:var(--color-success-bg)]"
        : "text-[color:var(--color-status-err)] bg-[color:var(--color-error-bg)]";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 h-5 text-[11px] font-semibold tabular",
        tone,
        className,
      )}
    >
      <Icon size={12} aria-hidden />
      {formatValue(value, format)}
    </span>
  );
}

function formatValue(v: number, format: DeltaChipProps["format"]): string {
  const abs = Math.abs(v);
  switch (format) {
    case "pct":
      return `${(abs * 100).toFixed(1)}%`;
    case "ppt":
      return `${(abs * 100).toFixed(1)} pp`;
    case "ms":
      return `${Math.round(abs)} ms`;
    case "usd":
      return `$${abs.toFixed(2)}`;
    case "absolute":
    default:
      return abs.toLocaleString();
  }
}
