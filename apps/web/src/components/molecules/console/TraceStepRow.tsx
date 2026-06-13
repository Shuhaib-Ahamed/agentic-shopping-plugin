import type { StepRecord } from "@kapruka/protocol";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CurrencyCell, LatencyBar, ModelPill } from "@/components/atoms/console";
import { cn } from "@/lib/cn";

export interface TraceStepRowProps {
  step: StepRecord;
  scaleMs: number;
  children?: ReactNode;
  defaultOpen?: boolean;
}

export function TraceStepRow({ step, scaleMs, children, defaultOpen = false }: TraceStepRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-console-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left grid grid-cols-[24px_56px_minmax(0,1fr)_120px_72px_92px_20px] items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[color:var(--color-console-sunken)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-[11px] font-mono text-muted tabular">{step.index + 1}</span>
        <ModelPill model={step.model} />
        <span className="min-w-0 text-[12px] text-muted truncate">
          {step.toolCalls.length === 0
            ? `finish: ${step.finishReason}`
            : step.toolCalls.map((tc) => tc.name).join(" · ")}
        </span>
        <span className="block w-full">
          <LatencyBar durationMs={step.latency.totalMs} scaleMs={scaleMs} kind="model" />
        </span>
        <span className="text-[12px] tabular text-muted text-right">
          {step.latency.totalMs.toFixed(0)} ms
        </span>
        <span className="text-right">
          <CurrencyCell usd={step.cost.total} />
        </span>
        <ChevronRight
          size={14}
          className={cn("text-muted transition-transform duration-150", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-[color:var(--color-border)] p-3 bg-[color:var(--color-console-sunken)]/60">
          {children}
        </div>
      ) : null}
    </div>
  );
}
