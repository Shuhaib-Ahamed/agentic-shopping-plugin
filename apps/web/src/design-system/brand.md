# Juno AI — Brand Kit

> Canonical brand definition for the Juno shopping companion inside Kapruka.
> This file is the source of truth. `tokens.css`, `styles.css`, and every
> component must agree with it. When in doubt, this file wins.

## 1. Who Juno is

Juno is the friendly shopping companion that lives inside Kapruka. A consumer
shopping in Sri Lanka opens the chat, says what they want in English / Sinhala /
Tamil, and Juno picks the products, handles the gift message, the delivery
address, and the payment link. The product is a chat, not a catalogue browser.

**Voice:** warm, helpful, brief. Never corporate. Never breathless. Uses simple
sentences, avoids buzzwords, treats every shopper as a friend who came to ask a
favour.

**What we are NOT:** a SaaS landing page, a dashboard, an enterprise console,
or an Awwwards entry. Juno is consumer-facing daily software.

## 2. Design read

Reading this product as: **AI shopping chat product for Sri Lankan consumers,
with a playful Lóvi-style language, leaning toward a violet + saffron palette,
glass chips, mascot-led trust, and spring-physics motion.**

| Dial             | Value | Why                                               |
| ---------------- | ----- | ------------------------------------------------- |
| DESIGN_VARIANCE  | 6     | Playful but legible. Chat needs to be readable.   |
| MOTION_INTENSITY | 7     | Spring physics, parallax storefront, mascot life. |
| VISUAL_DENSITY   | 4     | Editorial spacing. Generous breathing room.       |

## 3. Color spine (one accent, locked across the page)

The page has **two brand colors and one neutral**. Everything else is semantic.

| Token                  | Hex     | Role                                                      |
| ---------------------- | ------- | --------------------------------------------------------- |
| `--color-violet`       | #4A2E82 | Brand spine. Header pill, user bubble, primary text-CTAs. |
| `--color-violet-light` | #6B4BA0 | Secondary violet for gradients only.                      |
| `--color-violet-deep`  | #2C1B52 | For text on violet-tinted surfaces (lavender bubble).     |
| `--color-accent`       | #F9B233 | Saffron. PRIMARY click-CTA (Send, Add, Proceed).          |
| `--color-accent-dark`  | #D99318 | Hover state for saffron CTA.                              |
| `--color-lavender`     | #ECE6F7 | Assistant bubble fill, soft tints, hover surfaces.        |

**Why the split?** Violet is _structural_ — surfaces where the user is reading
(header, user bubble). Saffron is _actionable_ — surfaces where the user
clicks. Both come from the existing Kapruka mascot. This is not a Lila/AI-purple
gradient site; the violet is a brand color with a stated origin.

### Neutrals

| Token                     | Hex     | Role                            |
| ------------------------- | ------- | ------------------------------- |
| `--color-background`      | #FAF7F5 | Warm off-white shell.           |
| `--color-background-wash` | #F3E8EC | Soft pink wash at top of shell. |
| `--color-surface`         | #FFFFFF | Pure white cards.               |
| `--color-surface-warm`    | #F5F3FB | Faint lavender wash (composer). |
| `--color-text`            | #161624 | Near-black ink.                 |
| `--color-text-muted`      | #6B6B80 | Secondary text.                 |
| `--color-border`          | #ECE9F1 | Hairline.                       |

**Color consistency lock:** once we ship a page, every accent on it is violet
or saffron. No turquoise CTA in section 7, no rose status badge in the footer.

## 4. Typography

- **Display:** Bricolage Grotesque (variable, 12..96, weights 500–800).
- **Body:** Inter.
- **Sinhala / Tamil:** Noto Sans Sinhala, Noto Sans Tamil — looser line-height
  (1.7) when `lang="si"` or `lang="ta"`.
- **Mono:** ui-monospace stack (for prices when tabular numerals are needed —
  prefer `font-variant-numeric: tabular-nums` on Inter).

**Italic descender clearance:** any italic display word containing `y g j p q`
gets `leading-[1.1]` minimum + `pb-1` reserve. The Bricolage italic descenders
are pronounced.

**No serif default.** Bricolage Grotesque is a sans display. Do not reach for
Fraunces / Instrument Serif / Cormorant. We do not have a serif in the type
stack and we do not want one.

## 5. Iconography

- **Allowed:** `lucide-react` (project-wide, already vendored everywhere).
  This overrides the design-taste-frontend default; the project standardised
  on Lucide before this skill was applied and migrating would be churn.
- **Stroke width lock:** `2` for navigation/composer chrome, `2.4` for chips
  and labels, `3` only on micro icons (`Plus`, `Sparkles` at 11–12px).
- **Never hand-roll SVG icons.** If a glyph is missing, install a second
  library or compose from primitives. The JunoMark mascot is an exception —
  it is brand identity, not iconography.

## 6. Mascot — JunoMark

- The friendly chat bubble with eyes is Juno's mark. Always shown in either:
  - Full color: white bubble, violet outline, saffron status dot, dark eyes.
  - Mono: single-color silhouette over a colored surface (assistant bubble
    avatar, dark CTA backgrounds).
- **Rotation:** the hero mascot tilts `-10deg` at rest. Hover lifts it to
  `-4deg` and scales 1.04. Do not rotate the mascot in any other context.
