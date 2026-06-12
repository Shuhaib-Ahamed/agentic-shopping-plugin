import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCountdown } from "@/lib/format";

export interface CountdownPillProps {
  /** ISO timestamp of expiry. */
  expiresAt: string;
  /** Fired once when the timer reaches zero. */
  onExpire?: () => void;
  /** Label override; otherwise just the time. */
  label?: string;
  className?: string;
}

// Ticks every 1s. Color shifts to warn under 5min, error under 1min.
// Tabular-nums so digits do not jitter.
export function CountdownPill({ expiresAt, onExpire, label, className }: CountdownPillProps) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setMsLeft(next);
      if (next <= 0) {
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  const warn = msLeft <= 5 * 60 * 1000;
  const danger = msLeft <= 60 * 1000;

  return (
    <span
      role="timer"
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border tabular",
        "text-[var(--text-sm)] font-medium",
        !warn &&
          "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]",
        warn &&
          !danger &&
          "bg-[color:var(--color-warn-bg)] text-[var(--color-warn)] border-[var(--color-warn)]",
        danger && "bg-[color:var(--color-warn-bg)] text-[var(--color-error)] border-[var(--color-error)]",
        className,
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <Clock
        size={14}
        className={cn(warn && !danger && "animate-pulse", danger && "animate-pulse")}
      />
      <span>{label ?? formatCountdown(msLeft)}</span>
    </span>
  );
}
