import { cn } from "@/lib/cn";

export interface TypingIndicatorProps {
  /** Optional status label shown next to the dots (e.g. "Looking through Kapruka"). */
  label?: string;
  className?: string;
}

// Three-dot typing indicator rendered as an assistant chat bubble.
// Bridges the gap between sending the prompt and the first SSE event so
// the UI never looks frozen during network latency or model warmup.
export function TypingIndicator({ label, className }: TypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? "Juno is typing"}
      className={cn(
        "flex w-full items-end animate-[message-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-3 mr-auto",
          "rounded-[var(--radius-bubble)] rounded-bl-[4px]",
          "shadow-[var(--shadow-bubble)]",
        )}
        style={{
          background: "var(--color-lavender)",
          color: "var(--color-lavender-ink)",
        }}
      >
        <span className="flex items-center gap-1.5" aria-hidden>
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: "currentColor",
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: "0ms",
            }}
          />
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: "currentColor",
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: "160ms",
            }}
          />
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: "currentColor",
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: "320ms",
            }}
          />
        </span>
        {label && (
          <span className="text-[var(--text-sm)] font-medium leading-snug ml-1">{label}</span>
        )}
      </div>
    </div>
  );
}
