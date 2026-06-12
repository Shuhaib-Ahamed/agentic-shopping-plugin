import { ShoppingBag } from "lucide-react";
import { useAppStore, selectCart } from "@/store";
import { pickStrings } from "@/i18n";
import { cn } from "@/lib/cn";
import { KaprukaLogo } from "@/components/atoms";
import { SessionMenu } from "./SessionMenu";
import type { Locale } from "@kapruka/protocol";

export interface TopBarProps {
  className?: string;
}

const LOCALES: Array<{ code: Locale; key: "languageEN" | "languageSI" | "languageTA" }> = [
  { code: "en", key: "languageEN" },
  { code: "si", key: "languageSI" },
  { code: "ta", key: "languageTA" },
];

// Floating violet header pill. Sits with breathing room from the viewport
// edges (top + sides), so the soft pink wash shows around it. Violet
// gradient base, soft yellow radial glow in the right corner. Yellow is
// the secondary accent — used here for the cart badge and the active
// language indicator.
export function TopBar({ className }: TopBarProps) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const cart = useAppStore(selectCart);
  const cartOpen = useAppStore((s) => s.cartOpen);
  const toggleCart = useAppStore((s) => s.toggleCart);
  const t = pickStrings(locale);
  const cartCount = cart.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <header
      className={cn(
        "fixed top-3 md:top-5 inset-x-3 md:inset-x-6 z-[var(--z-sticky)]",
        "mx-auto max-w-[1200px]",
        className,
      )}
    >
      <div
        className="floating-header flex items-center justify-between gap-3 pl-4 pr-2 md:pl-6 md:pr-3 h-16 md:h-[72px]"
      >
        <a
          href="/"
          aria-label="Kapruka home"
          className="flex items-center min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
        >
          {/* Bigger Kapruka wordmark — the PNG variant designed for dark
              surfaces is the right read on the violet pill. */}
          <KaprukaLogo height={15} />
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <div
            className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-white/[0.12] border border-white/20 backdrop-blur-sm"
            role="radiogroup"
            aria-label="Language"
          >
            {LOCALES.map(({ code, key }) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={locale === code}
                onClick={() => setLocale(code)}
                className={cn(
                  "min-h-[30px] px-3 rounded-full text-[var(--text-xs)] font-semibold cursor-pointer",
                  "transition-[background-color,color] duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  locale === code
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-text)] shadow-sm"
                    : "text-white/85 hover:text-white hover:bg-white/10",
                )}
              >
                {t.composer[key]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleCart}
            aria-expanded={cartOpen}
            aria-label={`${t.cart.title}, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className={cn(
              "relative inline-flex items-center gap-2 h-11 px-4 rounded-full cursor-pointer",
              "text-[var(--text-sm)] font-semibold",
              "border border-white/25 backdrop-blur-sm",
              "transition-[transform,background-color,color] duration-200 ease-[var(--easing-emphasized)]",
              "hover:-translate-y-[1px]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              cartOpen
                ? "bg-[color:var(--color-accent)] text-[color:var(--color-text)] border-transparent shadow-[var(--shadow-accent)]"
                : "bg-white/[0.14] text-white hover:bg-white/20",
            )}
          >
            <ShoppingBag size={16} strokeWidth={2.2} />
            <span className="hidden md:inline">{t.cart.title}</span>
            {cartCount > 0 && (
              <span
                className={cn(
                  "tabular text-[var(--text-2xs)] leading-none font-bold px-1.5 min-w-[20px] h-5 rounded-full inline-flex items-center justify-center",
                  cartOpen
                    ? "bg-[color:var(--color-cta-deep)] text-[color:var(--color-accent)]"
                    : "bg-[color:var(--color-accent)] text-[color:var(--color-text)]",
                )}
                aria-hidden
              >
                {cartCount}
              </span>
            )}
          </button>

          <SessionMenu />
        </div>
      </div>
    </header>
  );
}
