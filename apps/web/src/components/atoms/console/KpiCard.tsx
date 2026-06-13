import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: ReactNode;
  hint?: string;
  sparkline?: ReactNode;
  className?: string;
}

export function KpiCard({ label, value, delta, hint, sparkline, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5",
        "transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">{label}</p>
        {delta}
      </div>
      <p
        className="mt-2 font-display font-bold text-[34px] leading-[1.05] tracking-[-0.025em] tabular text-text"
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
      {sparkline ? <div className="mt-3 h-10 -mx-1">{sparkline}</div> : null}
    </div>
  );
}
