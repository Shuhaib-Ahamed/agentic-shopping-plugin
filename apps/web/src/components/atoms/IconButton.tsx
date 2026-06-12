import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

// Icon-only control. Always carries an aria-label. 44x44 hit target on touch
// even when the visual is smaller (Vercel guideline).
const iconButtonVariants = cva(
  [
    "relative inline-flex items-center justify-center select-none",
    "rounded-full",
    "transition-[transform,background-color,color,opacity] duration-150 ease-out",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "cursor-pointer active:scale-95",
    // Expand the hit target with a transparent extension when visual < 44px.
    "before:absolute before:inset-[-6px] before:content-['']",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-accent)] text-[var(--color-text)] hover:bg-[var(--color-accent-dark)]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-warm)]",
        ghost: "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-warm)]",
      },
      size: {
        sm: "h-9 w-9",
        md: "h-11 w-11",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Required for accessibility, even though the button shows only an icon. */
  "aria-label": string;
  icon: ReactNode;
  isPending?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant, size, icon, isPending, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      disabled={disabled || isPending}
      {...rest}
    >
      {isPending ? <Spinner size={16} /> : icon}
    </button>
  );
});
