import { Sparkles } from "lucide-react";
import { useAppStore } from "@/store";
import { pickStrings } from "@/i18n";
import { JunoMark } from "@/components/atoms";
import { Marquee } from "@/components/molecules";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { cn } from "@/lib/cn";

export interface HeroProps {
  onSuggestion: (text: string) => void;
}

function detectLang(s: string): "si" | "ta" | "en" {
  if (/[඀-෿]/.test(s)) return "si";
  if (/[஀-௿]/.test(s)) return "ta";
  return "en";
}

// -----------------------------------------------------------------------------
// HeroIntro — mascot + display headline. Renders above the composer.
// -----------------------------------------------------------------------------

export function HeroIntro() {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const brand = t.app.title ?? "Juno";

  // Both lines render at once. Each DiaTextReveal plays a single sweep on
  // mount; the second is delayed so the eye reads left→right, top→bottom.
  // `repeat` is off, so the lines stay revealed instead of rotating.
  const sweepColors = ["#4A2E82", "#6B4BA0", "#F9B233"];
  const inkColor = "#161624";

  return (
    <div
      className="relative w-full max-w-[1200px] mx-auto px-5 md:px-8 animate-[surface-in_700ms_cubic-bezier(0.16,1,0.3,1)_both]"
      aria-labelledby="hero-headline"
    >
      <div className="flex items-center justify-center mt-28 sm:mt-32 md:mt-36 gap-4 sm:gap-6 md:gap-7">
        <JunoMark
          fluid
          bare
          className={cn(
            // Responsive square mark — scales with the breakpoint instead of
            // a single fixed pixel size. Aspect kept square so the SVG never
            // distorts. Values picked to balance the headline size at each
            // step (xs phones → 32" desktops).
            "shrink-0 w-16 sm:w-20 md:w-28 lg:w-32 xl:w-36 aspect-square",
            "-rotate-[10deg] origin-center",
            "transition-transform duration-500 ease-[var(--easing-emphasized)]",
            "hover:-rotate-[4deg] hover:scale-[1.04]",
          )}
        />

        <h1
          id="hero-headline"
          className="min-w-0"
          lang={locale}
        >
          <span
            className="flex flex-col gap-0.5 sm:gap-1 text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            {/* Hero line — bigger, anchors the headline. */}
            <DiaTextReveal
              text={`Hi! I'm ${brand},`}
              colors={sweepColors}
              textColor={inkColor}
              duration={1.6}
              repeat={false}
              className="block text-[clamp(2.25rem,1.5rem+3vw,4rem)]"
            />
            {/* Subhead — smaller, sits as a tagline. */}
            <DiaTextReveal
              text="your shopping guru"
              colors={sweepColors}
              textColor={inkColor}
              duration={1.6}
              delay={0.5}
              repeat={false}
              className="block text-[clamp(1.25rem,1rem+1.4vw,2rem)] font-semibold opacity-90"
            />
          </span>
        </h1>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HeroPrompts — horizontal marquee of starter prompts, sized to match the
// composer column and edge-faded on the left + right. Renders directly under
// the composer on the empty hero state (no hover, no slide-down).
// -----------------------------------------------------------------------------

export function HeroPrompts({ onSuggestion }: HeroProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);

  // Order is chosen so consecutive chips alternate language/topic, which
  // reads more interesting as it scrolls past than birthday-cake-flowers.
  const items: string[] = [
    t.hero.suggestions.birthday,
    t.hero.suggestions.flowers,
    t.hero.suggestions.sinhala,
    t.hero.suggestions.cake,
    t.hero.suggestions.tamil,
    t.hero.suggestions.tanglish,
  ];

  return (
    <div
      className={cn(
        // Match ComposerStack's column width so the marquee is exactly as
        // long as the composer above it.
        "relative w-full max-w-[1200px] mx-auto px-3 md:px-5",
        "animate-[fade-in_700ms_cubic-bezier(0.16,1,0.3,1)_120ms_both]",
      )}
      aria-label="Starter prompts"
    >
      <Marquee
        duration="48s"
        gap="0.6rem"
        repeat={3}
        pauseOnHover
        className="py-2"
      >
        {items.map((text) => {
          const lang = detectLang(text);
          return (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestion(text)}
              lang={lang}
              className={cn(
                "suggestion-glass group inline-flex items-center gap-2 shrink-0",
                "rounded-full px-4 py-2 cursor-pointer whitespace-nowrap",
                "text-[var(--text-sm)] font-medium text-primary",
                "transition-[transform,box-shadow,background-color,border-color] duration-260 ease-[var(--easing-emphasized)]",
                "hover:-translate-y-[1px]",
                "mb-8",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
              )}
            >
              <Sparkles
                size={12}
                strokeWidth={2.4}
                aria-hidden
                className="shrink-0"
                style={{ color: "var(--color-cta-deep)" }}
              />
              <span className="leading-snug">{text}</span>
            </button>
          );
        })}
      </Marquee>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hero — backwards-compatible composite (intro + prompts, no composer slot).
// -----------------------------------------------------------------------------

export function Hero({ onSuggestion }: HeroProps) {
  return (
    <section className="relative w-full max-w-[1200px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-12 md:pb-16">
      <HeroIntro />
      <div className="mt-12 md:mt-14">
        <HeroPrompts onSuggestion={onSuggestion} />
      </div>
    </section>
  );
}
