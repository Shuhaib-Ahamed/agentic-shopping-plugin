import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAppStore } from "@/store";
import { pickStrings } from "@/i18n";
import { JunoMark } from "@/components/atoms";
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

  return (
    <div
      className="relative w-full max-w-[720px] mx-auto px-5 md:px-8 animate-[surface-in_700ms_cubic-bezier(0.16,1,0.3,1)_both]"
      aria-labelledby="hero-headline"
    >
      <div className="flex justify-center mb-4">
        <JunoMark size={140} bare />
      </div>

      <h1
        id="hero-headline"
        className="flex flex-col items-center text-center"
        lang={locale}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.08,
            fontSize: "clamp(2rem, 2.8vw + 1.2rem, 3rem)",
          }}
        >
          <DiaTextReveal
            text={[`Hi! I'm ${brand},`, "your shopping guru"]}
            colors={["#4A2E82", "#6B4BA0", "#F9B233"]}
            textColor="#161624"
            duration={1.8}
            repeat
            repeatDelay={3}
            fixedWidth
            className="block text-balance"
          />
        </div>
      </h1>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HeroPrompts — "Start a chat" section with the featured + secondary
// suggestion bubbles. Renders below the composer.
// -----------------------------------------------------------------------------

export function HeroPrompts({ onSuggestion }: HeroProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);

  type Tail = "left" | "right";
  const featured = {
    text: t.hero.suggestions.birthday,
    label: "Most popular",
  };
  const secondary: Array<{ text: string; tail: Tail }> = [
    { text: t.hero.suggestions.cake,     tail: "left"  },
    { text: t.hero.suggestions.flowers,  tail: "right" },
    { text: t.hero.suggestions.sinhala,  tail: "left"  },
    { text: t.hero.suggestions.tamil,    tail: "right" },
    { text: t.hero.suggestions.tanglish, tail: "left"  },
  ];

  return (
    <div className="relative w-full max-w-[720px] mx-auto px-5 md:px-8 animate-[surface-in_700ms_cubic-bezier(0.16,1,0.3,1)_120ms_both]">
      <div className="flex items-baseline justify-between mb-4">
        <h2
          className="text-[var(--text-sm)] font-medium text-muted"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Start a chat
        </h2>
        <button
          type="button"
          className="text-[var(--text-sm)] font-medium text-muted hover:text-primary transition-colors cursor-pointer"
          onClick={() => onSuggestion(t.hero.suggestions.birthday)}
        >
          See all
        </button>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSuggestion(featured.text)}
          lang={detectLang(featured.text)}
          className={cn(
            "group block w-full text-left",
            "rounded-[22px] rounded-bl-[8px] px-5 py-4 cursor-pointer",
            "shadow-[var(--shadow-bubble)]",
            "transition-[transform,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
            "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(91,107,240,0.32)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
          )}
          style={{
            background:
              "linear-gradient(135deg, var(--color-lavender) 0%, var(--color-lavender-strong) 100%)",
            animation: "surface-in 600ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both",
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 mb-1.5 text-[var(--text-2xs)] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-accent-dark)" }}
          >
            <Sparkles size={11} strokeWidth={2.4} />
            {featured.label}
          </span>
          <span className="flex items-start justify-between gap-3">
            <span
              className="text-pretty text-[var(--text-md)] md:text-[var(--text-lg)] font-semibold leading-snug"
              style={{ color: "var(--color-lavender-ink)" }}
            >
              {featured.text}
            </span>
            <span
              className="grid place-items-center w-7 h-7 rounded-full shrink-0 mt-0.5"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-text)",
              }}
              aria-hidden
            >
              <ArrowUpRight size={14} strokeWidth={2.4} />
            </span>
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {secondary.map((s, idx) => {
            const lang = detectLang(s.text);
            return (
              <button
                key={s.text}
                type="button"
                onClick={() => onSuggestion(s.text)}
                lang={lang}
                className={cn(
                  "suggestion-bubble group inline-flex items-start justify-between gap-2.5",
                  "text-[var(--text-sm)] md:text-[var(--text-md)]",
                  "cursor-pointer",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
                  s.tail === "right" && "tail-right",
                )}
                style={{
                  animation: `surface-in 600ms cubic-bezier(0.16, 1, 0.3, 1) ${300 + idx * 70}ms both`,
                }}
              >
                <span className="text-pretty leading-snug">{s.text}</span>
                <span
                  className="grid place-items-center w-6 h-6 rounded-full shrink-0 -mr-0.5 mt-0.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-text)",
                  }}
                  aria-hidden
                >
                  <ArrowUpRight size={12} strokeWidth={2.4} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hero — backwards-compatible composite (intro + prompts, no composer slot).
// -----------------------------------------------------------------------------

export function Hero({ onSuggestion }: HeroProps) {
  return (
    <section className="relative w-full max-w-[760px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-12 md:pb-16">
      <HeroIntro />
      <div className="mt-12 md:mt-14">
        <HeroPrompts onSuggestion={onSuggestion} />
      </div>
    </section>
  );
}
