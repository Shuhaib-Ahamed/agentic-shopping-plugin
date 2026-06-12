import { cn } from "@/lib/cn";

export interface JunoMarkProps {
  size?: number;
  className?: string;
  /** Live status dot on the lower-right. */
  status?: "idle" | "thinking" | "working";
  /** Compact mode: no live dot. */
  bare?: boolean;
}

// Juno's mascot — a friendly chat bubble with a happy face and an orange
// status dot floating above. Renders an inline SVG so it can be themed and
// sized fluidly. Pairs with the chat-card UI direction (soft, light, playful).
export function JunoMark({ size = 40, className, status = "idle", bare }: JunoMarkProps) {
  const pulse = status !== "idle";
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 190"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className="block overflow-visible"
      >
        {/* Floating yellow dot — pulses as the live status indicator. */}
        <circle
          cx="100"
          cy="33"
          r="11"
          fill="var(--color-accent)"
          className={pulse ? "animate-pulse" : undefined}
        />

        {/* Bordered chat bubble with a subtle tail — violet outline matching brand. */}
        <path
          d="M 112 156 A 52 52 0 1 0 88 156 L 100 165 Z"
          fill="#ffffff"
          stroke="var(--color-violet)"
          strokeWidth="9"
          strokeLinejoin="round"
        />

        {/* Happy closed eyes. */}
        <g
          fill="none"
          stroke="#2c3a47"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 67 110 Q 80 95 93 110" />
          <path d="M 107 110 Q 120 95 133 110" />
        </g>
      </svg>
      {/* The standalone status dot — only shown when not pulsing, since the
          orange dot above already pulses for activity. */}
      {!bare && !pulse && (
        <span
          className="absolute rounded-full border border-white bg-emerald-500"
          style={{
            width: Math.max(7, Math.round(size * 0.16)),
            height: Math.max(7, Math.round(size * 0.16)),
            bottom: Math.round(size * 0.06),
            right: Math.round(size * 0.1),
          }}
          aria-label="online"
        />
      )}
    </span>
  );
}