- **Status dot pulse:** the saffron dot above the bubble animates `pulse` only
  when `status="thinking"` or `status="working"`. Idle = static dot.
- **Size discipline:** assistant avatar is 40px. Hero is fluid via Tailwind
  responsive widths (`w-16 → w-36`). Never use the mascot below 24px — the
  smile collapses.

## 7. Motion

- **Library:** import from `motion/react` (not `framer-motion`). Both packages
  are installed but `motion/react` is the forward path. Existing
  `framer-motion` imports are legacy; new components must import from
  `motion/react`. We will sweep existing imports during this redesign.
- **Spring tokens:** see `src/lib/motion.ts`. Use named springs (`gentle`,
  `snappy`, `sheet`, `tap`) — do not invent ad-hoc spring configs.
- **Reduced motion is a hard requirement.** Every component that animates above
  `MOTION_INTENSITY: 3` MUST honor `useReducedMotion()` and degrade to static.
  The global CSS reduce rule kills `animation-duration` and `transition-
duration`, but JS-driven Motion components also need the explicit hook.
- **No `window.addEventListener('scroll')`.** Use `useScroll()`, IntersectionObserver,
  or CSS scroll-driven animations.
- **What moves on this product:**
  - Hero mascot: rest tilt + hover return.
  - Hero headline: DiaTextReveal single sweep on mount.
  - Hero parallax storefront: looped horizontal march.
  - Composer beam: BorderBeam on hero state only.
  - Chat bubbles: fade + rise on enter via `fadeRiseVariants`.
  - Trays / banners / chips: slide-up via `ComposerStack` springs.
  - Cart icon: decaying wiggle when a product flies to it.
- **What does NOT move:** product cards in a list (hover lift only — no entry
  cascade more than 60ms), status text, body copy, the topbar pill itself.

## 8. Glass usage

- **`glass-bar`:** the TopBar pill background — violet gradient with the
  saffron radial glow, NOT a frosted glass. The "glass" label is historical.
- **`.suggestion-glass`:** the hero suggestion chips. These are real
  glassmorphism (`backdrop-filter: blur(24px) saturate(180%)`) over the
  storefront parallax. Provide an opaque fallback under `@supports not
(backdrop-filter)`.
- **`prefers-reduced-transparency`:** if browser support reaches this product,
  drop blur and use the opaque fallback. Not currently shipped — TODO.
- **No glass on chat bubbles, product cards, or trays.** Those are solid
  surfaces. Glass is reserved for floating UI over busy backgrounds.

## 9. Shape system (corner-radius lock)

| Token             | Px  | Used on                                             |
| ----------------- | --- | --------------------------------------------------- |
| `--radius-xs`     | 6   | Focus rings, micro chips.                           |
| `--radius-sm`     | 8   | Inline inputs.                                      |
| `--radius-md`     | 12  | Sub-cards, tags.                                    |
| `--radius-lg`     | 16  | Forms.                                              |
| `--radius-xl`     | 22  | Trays, options bar, product cards.                  |
| `--radius-2xl`    | 28  | Composer.                                           |
| `--radius-bubble` | 18  | Message bubbles (with one corner pulled to 4px).    |
| `--radius-full`   | ∞   | Pills (chips, TopBar, primary CTAs, mascot avatar). |

Rule: pills are pills (full radius), cards are 16–22 (`lg`/`xl`), composer is
the largest surface (`2xl`/28). Mixing radii inside a component is allowed only
inside this scale.

## 10. Spacing & layout

- **Column width:** `max-w-[1200px]` for hero, chat, composer.
- **Horizontal padding:** `px-3 md:px-6` on the composer stack.
- **TopBar safe area:** floats with `top-3 md:top-5 inset-x-3 md:inset-x-6`.
  Chat content reserves `pt-[92px] md:pt-[112px]` below it.
- **Hero top padding cap:** the headline MUST land within the first viewport.
  Current `mt-28 sm:mt-32 md:mt-36` violates the hero-top-padding cap and gets
  trimmed in this redesign. Target: `mt-8 sm:mt-10 md:mt-12`.

## 11. CTA hierarchy

Single primary CTA per surface. Saffron rounded `Button` is the primary.
Violet outlined is the secondary. Ghost text-link is tertiary.

- Hero composer send → saffron pill (current).
- Product card Add → saffron pill (current).
- Cart Proceed → saffron pill.
- Checkout Pay → saffron pill (external).
- TopBar Cart toggle → saffron pill when open, ghost-white-on-violet when closed.

**No two CTAs with the same intent on one page.** "Add to cart" + "Buy now"
that do different things is allowed. "Add to cart" + "Add" that do the same
thing is not.

## 12. Locale handling

- English: default.
- Sinhala: `lang="si"`, line-height 1.7.
- Tamil: `lang="ta"`, line-height 1.7.
- The TopBar language picker is a radiogroup with three pills. Active pill is
  saffron with dark ink. Default visible only on `sm:` and up; below that the
  picker collapses (TODO: add a compact menu for mobile).

## 13. Pre-flight reminders (per page)

- ZERO em-dashes (`—`) anywhere visible.
- Hero in first viewport. Headline ≤ 2 lines. Mascot + headline read as one
  unit.
- One theme — light. Dark mode is not shipped (no `dark:` variants in the tree
  today). Adding it is a separate effort.
- Reduced-motion path tested.
- All numeric prices use tabular numerals.
