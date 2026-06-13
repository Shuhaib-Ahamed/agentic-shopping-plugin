import { cn } from "@/lib/cn";

export function CurrencyCell({ usd, className }: { usd: number; className?: string }) {
  const isZero = usd === 0;
  return (
    <span
      className={cn(
        "tabular text-[13px]",
        isZero ? "text-[color:var(--color-console-faint)]" : "text-text",
        className,
      )}
    >
      ${usd.toFixed(usd < 1 ? 3 : 2)}
    </span>
  );
}
