import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ComposerTrayProps {
  /** Whether the tray is open. When false, contents are unmounted. */
  open: boolean;
  /** Header title shown at the top of the tray. */
  title?: string;
  /** Called when the user clicks the close button or presses Esc. */
  onClose?: () => void;
  /** When true, the close button is hidden (e.g. for required forms). */
  hideClose?: boolean;
  /** Content. Rendered inside a scrollable area. */
  children?: ReactNode;
  className?: string;
}

const TRAY_SPRING = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 };

// Slide-up surface that sits directly above the composer. Replaces the
// old right-side panel + mobile bottom sheet — every contextual surface
// (delivery form, options, checkout, cart, success, error, etc.) now
// expands upward from the composer so the input stays at the same spot
// and the conversation stays in view above.
export function ComposerTray({
  open,
  title,
  onClose,
  hideClose,
  children,
  className,
}: ComposerTrayProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="composer-tray"
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.985 }}
          transition={TRAY_SPRING}
          className={cn(
            "relative w-full max-w-[760px] mx-auto px-4 md:px-8 pb-2",
            className,
          )}
        >
          <div
            role="dialog"
            aria-label={title}
            className={cn(
              "relative flex flex-col rounded-[22px] overflow-hidden bg-white",
              "shadow-[var(--shadow-lg)]",
              "border border-[color:var(--color-border)]",
              /* Keep the tray comfortably below half the viewport so the
                 conversation stays partially visible above it. */
              "max-h-[min(62dvh,560px)]",
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
