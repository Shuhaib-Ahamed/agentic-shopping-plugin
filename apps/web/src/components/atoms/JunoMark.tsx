import { cn } from "@/lib/cn";

export interface JunoMarkProps {
  size?: number;
  className?: string;
  /** Live status dot on the lower-right. */
  status?: "idle" | "thinking" | "working";
  /** Compact mode: no live dot. */
  bare?: boolean;
  /** Skip the inline width/height so responsive Tailwind classes on
   *  `className` (e.g. `w-20 md:w-28 lg:w-36`) can drive the size. The
   *  inner SVG then fills 100% × 100% of the wrapper. */
  fluid?: boolean;
  /** Render the mark as a single-colour silhouette (transparent bubble fill,
   *  given colour for outline + eyes + accent dot). For coloured avatar
   *  backgrounds. */
  mono?: string;
}

// Juno's mascot - a friendly chat bubble with a happy face and an orange
// status dot floating above. Renders an inline SVG so it can be themed and
// sized fluidly. Pairs with the chat-card UI direction (soft, light, playful).
export function JunoMark({
  size = 40,
  className,
  status = "idle",
  bare,
  fluid,
  mono,
}: JunoMarkProps) {
  const pulse = status !== "idle";
  const dotFill = mono ?? "var(--color-accent)";
  const bubbleFill = mono ? "none" : "var(--color-surface)";
  const bubbleStroke = mono ?? "var(--color-violet)";
  const eyeStroke = mono ?? "var(--color-text)";
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={fluid ? undefined : { width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="42 20 116 152"
        {...(fluid ? { width: "100%", height: "100%" } : { width: size, height: size })}
        xmlns="http://www.w3.org/2000/svg"
        className="block overflow-visible"
      >
        <circle
          cx="100"
          cy="33"
          r="11"
          fill={dotFill}
          className={pulse ? "animate-pulse" : undefined}
        />

        <path
          d="M 112 156 A 52 52 0 1 0 88 156 L 100 165 Z"
          fill={bubbleFill}
          stroke={bubbleStroke}
          strokeWidth="9"
          strokeLinejoin="round"
        />

        <g
          fill="none"
          stroke={eyeStroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 67 110 Q 80 95 93 110" />
          <path d="M 107 110 Q 120 95 133 110" />
        </g>
      </svg>
      {/* The standalone status dot - only shown when not pulsing, since the
          orange dot above already pulses for activity. */}
      {!bare && !pulse && (
        <span
          className="absolute rounded-full border border-white bg-emerald-500"
          style={
            fluid
              ? { width: "16%", height: "16%", bottom: "6%", right: "10%" }
              : {
                  width: Math.max(7, Math.round(size * 0.16)),
                  height: Math.max(7, Math.round(size * 0.16)),
                  bottom: Math.round(size * 0.06),
                  right: Math.round(size * 0.1),
                }
          }
          aria-label="online"
        />
      )}
    </span>
  );
}
