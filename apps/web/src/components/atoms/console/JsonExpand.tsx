import { Check, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface JsonExpandProps {
  value: unknown;
  label?: string;
  defaultOpen?: boolean;
  className?: string;
}

// Lazy JSON preview: never serializes until opened. Always shows under 200KB
// of formatted output to keep the DOM small.
export function JsonExpand({
  value,
  label = "Raw payload",
  defaultOpen = false,
  className,
}: JsonExpandProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const text = open ? safeStringify(value) : "";
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked.
    }
  };
  return (
    <div
      className={cn(
        "rounded-lg border border-[color:var(--color-border)] overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3 py-2",
          "bg-[color:var(--color-console-sunken)] hover:bg-[color:var(--color-cta-soft)]",
          "cursor-pointer transition-colors duration-150",
        )}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[12px] font-semibold text-text">
          <ChevronRight
            size={14}
            className={cn("transition-transform duration-150", open && "rotate-90")}
            aria-hidden
          />
          {label}
        </span>
        {open ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              void onCopy();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                void onCopy();
              }
            }}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-text cursor-pointer"
          >
            {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </span>
        ) : null}
      </button>
      {open ? (
        <pre className="m-0 max-h-[420px] overflow-auto bg-[color:var(--color-console-card)] p-3 text-[12px] font-mono leading-[1.5] text-text scroll-quiet">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}
