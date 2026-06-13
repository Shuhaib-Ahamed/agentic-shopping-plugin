import type { ToolCallRecord } from "@kapruka/protocol";
import { Wrench, Tv } from "lucide-react";
import { StatusDot } from "@/components/atoms/console";
import { cn } from "@/lib/cn";

export function ToolCallRow({ tc }: { tc: ToolCallRecord }) {
  const Icon = tc.kind === "ui" ? Tv : Wrench;
  const ok = !tc.error;
  return (
    <div
      className={cn(
        "grid grid-cols-[18px_minmax(140px,180px)_minmax(0,1fr)_84px_72px] items-start gap-3 py-2",
        "border-b border-[color:var(--color-border)] last:border-b-0",
      )}
    >
      <Icon
        size={14}
        className={cn(
          tc.kind === "ui"
            ? "text-[color:var(--color-span-ui)]"
            : "text-[color:var(--color-span-mcp)]",
          "mt-0.5",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-mono text-[12px] text-text truncate">{tc.name}</p>
        <p className="text-[11px] text-muted truncate">{tc.argsSummary}</p>
      </div>
      <p className="text-[12px] text-muted">
        {tc.resultSummary ?? (tc.error ? tc.error.message : "-")}
      </p>
      <span className="text-[12px] tabular text-muted text-right">
        {tc.latencyMs.toFixed(0)} ms
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-muted justify-end">
        <StatusDot tone={ok ? "ok" : "err"} />
        {ok ? (tc.cacheHit ? "cache hit" : "ok") : "error"}
      </span>
    </div>
  );
}
