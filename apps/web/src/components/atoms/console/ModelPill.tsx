import { cn } from "@/lib/cn";

export function ModelPill({ model, className }: { model: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 h-5 font-mono text-[11px] font-medium",
        "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)]",
        className,
      )}
    >
      {model}
    </span>
  );
}
