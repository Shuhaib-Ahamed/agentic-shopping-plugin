# Surface override: chat (the shell)

This file overrides `master.md` for the chat shell, which is the entire app. The build prompt is explicit (Section 14) that this is a full-screen, immersive conversational surface, not a marketing landing page.

## Layout

Full viewport, no scroll on the shell. Two zones inside the shell:

- Conversation column. The conversation stream and composer. Owns scrolling.
- Action surface column. Renders the latest action event (`products`, `product_detail`, `cart`, `delivery_quote`, `checkout`, `order_confirmed`, etc.). Scrolls independently.

Breakpoints:

- < 768px (mobile). Single column. The conversation owns the viewport. Action surface mounts as a Radix Sheet from the bottom, fills 92vh, dismisses by drag handle or close button. Pinned composer above the iOS home indicator using `env(safe-area-inset-bottom)`.
- 768px to 1279px. Single column up to 720px wide, centered. Action surface still slides in as a sheet from the right at 480px width.
- >= 1280px. Two-column. Conversation column 720px (with 64px horizontal gutters). Action surface 480px, sticky to the right, with a 24px gap.

The shell uses `--color-background` (`#FAFAF9`) with a very subtle warm radial gradient behind the empty state only (turned off once messages exist). No glass on the shell itself.

## Empty state (acts as the hero)

This is the first thing a judge sees, so it carries the personality.

Composition top to bottom:

1. Persona greeting block: large `--text-3xl` display headline that uses the agent's name and a warm one-line invitation. Sub-line at `--text-lg` in `--color-text-muted` explains the agent in plain language.
2. Suggested-prompt row: 4 to 6 `SuggestionChip` molecules, horizontal scroll-snap on mobile, wrapping flex on desktop. Examples come from `i18n` (one English, one Sinhala, one Tamil, one Tanglish, one gift, one occasion). Chips have a soft gold halo on hover.
3. Categories grid: cards generated from `kapruka_list_categories`. 2 cols mobile, 4 cols desktop. Each card is image-led if the API returns an image, otherwise a gradient warm-stone placeholder with the category name in display type. Hover lift 2px.

The empty state IS the only place Liquid Glass appears on the shell. The persona greeting block sits on a warm gradient with a glass panel using `--glass-tint` and `--shadow-glass`. Glass panel becomes a flat warm-stone bubble once the first user message arrives (no glass on the conversation surface itself).

## Conversation column

Background: `--color-background`. No glass.

Message stream:

- New messages slide in from the bottom using `transform: translateY(8px)` + `opacity: 0 → 1` on `--motion-surface`. Stagger by 30ms across multiple events from the same turn so a `message` then `products` feels musical, not simultaneous.
- Auto-scroll to the latest message only if the user is within 80px of the bottom; otherwise show a small "new messages" pill that scrolls on click.
- Reduced motion: skip stagger and translate; use opacity-only.

Message bubble (`MessageBubble` molecule):

- User bubble. Background `--color-primary` (`#1C1917`), text `#F5F0E6`, border-radius `--radius-bubble` with the bottom-right corner reduced to 6px. Right-aligned, max-width 80% on mobile and 540px on desktop.
- Assistant bubble. Background `--color-surface-warm`, text `--color-text`, border `1px solid --color-border`, bottom-left corner reduced to 6px. Left-aligned, max-width 80% / 600px. Avatar `Avatar` atom (32px) sits to the left.
- Message bubble has `font-family: var(--font-body)`, `font-size: var(--text-base)`, `line-height: 1.5`.
- For `:lang(si)` and `:lang(ta)` bubbles, line-height becomes 1.7 and font-feature-settings honor complex script shaping.
- Bubble padding: 12px 16px. Bubbles never get glass.

Status row (`StatusPill` rendered above the composer when `status` event is in `thinking` or `working`):

- Inline pill: `--color-surface`, border `--color-border`, text `--color-text-muted`.
- A `Spinner` atom (16px) at the leading edge.
- Label comes from the SSE event (e.g., "Looking through Kapruka").
- Animates only opacity. No marquee, no rotating text.

Composer (`Composer` organism, lives at the bottom):

- Sits inside the conversation column, pinned to the bottom with a 16px gutter on mobile, 24px on desktop.
- Background `--color-surface`, border `1px solid --color-border`, radius `--radius-lg`, shadow `--shadow-md`.
- `Input` atom inside has `font-size: var(--text-base)` (>=16px on mobile to stop iOS zoom), `inputMode="text"`, `autoComplete="off"`, `enterKeyHint="send"`.
- Send button is the CTA gold `IconButton` (44x44 minimum). Disabled when the input is empty or while the previous turn is still streaming.
- Above the input, an inline language quick-toggle (EN, සි, தமி) that updates `context.locale`. Changing locale also changes the `lang` attribute so `:lang(si)` font selection takes effect.
- `Enter` submits, `Shift+Enter` inserts a newline. On submit, the composer shows an inline spinner inside the send icon.
- Composer NEVER renders error inside itself; errors emit as a recoverable `error` event and render as a transient toast above the composer (auto-dismiss 6s, manually dismissible, keyboard reachable).

## Action surface column

Background: `--color-background`. Action organisms inside (`ProductCarousel`, `ProductDetailSheet`, `CartPanel`, `DeliveryForm`, `CheckoutPanel`, `SuccessCard`) carry their own styling per their page overrides. The column itself only provides:

- A title bar with the current action's label and a close affordance (mobile sheet only).
- A scroll container that respects `scroll-padding-block: 16px` so anchored items are not hidden behind the bar.

Transition between action surfaces (e.g., cart -> delivery quote -> checkout):

- Cross-fade with a slight vertical offset (8px), `--motion-surface`. Old surface fades to opacity 0 over 200ms while the new surface enters over 500ms.
- Reduced motion: instant swap.

## Hit targets and accessibility

- Composer send button: 44x44 minimum, 44x44 expanded hit area.
- Suggestion chips: 40px min height, 12px+12px horizontal padding.
- Language quick-toggle: 36px min height per choice, but 44px hit area via padding.
- The conversation column is the focus root on mount; the composer input receives autofocus only on desktop, never on mobile (avoids unwanted keyboard).
- The action surface, when opened on mobile, traps focus via Radix Sheet and returns it to the composer on close.

## Surfaces this shell never renders

- Marketing nav, marketing footer, marketing CTA bar.
- Promotional banners.
- Live chat widget. We are the chat.

## Page-specific anti-patterns

- Do not put glass on the conversation background. Reading suffers.
- Do not animate message bubbles' background color on hover. Bubbles are not interactive in v1.
- Do not auto-scroll on every event. Only when the user is near the bottom.
- Do not block the composer while the model is streaming a `message`; only block while submitting a new turn.
