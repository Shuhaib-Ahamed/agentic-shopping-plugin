import { AlertCircle, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/cn";

// "tools_failed" / "router_failed" / "rate_limited" → "Tools failed".
// Sentence case, no shouting, no underscores. Devs still see the raw code in
// logs; the shopper only ever reads the humanized version.
function humanizeCode(code: string): string {
  const spaced = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!spaced) return code;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface ErrorBannerProps {
  message: string;
  /** Optional short label (e.g. error code) shown as a small header. */
  code?: string;
  recoverable?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  className?: string;
}

// Inline error banner. Sits directly above the composer so the shopper sees
// what went wrong without losing their place in the conversation. Recoverable
// errors get a circular retry icon button on the right; non-recoverable
// errors only get a dismiss "×".
export function ErrorBanner({
  message,
  code,
  recoverable = false,
  onRetry,
  onDismiss,
  retryLabel = "Retry",
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        // Visibility, max-width, horizontal padding, and entry motion are
        // owned by the parent `ComposerStack`. This is just the card itself.
        "flex items-start gap-3 px-4 py-3 rounded-[var(--radius-xl)]",
        "border border-[color:var(--color-error)]/30",
        "shadow-[var(--shadow-md)]",
        className,
      )}
      style={{
        background: "var(--color-error-bg)",
        color: "var(--color-error)",
      }}
    >
      <span
        aria-hidden
        className="grid place-items-center w-8 h-8 rounded-full shrink-0 mt-0.5"
        style={{ background: "color-mix(in oklab, var(--color-error) 12%, transparent)" }}
      >
        <AlertCircle size={16} strokeWidth={2.4} />
      </span>

      <div className="flex-1 min-w-0 pt-0.5">
        {code && (
          <p className="text-[var(--text-2xs)] font-semibold opacity-70 leading-snug">
            {humanizeCode(code)}
          </p>
        )}
        <p
          className="text-[var(--text-sm)] leading-snug text-pretty break-words"
          style={{ color: "var(--color-error)" }}
        >
          {message}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {recoverable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={retryLabel}
            title={retryLabel}
            className={cn(
              "grid place-items-center w-9 h-9 rounded-full cursor-pointer",
              "bg-white/60 hover:bg-white",
              "transition-[background-color,transform] duration-200",
              "active:scale-95",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error",
            )}
            style={{ color: "var(--color-error)" }}
          >
            <RotateCw size={16} strokeWidth={2.4} />
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={cn(
              "grid place-items-center w-9 h-9 rounded-full cursor-pointer",
              "hover:bg-white/60",
              "transition-[background-color,transform] duration-200",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error",
            )}
            style={{ color: "var(--color-error)" }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  );
}
