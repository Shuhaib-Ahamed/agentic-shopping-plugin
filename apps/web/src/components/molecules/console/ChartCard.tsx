import { type ReactNode } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { JunoMark } from "@/components/atoms/JunoMark";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/cn";

export type ChartState = "loading" | "ready" | "empty" | "error";

export interface ChartCardProps {
  title: string;
  unit: string;
  state: ChartState;
  children?: ReactNode;
  legend?: ReactNode;
  height?: number;
  onRetry?: () => void;
  onResetFilters?: () => void;
  className?: string;
}

// Single source of chart truth. Every chart in the console wraps in this card
// so loading/empty/error states are uniform and titles + units are mandatory.
export function ChartCard({
  title,
  unit,
  state,
  children,
  legend,
  height = 240,
  onRetry,
  onResetFilters,
  className,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] text-text">{title}</h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">{unit}</p>
        </div>
        {legend ? <div className="flex items-center gap-2 flex-wrap">{legend}</div> : null}
      </header>
      <div style={{ height }} className="relative">
        {state === "loading" ? <LoadingState /> : null}
        {state === "empty" ? <EmptyState onResetFilters={onResetFilters} /> : null}
        {state === "error" ? <ErrorState onRetry={onRetry} /> : null}
        {state === "ready" ? children : null}
      </div>
    </section>
  );
}

export function LegendChip({
  color,
  label,
  pattern = "solid",
}: {
  color: string;
  label: string;
  pattern?: "solid" | "dashed";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <span
        aria-hidden
        className="inline-block w-6 h-1.5 rounded-sm"
        style={{
          background:
            pattern === "dashed"
              ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)`
              : color,
        }}
      />
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="absolute inset-0 grid place-items-center text-muted">
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        <span className="text-[12px]">Loading</span>
      </div>
    </div>
  );
}

function EmptyState({ onResetFilters }: { onResetFilters?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center text-center">
      <div className="flex flex-col items-center gap-3 max-w-[280px]">
        <div className="opacity-25">
          <JunoMark size={64} />
        </div>
        <p className="text-[13px] text-muted">
          No turns matched these filters in the selected range.
        </p>
        {onResetFilters ? (
          <Button variant="secondary" size="sm" onClick={onResetFilters}>
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center text-center">
      <div className="flex flex-col items-center gap-3 max-w-[280px]">
        <AlertTriangle size={24} className="text-[color:var(--color-status-err)]" aria-hidden />
        <p className="text-[13px] text-text">Could not load this chart.</p>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry} iconLeft={<RefreshCw size={14} />}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
