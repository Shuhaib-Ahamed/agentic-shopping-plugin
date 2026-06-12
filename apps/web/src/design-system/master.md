# Kapruka Shopping Agent, master design system

> Per Section 4b of the build prompt. If `design-system/pages/<surface>.md` exists for the surface you are building (`chat`, `product`, `checkout`), it overrides the rules in this file. Otherwise these rules apply.

Project: Kapruka Shopping Agent (Kapruka Agent Challenge 2026)
Surface model: a single full-screen chat shell that hosts dynamic action surfaces. There is no marketing page pattern; the chat is the product.

---

## 1. Visual direction

Mood: warm Sri Lankan premium, image-led, conversational. The look reads as a curated boutique, not a marketplace dump. Glass is an accent, not a wallpaper.

Style: Liquid Glass, scoped. Use it on action surfaces (product detail sheet, checkout panel, success card, empty-state hero) where it heightens the moment. Do not use it on message bubbles, the composer, the message list background, or category chips, since text density and reading comfort beat decoration there.

Tone of motion: 250 to 350 ms for transient micro-interactions (hover, press, ripple). 400 to 600 ms for surface reveals (sheet open, success card entry) using `cubic-bezier(0.16, 1, 0.3, 1)` for a soft settle. Always behind `prefers-reduced-motion`.

---

## 2. Color palette

Direction: **deep ocean teal + warm sand**. The CTA is a confident coastal teal; the surfaces are warm sandstone that flatters product photography. Glass tint stays neutral white so it picks up whatever it sits on. Two semantic accents stack on top: amber for perishable warnings, terracotta for low stock.

| Role | Hex | CSS var | Use |
|------|-----|---------|-----|
| Primary (ink) | `#0F172A` | `--color-primary` | Headings, dark surfaces, user-message text |
| Primary muted | `#334155` | `--color-secondary` | Body emphasis, metadata |
| CTA (deep teal) | `#0E7490` | `--color-cta` | Pay button, send button, prominent CTAs |
| CTA hover | `#155E75` | `--color-cta-hover` | Pressed CTA, focus ring on accent |
| Background (warm sand) | `#F8F4EC` | `--color-background` | App background |
| Surface | `#FFFFFF` | `--color-surface` | Cards, composer, raised regions |
| Surface warm | `#EFE6D2` | `--color-surface-warm` | Assistant bubble background, empty-state hero base |
| Text | `#0F172A` | `--color-text` | Primary text |
| Text muted | `#475569` | `--color-text-muted` | Captions, helper text, timestamps |
| Border | `#E5D9C2` | `--color-border` | Card borders, dividers (warm sandstone) |
| Perishable warn | `#B45309` | `--color-warn` | Cake/flower/combo delivery warning |
| Perishable warn bg | `#FEF3C7` | `--color-warn-bg` | Warning pill background |
| Stock low | `#9A3412` | `--color-stock-low` | Low stock badge |
| Success | `#15803D` | `--color-success` | Order confirmed, paid, in-stock badge text |
| Success bg | `#DCFCE7` | `--color-success-bg` | Success card top band |
| Error | `#B91C1C` | `--color-error` | Failed payment, expired link |
| Glass tint | `rgba(255,255,255,0.55)` | `--glass-tint` | Action surface glass fill |
| Glass border | `rgba(255,255,255,0.65)` | `--glass-border` | Glass surface highlight border |
| Teal wash | `linear-gradient(135deg, #0E7490 0%, #155E75 100%)` | `--gradient-teal` | Hero accent bands, success card top band variant |

Contrast rule: every text-on-background pair must meet WCAG AA (4.5:1 normal, 3:1 large/icon). The glass tint is only valid over a textured warm background (gradient or photographic) where it lifts to a measurable 4.5:1 with `--color-text`. Solid white must be the fallback when text contrast would drop.

---

## 3. Typography

The font stack must render Sinhala and Tamil correctly because they are the highest-value bonus and a core supported language. Rubik and Nunito Sans do not cover Sinhala or Tamil; we add Noto Sans Sinhala and Noto Sans Tamil as siblings, not as last-resort fallbacks, so the browser picks the right font per glyph automatically.

Display (headings, hero, large pricing): `Rubik` 500/600/700, with `Noto Sans Sinhala` 600 and `Noto Sans Tamil` 600 as font-family siblings.

