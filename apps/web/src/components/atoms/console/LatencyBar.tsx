import { cn } from "@/lib/cn";

export interface LatencyBarProps {
  durationMs: number;
  scaleMs: number;
  kind?: "model" | "mcp" | "ui" | "error";
  className?: string;
}

const COLOR: Record<NonNullable<LatencyBarProps["kind"]>, string> = {
  model: "var(--color-span-model)",
  mcp: "var(--color-span-mcp)",
  ui: "var(--color-span-ui)",
  error: "var(--color-span-error)",
};

// Tiny horizontal bar; width is fraction of scaleMs, max 100%.
export function LatencyBar({
  durationMs,
  scaleMs,
  kind = "model",
  className,
}: LatencyBarProps) {
  const pct = Math.max(2, Math.min(100, (durationMs / Math.max(1, scaleMs)) * 100));
  return (
    <span
      role="img"
      aria-label={`${Math.round(durationMs)} milliseconds`}
      className={cn(
        "inline-block h-1.5 rounded-full",
        "bg-[color:var(--color-console-grid)]",
        className,
      )}
      style={{ width: "100%" }}
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${pct}%`, background: COLOR[kind] }}
      />
    </span>
  );
}
