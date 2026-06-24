import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "ref" | "children" | "type">;

export interface SuggestionChipProps extends MotionButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  emphasized?: boolean;
}

// Pill with hover lift and a soft teal halo. No fixed width. Hover + press
// run through the tap spring so the chip feels tactile, not stiff.
export const SuggestionChip = forwardRef<HTMLButtonElement, SuggestionChipProps>(
  function SuggestionChip({ icon, children, emphasized, className, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        type="button"
        whileHover={reduced ? undefined : { y: -1 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        transition={springs.tap}
        className={cn(
          "inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-full",
          "text-[var(--text-sm)] font-medium leading-snug",
          "cursor-pointer select-none whitespace-normal text-pretty",
          "transition-[background-color,box-shadow,border-color] duration-300 ease-[var(--easing-emphasized)]",
          "border",
          emphasized
            ? "glass-strong border-white/60 text-text"
            : "bg-white/80 border-border text-text hover:bg-white",
          "hover:border-[color:var(--color-cta)] hover:shadow-[var(--shadow-glow-cta)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
          className,
        )}
        {...rest}
      >
        {icon && <span className="shrink-0 text-cta">{icon}</span>}
        <span>{children}</span>
      </motion.button>
    );
  },
);