Body (everything else): `Nunito Sans` 400/500/600/700, with `Noto Sans Sinhala` 400/500/600 and `Noto Sans Tamil` 400/500/600 as siblings.

CSS font-family declarations:

```css
--font-display: "Rubik", "Noto Sans Sinhala", "Noto Sans Tamil",
                ui-sans-serif, system-ui, sans-serif;
--font-body:    "Nunito Sans", "Noto Sans Sinhala", "Noto Sans Tamil",
                ui-sans-serif, system-ui, sans-serif;
```

Antialiasing and rendering, applied on `html` per Vercel guidelines:

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
```

Scale (clamp-based so it survives Sinhala and Tamil's slightly taller line boxes):

| Token | Value | Use |
|-------|-------|-----|
| `--text-2xs` | `clamp(0.6875rem, 0.65rem + 0.1vw, 0.75rem)` | Timestamps, badges |
| `--text-xs` | `clamp(0.75rem, 0.71rem + 0.15vw, 0.8125rem)` | Captions |
| `--text-sm` | `clamp(0.875rem, 0.83rem + 0.2vw, 0.9375rem)` | UI labels |
| `--text-base` | `clamp(1rem, 0.95rem + 0.2vw, 1.0625rem)` | Body, messages, form input (>=16px on mobile, prevents iOS zoom) |
| `--text-lg` | `clamp(1.125rem, 1.06rem + 0.3vw, 1.25rem)` | Product titles, section headers |
| `--text-xl` | `clamp(1.375rem, 1.25rem + 0.5vw, 1.625rem)` | Order summary total |
| `--text-2xl` | `clamp(1.75rem, 1.55rem + 0.8vw, 2.25rem)` | Empty-state hero subhead |
| `--text-3xl` | `clamp(2.25rem, 1.95rem + 1.3vw, 3rem)` | Empty-state hero headline |

Line heights: body `1.55`, headings `1.18`, message bubble `1.5`. Letter spacing on display headings `-0.01em`. Sinhala and Tamil get a slightly looser line height of `1.7` on the message bubble (handled via the `:lang(si)` and `:lang(ta)` selectors in `tokens.css`).

Line length: max 65 characters per line in the conversation column. Action surface text wraps to its own container.

---

## 4. Spacing, radius, elevation

Spacing scale (from generator, kept). Use the same tokens in `tokens.css`.

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |

Radius scale, expanded from the generator with two extras the chat needs.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 6px | Chips, badges |
| `--radius-sm` | 10px | Inputs, small buttons |
| `--radius-md` | 14px | Cards |
| `--radius-lg` | 20px | Action surface sheets, hero |
| `--radius-bubble` | 22px | Message bubble (with one 6px corner toward speaker) |
| `--radius-full` | 9999px | Pills, avatars, countdown |

Elevation (shadow). One set, used sparingly. Glass surfaces use elevation `lg` with an extra inner highlight border in addition to the shadow.

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(28,25,23,0.06)` |
| `--shadow-md` | `0 6px 18px -8px rgba(28,25,23,0.12)` |
| `--shadow-lg` | `0 20px 40px -16px rgba(28,25,23,0.18)` |
| `--shadow-glass` | `0 24px 50px -20px rgba(28,25,23,0.22), inset 0 1px 0 0 rgba(255,255,255,0.55)` |

---

## 5. Motion tokens

