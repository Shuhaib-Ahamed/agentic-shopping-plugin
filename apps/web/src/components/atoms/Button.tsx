import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

// Master rule: focus-visible ring of 2px solid --color-cta with 2px offset.
// Hit target: 24px visual minimum, 44px on touch.
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap",
    "font-semibold leading-tight",
    "rounded-full",
    "transition-[transform,background-image,background-color,color,border-color,box-shadow,opacity] duration-200 ease-[var(--easing-emphasized)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
    "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none",
    "cursor-pointer active:scale-[0.98]",
  ],
  {
    variants: {
      variant: {
        primary: "btn-cta-gradient",
        secondary: [
          "bg-white text-text border border-border",
          "hover:bg-surface-warm hover:-translate-y-[1px] hover:shadow-md",
        ],
        ghost: ["bg-transparent text-text", "hover:bg-white/60"],
        soft: ["text-cta-hover", "hover:-translate-y-[1px]"],
        danger: ["bg-error text-white", "hover:opacity-90", "focus-visible:outline-error"],
      },
      size: {
        sm: "h-9 px-4 text-[var(--text-sm)] min-w-[44px]",
        md: "h-11 px-5 text-[var(--text-base)] min-w-[44px]",
        lg: "h-12 px-6 text-[var(--text-base)] min-w-[44px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
    compoundVariants: [
      {
        variant: "soft",
        className: "bg-[color:var(--color-cta-soft)] ring-gradient",
      },
    ],
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isPending?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    asChild = false,
    isPending = false,
    iconLeft,
    iconRight,
    variant,
    size,
    block,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isPending}
      data-pending={isPending ? "" : undefined}
      {...rest}
    >
      {isPending ? <Spinner size={16} color="currentColor" /> : iconLeft}
      <span>{children}</span>
      {!isPending && iconRight}
    </Comp>
  );
});
