import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";
import { ChatBackground } from "@/components/organisms/ChatBackground";
import { HeroParallax } from "@/components/organisms/HeroParallax";
import { TopBar } from "@/components/organisms/TopBar";

export interface ChatLayoutProps {
  /** Top half of the hero (mascot + headline). Renders above the composer in the empty state. */
  heroIntro: ReactNode;
  /** Starter-prompt marquee. Renders directly below the composer on the empty hero state. */
  heroPrompts: ReactNode;
  messages: ReactNode;
  /**
   * The composer column. Should include - in this order, top to bottom -
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
//     success) lives inside the composer prop - they slide up directly
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

      {/* Drifting vector parallax - only mounted while the empty-state hero
          is showing. Lives outside HeroIntro because that wrapper has a
          translateY animation, which would create a stacking context and
          clip the parallax to the 720px hero column. Here it covers the
          whole app-shell, behind TopBar and the chat content. */}
      <AnimatePresence>
        {showHero && (
          <motion.div
            key="hero-parallax"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <HeroParallax />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat background - gift-wrap vibe. Mounted only while the message
          stream is active; cross-fades in as the hero parallax exits. */}
      <AnimatePresence>
        {!showHero && (
          <motion.div
            key="chat-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <ChatBackground />
          </motion.div>
        )}
      </AnimatePresence>

      <TopBar />

      <div
        className="relative z-[1] grid grid-cols-1 pt-[92px] md:pt-[112px]"
        style={{ height: "100dvh" }}
      >
        <main className="flex p-2 flex-col h-full min-h-0 overflow-hidden">
          {showHero ? (
            <div className="flex-1 overflow-y-auto scroll-quiet">
              <div className="min-h-full flex flex-col">
                {/* Hero intro pinned to the top of the column. No flex weight
                    above it - the intro and the composer stack at the top of
                    the viewport so the storefront parallax (especially the
                    market street at the bottom) stays visible behind them. */}
                <div className="pt-2 md:pt-4 pb-3 md:pb-4">{heroIntro}</div>

                {/* Composer column. Animates between hero-centered and
                    docked-at-bottom via the shared layoutId. */}
                <motion.div
                  layout
                  layoutId="composer"
                  transition={COMPOSER_SPRING}
                  className="w-full"
                >
                  {composer}
                </motion.div>

                {/* Starter-prompt marquee - directly under the composer, same
                    760px column width, faded on both edges. Static
                    presentation; no hover gate. */}
                <div className="w-full md:pt-4">{heroPrompts}</div>

                {/* Lower spacer - takes every remaining pixel below the
                    marquee. This is the region the storefront parallax
                    drifts through. */}
                <div className="flex-1 min-h-[16px]" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">{messages}</div>

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
