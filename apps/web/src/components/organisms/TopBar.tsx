import type { Locale } from "@kapruka/protocol";
import { ShoppingBag } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef } from "react";
import { KaprukaLogo } from "@/components/atoms";
import { pickStrings } from "@/i18n";
import { cn } from "@/lib/cn";
import { useAppStore, selectCart } from "@/store";
import { useFlyToCart } from "./FlyToCart";
import { SessionMenu } from "./SessionMenu";

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
// the secondary accent - used here for the cart badge and the active
// language indicator.
export function TopBar({ className }: TopBarProps) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const cart = useAppStore(selectCart);
  const cartOpen = useAppStore((s) => s.cartOpen);
  const toggleCart = useAppStore((s) => s.toggleCart);
  const t = pickStrings(locale);
  const cartCount = cart.lines.reduce((n, l) => n + l.qty, 0);

  // Fly-to-cart wiring. The cart button registers itself as the anchor so
  // any product card on the page knows where to send its image. shakeKey
  // increments every time a flight lands, which we map to a quick wiggle
  // on the cart icon - feels like the bag is reacting to the impact.
  const { setCartAnchor, shakeKey } = useFlyToCart();
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const wiggleControls = useAnimationControls();

  useEffect(() => {
    setCartAnchor(cartButtonRef.current);
  }, [setCartAnchor]);

  useEffect(() => {
    if (shakeKey === 0) return;
    // Decaying back-and-forth rotation. Reads as a satisfied shimmy, not a
    // panicked shake. Keep the duration short so rapid adds feel responsive.
    void wiggleControls.start({
      rotate: [0, -14, 11, -8, 6, -3, 0],
      transition: { duration: 0.55, ease: "easeOut" },
    });
  }, [shakeKey, wiggleControls]);

  return (
    <header
      className={cn(
        "fixed top-3 md:top-5 inset-x-3 md:inset-x-6 z-[var(--z-sticky)]",
        "mx-auto max-w-[1200px]",
        className,
      )}
    >
      <div className="floating-header flex items-center justify-between gap-2 md:gap-3 pl-3 pr-2 md:pl-6 md:pr-3 h-16 md:h-[72px]">
        <a
          href="/"
          aria-label="Kapruka home"
          className="flex items-center ml-1 md:ml-4 min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
        >
          {/* Bigger Kapruka wordmark - the PNG variant designed for dark
              surfaces is the right read on the violet pill. */}
          <KaprukaLogo height={20} />
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <label className="sm:hidden relative inline-flex items-center" aria-label="Language">
            <span
              className={cn(
                "inline-flex items-center h-9 pl-3 pr-7 rounded-full text-[var(--text-xs)] font-semibold",
                "bg-[color:var(--color-accent)] text-[color:var(--color-text)] shadow-sm",
                "pointer-events-none",
              )}
            >
              {t.composer[LOCALES.find((l) => l.code === locale)?.key ?? "languageEN"]}
            </span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="absolute inset-0 opacity-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-full"
              aria-label="Language"
            >
              {LOCALES.map(({ code, key }) => (
                <option key={code} value={code}>
                  {t.composer[key]}
                </option>
              ))}
            </select>
          </label>

          <div
            className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-white/[0.12] border border-white/20 backdrop-blur-sm"
            role="radiogroup"
            aria-label="Language"
          >
            {LOCALES.map(({ code, key }) => {
              const active = locale === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLocale(code)}
                  // Active state needs near-black text on saffron for WCAG AA
                  // contrast. The parent `.floating-header { color: #fff }` rule
                  // would otherwise win same-specificity cascade against the
                  // Tailwind utility, so the active color is set inline.
                  style={active ? { color: "var(--color-text)" } : undefined}
                  className={cn(
                    "min-h-[30px] px-3 rounded-full text-[var(--text-xs)] font-semibold cursor-pointer",
                    "transition-[background-color,color] duration-150",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    active
                      ? "bg-[color:var(--color-accent)] shadow-sm"
                      : "text-white/85 hover:text-white hover:bg-white/10",
                  )}
                >
                  {t.composer[key]}
                </button>
              );
            })}
          </div>

          <motion.button
            ref={cartButtonRef}
            type="button"
            onClick={toggleCart}
            aria-expanded={cartOpen}
            aria-label={`${t.cart.title}, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            whileHover={{ y: -1 }}
            // Active (cart-open) state puts near-black on saffron for AA contrast;
            // inline color beats the parent `.floating-header` white inheritance.
            style={cartOpen ? { color: "var(--color-text)" } : undefined}
            className={cn(
              "relative inline-flex items-center gap-2 h-11 px-4 rounded-full cursor-pointer",
              "text-[var(--text-sm)] font-semibold",
              "border border-white/25 backdrop-blur-sm",
              "transition-[background-color,color,box-shadow] duration-200 ease-[var(--easing-emphasized)]",
              "hover:bg-white/20",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              cartOpen
                ? "bg-[color:var(--color-accent)] border-transparent shadow-[var(--shadow-accent)]"
                : "bg-white/[0.14] text-white",
            )}
          >
            <motion.span
              animate={wiggleControls}
              style={{ transformOrigin: "50% 50%", display: "inline-flex" }}
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
            </motion.span>
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
          </motion.button>

          <SessionMenu />
        </div>
      </div>
    </header>
  );
}
