import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { StatusState } from "@/store";
import { JunoMark } from "@/components/atoms";
import { cn } from "@/lib/cn";

export interface StatusBubbleProps {
  state: StatusState;
  /** Override label. Falls back to a random themed phrase for the state. */
  label?: string;
  /** Optional one-token detail rendered after the label as a soft pill. */
  detail?: string;
  className?: string;
}

interface StateMeta {
  labels: readonly string[];
}

// One-word, shopping- and gifting-themed status phrases. The BE sends a
// pre-picked word from its own pool; this is the fallback used when no
// label arrives, and a fresh word is drawn each time the state changes.
const STATE_META: Record<Exclude<StatusState, "idle">, StateMeta> = {
  thinking: {
    labels: ["Pondering", "Mulling", "Brewing", "Plotting", "Wondering", "Cooking", "Hatching"],
  },
  routing: {
    labels: ["Listening", "Tuning", "Reading", "Hearing", "Decoding", "Peeking"],
  },
  searching: {
    labels: ["Hunting", "Combing", "Browsing", "Foraging", "Rummaging", "Scouring", "Sleuthing"],
  },
  fetching: {
    labels: ["Unboxing", "Unwrapping", "Lifting", "Peeking", "Pulling", "Inspecting"],
  },
  checking: {
    labels: ["Mapping", "Plotting", "Routing", "Pinging", "Calling", "Dispatching"],
  },
  creating: {
    labels: ["Wrapping", "Sealing", "Folding", "Tying", "Boxing", "Bowing"],
  },
  tracking: {
    labels: ["Tracking", "Trailing", "Watching", "Tracing", "Following"],
  },
  composing: {
    labels: ["Penning", "Drafting", "Writing", "Scribbling", "Composing", "Phrasing"],
  },
  working: {
    labels: ["Working", "Bustling", "Hustling", "Crafting", "Tinkering"],
  },
};

function pickFromPool(pool: readonly string[]): string {
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? pool[0]!;
}

// A real assistant-styled bubble that narrates the pipeline. Replaces the old
// "thinking" pill. Renders only while `state !== "idle"`. Labels swap with a
// soft fade so the shopper sees actual progress, not just a spinner.
export function StatusBubble({ state, label, detail, className }: StatusBubbleProps) {
  // Re-pick a themed phrase whenever the state changes. Stays stable while
  // the state is held so the bubble doesn't shuffle on every re-render.
  // Hook must run unconditionally — read the pool defensively so we can
  // still bail early below when state === "idle".
  const fallbackLabel = useMemo(() => {
    const pool =
      state !== "idle" ? STATE_META[state].labels : STATE_META.thinking.labels;
    return pickFromPool(pool);
  }, [state]);

  if (state === "idle") return null;

  const text = label ?? fallbackLabel;
  // Re-key the AnimatePresence child on every change so the fade fires when
  // either the state OR the label/detail content shifts.
  const key = `${state}::${text}::${detail ?? ""}`;

  return (
    <div
      className={cn(
        "flex w-full gap-3 items-end",
        "animate-[message-in_420ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="pb-1 shrink-0">
        <JunoMark size={40} bare />
      </div>
      <div
        className={cn(
          "min-h-[44px] flex items-center px-4 py-2.5",
          "rounded-[var(--radius-bubble)] rounded-bl-[4px]",
          "shadow-[var(--shadow-bubble)]",
          "mr-auto",
        )}
        style={{
          background: "var(--color-lavender)",
          color: "var(--color-lavender-ink)",
          fontFamily: "var(--font-body)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-baseline gap-2 min-w-0"
          >
            <span
              className="text-[var(--text-sm)] font-semibold leading-snug truncate"
              style={{ color: "var(--color-lavender-ink)" }}
            >
              {text}
            </span>
            <TypingDots />
            {detail && (
              <span
                className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[var(--text-2xs)] font-semibold truncate max-w-[180px]"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  color: "var(--color-cta-deep)",
                }}
              >
                {detail}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Three pulsing dots — sit on the text baseline so they read like an
// ellipsis after the status word, not a separate bouncing widget.
function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1 shrink-0", className)}
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full block"
          style={{ background: "var(--color-cta-deep)" }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{
            duration: 1.05,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.14,
          }}
        />
      ))}
    </span>
  );
}
