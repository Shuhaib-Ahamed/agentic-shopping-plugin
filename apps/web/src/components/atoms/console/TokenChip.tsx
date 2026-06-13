import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface TokenChipProps {
  value: string;
  /** Truncate to N chars from the start when longer. */
  truncate?: number;
  className?: string;
}

// Mono pill for IDs (trace, turn, session, order). Hover reveals full value,
// click copies.
export function TokenChip({ value, truncate = 12, className }: TokenChipProps) {
  const [copied, setCopied] = useState(false);
  const shown = value.length > truncate ? `${value.slice(0, truncate)}…` : value;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked; no-op.
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={value}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 h-6",
        "font-mono text-[12px] text-text",
        "bg-[color:var(--color-console-sunken)] hover:bg-[color:var(--color-cta-soft)]",
        "border border-[color:var(--color-border)] transition-colors duration-150 cursor-pointer",
        className,
      )}
    >
      <span className="leading-none">{shown}</span>
      {copied ? (
        <Check size={12} className="text-[color:var(--color-status-ok)]" aria-hidden />
      ) : (
        <Copy size={12} className="text-muted" aria-hidden />
      )}
      <span className="sr-only">Copy {value}</span>
    </button>
  );
}
