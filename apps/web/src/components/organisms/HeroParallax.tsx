import { memo } from "react";
import { cn } from "@/lib/cn";
import { StorefrontScene } from "./StorefrontScene";

export interface HeroParallaxProps {
  className?: string;
}

// Storefront parallax — markup ported verbatim from
// /Users/shuhaib/Downloads/Juno Welcome.html and now rendered as real JSX
// via the <StorefrontScene /> component (no dangerouslySetInnerHTML).
//
// Layers (top → bottom):
//   1. Bunting strung overhead   (slowest, 90s)
//   2. Far towers / background   (80s)
//   3. Mid stalls / shoppers     (46s)
//   4. Foreground props          (28s, fastest)
//
// Driven by `@keyframes marchLeft` (translateX 0 → -1440px). Each layer is
// 4320px wide = three 1440px tiles, so the loop is seamless. Honors
// `prefers-reduced-motion` via the global rule in styles.css.
export const HeroParallax = memo(function HeroParallax({ className }: HeroParallaxProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none",
        className,
      )}
    >
      {/* Soft pastel wash behind the storefront so the colored layers register
          on the (otherwise warm) hero background — lifted from the source. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 58% at 50% 36%, rgba(255,255,255,.6), rgba(255,255,255,0) 72%), linear-gradient(180deg, rgba(233,221,255,0) 46%, rgba(233,221,255,.4) 100%)",
        }}
      />
      <StorefrontScene />
    </div>
  );
});
