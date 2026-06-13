import { cn } from "@/lib/cn";

export type StatusTone = "ok" | "warn" | "err" | "mute";

const TONE: Record<StatusTone, string> = {
  ok: "bg-[color:var(--color-status-ok)]",
  warn: "bg-[color:var(--color-status-warn)]",
  err: "bg-[color:var(--color-status-err)]",
  mute: "bg-[color:var(--color-status-mute)]",
};

// 6px circle, paired with text label by callers (never color-alone signal).
export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", TONE[tone], className)}
    />
  );
}
