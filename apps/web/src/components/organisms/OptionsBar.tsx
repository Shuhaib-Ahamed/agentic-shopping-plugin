import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import type { OptionsEvent } from "@kapruka/protocol";
import * as Icons from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";

export interface OptionsBarProps {
  options: OptionsEvent | null;
  onSelect: (value: string) => void;
  onDismiss: () => void;
  className?: string;
}

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

function resolveIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime lookup against the icon registry
  const found = (Icons as any)[name] as LucideIcon | undefined;
  return found ?? null;
}

// Floating quick-reply bar that pops out above the composer. Mounts when the
// agent calls present_options. Each chip is tap-to-send: clicking sends the
// option's `value` as the next user message and dismisses the bar.
//
// Visuals: glass pod with soft lift, chip row that scrolls horizontally on
// mobile and wraps on desktop. Spring entry from below.
export function OptionsBar({ options, onSelect, onDismiss, className }: OptionsBarProps) {
  return (
    <AnimatePresence>
      {options && (
        <motion.div
          key={`options-${options.options.map((o) => o.value).join("|")}`}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.9 }}
          className={cn(
            "relative w-full max-w-[760px] mx-auto px-3 sm:px-4 md:px-8 pb-2",
            className,
          )}
        >
          <div
            className={cn(
              "relative rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)]",
              "bg-white/95 border border-border",
              "backdrop-blur-xl",
              "shadow-[var(--shadow-lg)]",
              "px-2.5 pt-2.5 pb-2.5 sm:px-3 sm:pt-3 sm:pb-3 md:px-4 md:pt-3.5 md:pb-3.5",
            )}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  aria-hidden
                  className="grid place-items-center w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-text)",
                  }}
                >
                  <Sparkles size={11} strokeWidth={2.4} />
                </span>
                <span
                  className={cn(
                    "text-[var(--text-sm)] font-semibold text-primary",
                    "leading-snug line-clamp-2 break-words min-w-0",
                  )}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {options.prompt ?? "Pick one to continue"}
                </span>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss options"
                className={cn(
                  "shrink-0 grid place-items-center h-7 w-7 rounded-full cursor-pointer",
                  "text-muted hover:text-primary hover:bg-[color:var(--color-surface-warm)]",
                  "transition-colors duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
                )}
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>

            <div
              className={cn(
                options.layout === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
                  : "flex flex-wrap gap-1.5 sm:gap-2",
              )}
            >
              {options.options.map((opt, idx) => {
                const Icon = resolveIcon(opt.icon);
                return (
                  <motion.button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => onSelect(opt.value)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + idx * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "group inline-flex items-center gap-1.5 sm:gap-2 min-h-[40px] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full",
                      "bg-[color:var(--color-surface-warm)] hover:bg-white",
                      "border border-border hover:border-[color:var(--color-cta)]",
                      "text-[var(--text-xs)] sm:text-[var(--text-sm)] font-semibold text-primary",
                      "cursor-pointer select-none whitespace-normal text-pretty",
                      "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
                      "hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-6px_rgba(74,46,130,0.25)]",
                      "active:translate-y-0",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
                      options.layout === "grid" && "justify-start",
                    )}
                  >
                    {opt.emoji ? (
                      <span aria-hidden className="text-base leading-none shrink-0">
                        {opt.emoji}
                      </span>
                    ) : Icon ? (
                      <Icon
                        size={14}
                        strokeWidth={2.2}
                        className="shrink-0 text-[color:var(--color-cta-deep)]"
                      />
                    ) : null}
                    <span className="leading-snug text-left">{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
