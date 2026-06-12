import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SuggestionChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  children: ReactNode;
  emphasized?: boolean;
}

// Pill with hover lift and a soft teal halo. No fixed width.
export const SuggestionChip = forwardRef<HTMLButtonElement, SuggestionChipProps>(
  function SuggestionChip({ icon, children, emphasized, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-full",
          "text-[var(--text-sm)] font-medium leading-snug",
          "cursor-pointer select-none whitespace-normal text-pretty",
          "transition-[transform,background-color,box-shadow,border-color] duration-300 ease-[var(--easing-emphasized)]",
          "border",
          emphasized
            ? "glass-strong border-white/60 text-text"
            : "bg-white/80 border-border text-text hover:bg-white",
          "hover:-translate-y-px hover:border-[color:var(--color-cta)] hover:shadow-[var(--shadow-glow-cta)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
          "active:translate-y-0",
          className,
        )}
        {...rest}
      >
        {icon && <span className="shrink-0 text-cta">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  },
);
