import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ComposerTrayProps {
  /** Whether the tray is open. When false, nothing is rendered. */
  open: boolean;
  /** Header title shown at the top of the tray. */
  title?: string;
  /** Called when the user clicks the close button. */
  onClose?: () => void;
  /** When true, the close button is hidden (e.g. for required forms). */
  hideClose?: boolean;
  /** Content. Rendered inside a scrollable area. */
  children?: ReactNode;
  className?: string;
}

// Slide-up tray that sits directly above the composer. Visibility, max-width,
// horizontal padding and entry/exit motion are now owned by the parent
// `ComposerStack` - this component only renders the card itself.
export function ComposerTray({
  open,
  title,
  onClose,
  hideClose,
  children,
  className,
}: ComposerTrayProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label={title}
      className={cn(
        "relative flex flex-col overflow-hidden",
        "rounded-[var(--radius-xl)] bg-white",
        "shadow-[var(--shadow-lg)] border border-[color:var(--color-border)]",
        // Keep the tray comfortably below half the viewport so the
        // conversation stays partially visible above it.
        "max-h-[min(62dvh,560px)]",
        className,
      )}
    >
      {(title || (!hideClose && onClose)) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[color:var(--color-border)] shrink-0">
          {title ? (
            <h2
              className="text-[var(--text-md)] font-bold text-primary truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {!hideClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "grid place-items-center w-8 h-8 rounded-full shrink-0 cursor-pointer",
                "text-[color:var(--color-text-muted)]",
                "hover:bg-[color:var(--color-surface-warm)] hover:text-primary",
                "transition-[background-color,color] duration-150",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
              )}
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          )}
        </header>
      )}
      <div className="flex-1 overflow-y-auto scroll-quiet">{children}</div>
    </div>
  );
}
