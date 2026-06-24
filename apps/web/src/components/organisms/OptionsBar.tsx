import type { OptionsEvent } from "@kapruka/protocol";
import { X, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import { fadeRiseVariants, instant, staggerContainer } from "@/lib/motion";

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

// Quick-reply chip bar. Visibility, max-width, horizontal padding, and entry
// motion are owned by the parent `ComposerStack`. This component only renders
// the card itself; staggered chip reveal stays internal so chips fan in even
// when the bar is reused.
export function OptionsBar({ options, onSelect, onDismiss, className }: OptionsBarProps) {
  const reduced = useReducedMotion();
  if (!options) return null;
  const itemTransition = reduced ? instant : undefined;

  return (
    <motion.div
      variants={staggerContainer(0.06, 0.05)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "relative rounded-[var(--radius-xl)]",
        "bg-white border border-border",
        "shadow-[var(--shadow-md)]",
        "px-3 pt-3 pb-3 md:px-4 md:pt-3.5 md:pb-3.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden
            className="grid place-items-center w-6 h-6 rounded-full shrink-0"
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
            : "flex flex-wrap gap-2",
        )}
      >
        {options.options.map((opt, idx) => {
          const Icon = resolveIcon(opt.icon);
          return (
            <motion.button
              key={`${opt.value}-${idx}`}
              type="button"
              onClick={() => onSelect(opt.value)}
              variants={fadeRiseVariants}
              transition={itemTransition}
              whileHover={reduced ? undefined : { y: -1 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className={cn(
                "group inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-full",
                "bg-[color:var(--color-surface-warm)] hover:bg-white",
                "border border-border hover:border-[color:var(--color-cta)]",
                "text-[var(--text-sm)] font-semibold text-primary",
                "cursor-pointer select-none whitespace-normal text-pretty",
                "transition-[background-color,border-color,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
                "hover:shadow-[0_6px_16px_-6px_rgba(74,46,130,0.25)]",
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
    </motion.div>
  );
}
