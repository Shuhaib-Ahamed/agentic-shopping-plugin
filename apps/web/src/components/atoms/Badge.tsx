import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 h-6 px-2 rounded-full",
    "text-[var(--text-2xs)] font-medium leading-none whitespace-nowrap",
    "border",
  ],
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]",
        stock:
          "bg-[color:var(--color-success-bg)] text-[var(--color-success)] border-[color:var(--color-success-bg)]",
        low: "bg-[color:var(--color-warn-bg)] text-[var(--color-stock-low)] border-[color:var(--color-warn-bg)]",
        out: "bg-[#FEE2E2] text-[var(--color-error)] border-[#FEE2E2]",
        perishable:
          "bg-[color:var(--color-warn-bg)] text-[var(--color-warn)] border-[var(--color-warn)]",
        sale: "bg-[var(--color-cta)] text-white border-[var(--color-cta)]",
        new: "bg-[var(--color-primary)] text-[#F8F4EC] border-[var(--color-primary)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ tone, icon, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon}
      {children}
    </span>
  );
}
