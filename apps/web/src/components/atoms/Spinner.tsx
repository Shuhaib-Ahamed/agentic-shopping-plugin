import { cn } from "@/lib/cn";

export interface SpinnerProps {
  size?: number;
  className?: string;
  /** Override the stroke color. Defaults to currentColor. */
  color?: string;
  /** Accessible label. */
  label?: string;
}

// SVG arc that rotates. Compositor-only animation (transform).
// Respects prefers-reduced-motion globally via tokens.css.
export function Spinner({ size = 20, className, color = "currentColor", label = "Loading" }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("animate-spin shrink-0", className)}
      style={{ animationDuration: "900ms" }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.15" fill="none" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
