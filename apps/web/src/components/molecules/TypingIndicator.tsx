import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { instant, springs } from "@/lib/motion";

export interface TypingIndicatorProps {
  /** Optional status label shown next to the dots (e.g. "Looking through Kapruka"). */
  label?: string;
  className?: string;
}

// Three-dot typing indicator rendered as an assistant chat bubble.
// Bridges the gap between sending the prompt and the first SSE event so
// the UI never looks frozen during network latency or model warmup.
export function TypingIndicator({ label, className }: TypingIndicatorProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={label ?? "Juno is typing"}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 2 }}
      transition={reduced ? instant : springs.snappy}
      className={cn("flex w-full items-end", className)}
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
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full"
              style={{ background: "currentColor" }}
              animate={reduced ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={
                reduced
                  ? undefined
                  : {
                      duration: 1.1,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "mirror",
                      delay: i * 0.16,
                    }
              }
            />
          ))}
        </span>
        {label && (
          <span className="text-[var(--text-sm)] font-medium leading-snug ml-1">{label}</span>
        )}
      </div>
    </motion.div>
  );
}
