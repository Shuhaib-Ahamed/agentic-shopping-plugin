import { AnimatePresence, motion } from "motion/react";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

export interface ComposerStackProps {
  /** Active tray (cart, form, checkout, success). `null` when nothing is open. */
  tray?: ReactNode;
  /** Recoverable error banner. `null` when no error is surfaced. */
  banner?: ReactNode;
  /** Quick-reply chips bar. `null` when there are no chips. */
  options?: ReactNode;
  /** The composer input itself. Always present. */
  composer: ReactNode;
  className?: string;
}

// Pulls from the shared sheet preset so the composer-adjacent stack
// breathes at the same rhythm as cart / checkout / form panels.
const STACK_SPRING = springs.sheet;

const ENTRY = {
  initial: { opacity: 0, y: 18, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.99,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
};

// Unified, animated stack that lives directly above the composer.
//
//   ┌─────────────────────────────────────┐
//   │  Tray (cart / form / checkout / …)  │
//   ├─────────────────────────────────────┤
//   │  Error banner                       │
//   ├─────────────────────────────────────┤
//   │  Options chips                      │
//   ├─────────────────────────────────────┤
//   │  Composer input                     │
//   └─────────────────────────────────────┘
//
// Owns the column max-width, horizontal padding, vertical gap, and per-slot
// spring transitions. Each slot enters from below, exits down + faded, and the
// rest of the stack reflows smoothly via framer-motion's shared `layout`. The
// composer itself stays anchored: it animates its position (via `layout`) but
// never enters or exits.
export function ComposerStack({ tray, banner, options, composer, className }: ComposerStackProps) {
  const hasTray = isMeaningful(tray);
  const hasBanner = isMeaningful(banner);
  const hasOptions = isMeaningful(options);

  return (
    <div className={cn("relative w-full max-w-[1200px] mx-auto px-3 md:px-6 pb-2", className)}>
      <motion.div layout="position" className="flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {hasTray && (
            <Slot key="tray" zIndex={3}>
              {tray}
            </Slot>
          )}
          {hasBanner && (
            <Slot key="banner" zIndex={2}>
              {banner}
            </Slot>
          )}
          {hasOptions && (
            <Slot key="options" zIndex={1}>
              {options}
            </Slot>
          )}
        </AnimatePresence>

        {/* Composer keeps a stable layout id so the rest of the stack reflows
            beneath it; it never enters or exits. */}
        <motion.div
          layout="position"
          transition={STACK_SPRING}
          className="relative"
          style={{ zIndex: 0 }}
        >
          {composer}
        </motion.div>
      </motion.div>
    </div>
  );
}

function Slot({ children, zIndex }: { children: ReactNode; zIndex: number }) {
  return (
    <motion.div
      layout="position"
      initial={ENTRY.initial}
      animate={ENTRY.animate}
      exit={ENTRY.exit}
      transition={STACK_SPRING}
      className="relative"
      style={{ zIndex }}
    >
      {children}
    </motion.div>
  );
}

// Treat `null`, `false`, `undefined`, an empty fragment, or an empty array as
// "nothing to show". This lets callers do `options={maybeOptions && <X />}`
// without the stack rendering empty wrappers.
function isMeaningful(node: ReactNode): boolean {
  if (node === null || node === undefined || node === false) return false;
  if (Array.isArray(node) && node.length === 0) return false;
  if (isValidElement(node) && node.type === Fragment) {
    const kids = Children.toArray((node.props as { children?: ReactNode })?.children ?? null);
    if (kids.length === 0) return false;
  }
  return true;
}
