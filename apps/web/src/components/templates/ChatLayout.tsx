import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/organisms/TopBar";

export interface ChatLayoutProps {
  /** Top half of the hero (mascot + headline). Renders above the composer in the empty state. */
  heroIntro: ReactNode;
  /** Bottom half of the hero ("Start a chat" + suggestions). Renders below the composer in the empty state. */
  heroPrompts: ReactNode;
  messages: ReactNode;
  /**
   * The composer column. Should include — in this order, top to bottom —
   * the slide-up tray (forms / cart / checkout / success / etc.), the
   * inline error banner, the quick-options bar, and the composer input
   * itself. All surfaces now expand from this column; there is no longer
   * a right-side panel or mobile dialog.
   */
  composer: ReactNode;
  showHero: boolean;
}

// Spring used for the composer's center→bottom transition. Stiff enough to
// feel responsive, damped enough to settle without bounce.
const COMPOSER_SPRING = { type: "spring" as const, stiffness: 220, damping: 28, mass: 1 };

// Layout principles:
//   * Empty state => composer floats in the visual centre, with the hero
//     intro above it and the prompt deck below. ChatGPT-style.
//   * Active state => composer pins to the bottom, messages scroll above.
//   * The composer animates between the two positions via framer-motion's
//     shared layout transition (layoutId="composer").
//   * Every contextual surface (form, options, cart, error, checkout,
//     success) lives inside the composer prop — they slide up directly
//     above the input. No side panel, no bottom sheet overlay.
export function ChatLayout({
  heroIntro,
  heroPrompts,
  messages,
  composer,
  showHero,
}: ChatLayoutProps) {
  return (
    <div className="app-shell relative h-[100dvh] w-full overflow-hidden">
      <div className="aurora-shell" aria-hidden />

      <TopBar />

      <div
        className="relative z-[1] grid grid-cols-1 pt-[92px] md:pt-[112px]"
        style={{ height: "100dvh" }}
      >
        <main className="flex p-2 flex-col h-full min-h-0 overflow-hidden">
          {showHero ? (
            <div className="flex-1 overflow-y-auto scroll-quiet">
              <div className="min-h-full flex flex-col">
                {/* Spacer above the intro pushes it down toward centre. */}
                <div className="flex-[1.1] flex flex-col justify-end pb-4 md:pb-6">
                  {heroIntro}
                </div>

                {/* Composer column — vertically centred via spacers. The
                    shared layoutId animates this exact element to the
                    bottom when the conversation begins. */}
                <motion.div
                  layout
                  layoutId="composer"
                  transition={COMPOSER_SPRING}
                  className="w-full"
                >
                  {composer}
                </motion.div>

                {/* Spacer below the prompts pushes them up toward the composer. */}
                <div className="flex-1 pt-4 md:pt-6">
                  {heroPrompts}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">
                {messages}
              </div>

              <motion.div
                layout
                layoutId="composer"
                transition={COMPOSER_SPRING}
                className="w-full"
              >
                {composer}
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
