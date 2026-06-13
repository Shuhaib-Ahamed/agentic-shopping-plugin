import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}
