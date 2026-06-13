import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
        ? "rounded-[var(--radius-xl)]"
        : rounded === "lg"
          ? "rounded-[var(--radius-lg)]"
          : rounded === "sm"
            ? "rounded-[var(--radius-sm)]"
            : "rounded-[var(--radius-md)]";
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", r, className)}
      style={{
        background:
          "linear-gradient(90deg, var(--color-surface-sunken) 0%, var(--color-surface-warm) 50%, var(--color-surface-sunken) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}
