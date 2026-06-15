import type { Transition, Variants } from "framer-motion";

// Named spring tokens. Picked to feel organic across surface weights:
// heavier sheets settle slower, taps snap. Anything new in the chat
// timeline / panels should pull from here so the whole app breathes
// to the same rhythm.
export const springs = {
  // Chat content arriving in the timeline. Lands with a soft heel.
  gentle: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } satisfies Transition,
  // Chips, buttons, small UI - lively, no overshoot.
  snappy: { type: "spring", stiffness: 360, damping: 30, mass: 0.7 } satisfies Transition,
  // Trays / panels / large cards - heavier glide.
  sheet: { type: "spring", stiffness: 200, damping: 28, mass: 1 } satisfies Transition,
  // Hover/press feedback - instant rebound.
  tap: { type: "spring", stiffness: 420, damping: 30, mass: 0.6 } satisfies Transition,
} as const;

// Drop-in variants for an element that fades + slides up. Pair with
// `staggerContainer()` on the parent to cascade across a list.
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springs.gentle },
  exit: { opacity: 0, y: 4, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
};

// Smaller-amplitude variant for tight content (chips, message bubbles).
export const fadeRiseVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: springs.snappy },
  exit: { opacity: 0, y: 2, transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] } },
};

// Parent variants that orchestrate stagger over fadeUp children.
export function staggerContainer(delay = 0.04, stagger = 0.06): Variants {
  return {
    hidden: {},
    visible: {
      transition: { delayChildren: delay, staggerChildren: stagger },
    },
    exit: {
      transition: { staggerChildren: 0.03, staggerDirection: -1 },
    },
  };
}

// Instant transition for the prefers-reduced-motion path. Branch on
// `useReducedMotion()` and swap this in for the spring.
export const instant: Transition = { duration: 0 };
