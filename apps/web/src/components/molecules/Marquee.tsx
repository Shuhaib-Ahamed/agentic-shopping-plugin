import { Children, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** Pause animation when the cursor hovers the marquee. */
  pauseOnHover?: boolean;
  /** Reverse the scroll direction (right-to-left becomes left-to-right). */
  reverse?: boolean;
  /** How many times to duplicate the children so the loop fills the row. */
  repeat?: number;
  /** Duration of one full loop. Slower duration = slower scroll. */
  duration?: string;
  /** Horizontal gap between items. Maps to the CSS `--marquee-gap` variable. */
  gap?: string;
  /** When true, fade the left + right edges via mask-image. */
  fade?: boolean;
  children: ReactNode;
}

// Magic UI marquee, distilled. Wraps `children` and stacks `repeat` copies of
// them in a flex row, animating each copy with the global `marquee` keyframe
// from `styles.css`. Pause-on-hover via `group-hover` so the shopper can
// catch one as it drifts past. Edge fade is a mask gradient.
export function Marquee({
  className,
  pauseOnHover = true,
  reverse = false,
  repeat = 3,
  duration = "40s",
  gap = "0.75rem",
  fade = true,
  children,
  style,
  ...rest
}: MarqueeProps) {
  // Bail out to a single static copy if the consumer fed an empty array.
  const tileCount = Math.max(1, repeat);
  const safeChildren = Children.toArray(children);
  if (safeChildren.length === 0) return null;

  const fadeMask = "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)";

  const mergedStyle: CSSProperties = {
    ...style,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CSS custom properties
    ["--marquee-duration" as any]: duration,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CSS custom properties
    ["--marquee-gap" as any]: gap,
    gap,
    ...(fade
      ? {
          maskImage: fadeMask,
          WebkitMaskImage: fadeMask,
        }
      : {}),
  };

  return (
    <div
      {...rest}
      className={cn("group relative flex overflow-hidden pb-2", className)}
      style={mergedStyle}
    >
      {Array.from({ length: tileCount }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            "flex shrink-0 items-center justify-around",
            "animate-[marquee_var(--marquee-duration)_linear_infinite]",
            // Pause for hover (mouse), focus-within (keyboard / assistive tech),
            // and disable entirely when the user prefers reduced motion. Without
            // the focus-within and motion-reduce branches the chips fail
            // WCAG 2.2.2 and are unstable for programmatic clicks.
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            "group-focus-within:[animation-play-state:paused]",
            "motion-reduce:animate-none",
            reverse && "[animation-direction:reverse]",
          )}
          style={{ gap }}
        >
          {safeChildren}
        </div>
      ))}
    </div>
  );
}