| Token | Value | Use |
|-------|-------|-----|
| `--motion-fast` | 150ms `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus, press |
| `--motion-base` | 250ms `cubic-bezier(0.4, 0, 0.2, 1)` | Color, opacity micro-interactions |
| `--motion-soft` | 350ms `cubic-bezier(0.16, 1, 0.3, 1)` | Card hover lift, suggestion chip press |
| `--motion-surface` | 500ms `cubic-bezier(0.16, 1, 0.3, 1)` | Message entry, action surface reveal, sheet open |
| `--motion-celebrate` | 700ms `cubic-bezier(0.16, 1, 0.3, 1)` | Success card on `order_confirmed` |

Only compositor-friendly properties may animate: `transform`, `opacity`, `filter`. Never `width`, `height`, `top`, `left`, `box-shadow` (use `filter: drop-shadow` if you must animate the look of elevation).

Reduced motion: when `(prefers-reduced-motion: reduce)`, all durations collapse to `1ms` and stagger/parallax effects are removed. Opacity transitions are still allowed.

---

## 6. Numbers, currency, i18n

Numbers: numerals always. Insert a non-breaking space between number and unit (`12 items`, `4.5 km`, `30 min`). Use tabular-nums for price columns and the countdown so digits do not jitter (`font-variant-numeric: tabular-nums`).

Currency: format per request `currency` field, never mix in one view. LKR is shown as `Rs 2,450` with a non-breaking space, two-decimal optional. USD is shown as `$12.99` with two decimals always. The `Price` atom is the only place currency formatting is implemented.

Locale-aware layout: every action surface and form field is sized so Sinhala and Tamil text (often 1.15 to 1.3x the Latin string length) does not overflow. Test strings under `i18n/si.ts` and `i18n/ta.ts` should drive layout, not English. Buttons must use min-content sizing with horizontal padding, never fixed widths.

Truncation: only the product card title may truncate (single line with ellipsis). Message bubbles and form labels never truncate.

---

## 7. Component anatomy (atoms and molecules summary)

These are the only primitives any organism may reach for. Atomic design (Section 14 of the build prompt) requires that organisms compose these; never write inline styles equivalent to one of these.

Atoms: `Button` (variants: primary, secondary, ghost, icon), `IconButton`, `Input`, `Badge` (variants: stock, perishable, sale, new), `Price`, `Spinner`, `Skeleton`, `Avatar`.

Molecules: `MessageBubble`, `SuggestionChip`, `QuantityStepper`, `ProductCard`, `CartLineItem`, `CityAutocompleteField`, `DatePickerField`, `CountdownPill`.

Behavior baselines that every atom and molecule must satisfy (Vercel guidelines):

- Hit target: 24px minimum visual, 44px minimum on touch. Expand hit area with a transparent extension when the visual is smaller (icon buttons in the composer).
- Focus: `:focus-visible` ring of `2px` solid `--color-cta` with `2px` offset on a `--color-background`-colored halo. Never `outline: none` without an alternate.
- Keyboard: WAI-ARIA patterns for each role. Composer Enter submits, Shift+Enter inserts newline.
- Async: every async control has a disabled-while-pending state with a Spinner of the same color tone.
- Loading: every async surface has an explicit Skeleton with the same layout box (no layout shift).
- Empty and error: every action surface has an explicit empty state and an explicit recoverable error state.

---

## 8. Anti-patterns specific to this build

These extend the generator's default anti-patterns.

- No generic purple gradient anywhere. We use warm-stone + gold.
- No three-card feature grid. We are not a marketing site.
- No "AI" lightning bolts, sparkles, or chat-bubble icons as branding. The agent has a name; use the name.
- No emojis as UI iconography. Lucide icons only. (Inline emoji in assistant copy is allowed, sparingly, as voice.)
- No `width` or `height` transitions on cards, message bubbles, or chips. Compositor-only.
- No fixed widths on buttons or chips. Sinhala and Tamil will overflow.
- No `outline: none` without a `:focus-visible` replacement.
- No spinners over 32px diameter inside the conversation column; the column should feel calm.
- No dark mode in v1. Dark mode is a post-deadline upgrade. Build to look great in light mode first; do not desaturate light tokens to fake dark.

---

## 9. Pre-merge checklist (override of the generator's checklist)

Combined Vercel guidelines + this system.

- [ ] Sinhala and Tamil strings render in their respective fonts (verified by switching locale in the running app).
- [ ] No em dashes anywhere in code, copy, comments, commits.
- [ ] Numbers and currency use the `Price` and number formatters; never inline.
- [ ] Every interactive element has `cursor: pointer`, a visible `:focus-visible` ring, and a 44px touch target on mobile.
- [ ] Every async surface has loading, empty, and recoverable error states.
- [ ] Animations use `transform` and `opacity` only and honor `prefers-reduced-motion`.
- [ ] Images use explicit `width`/`height` or `aspect-ratio` to prevent CLS, and lazy-load below the fold.
- [ ] Mobile input font size is >= 16px. Forms use real `<label>`, `inputMode`, `autoComplete`, inline validation.
- [ ] `/web-interface-guidelines` over `apps/web/src` reports no outstanding findings.
- [ ] TypeScript strict passes. No `any` without inline justification.
