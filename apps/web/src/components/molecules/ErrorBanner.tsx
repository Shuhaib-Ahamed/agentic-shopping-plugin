import { AlertCircle, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/cn";

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
        "relative w-full max-w-[760px] mx-auto px-4 md:px-8",
        "animate-[surface-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-[16px]",
          "border border-[color:var(--color-error)]/30",
          "shadow-[var(--shadow-sm)]",
        )}
        style={{
          background: "var(--color-error-bg)",
          color: "var(--color-error)",
        }}
      >
        <span
          aria-hidden
          className="grid place-items-center w-8 h-8 rounded-full shrink-0 mt-0.5"
          style={{ background: "rgba(220, 38, 38, 0.12)" }}
        >
          <AlertCircle size={16} strokeWidth={2.4} />
        </span>

        <div className="flex-1 min-w-0 pt-0.5">
          {code && (
            <p className="text-[var(--text-2xs)] font-bold uppercase tracking-[0.12em] opacity-80">
              {code}
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
    </div>
  );
}
