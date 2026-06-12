# Surface override: product (cards, carousel, grid, detail sheet)

Overrides `master.md` for everything that renders a product. Images are the star; layout serves the image.

## `ProductCard` (molecule)

Anatomy (top to bottom):

1. Image, 4:3 aspect. Use `<img>` with explicit `width`/`height` attributes or a `aspect-ratio: 4 / 3` container. Lazy loading below the fold (`loading="lazy"`, `decoding="async"`). Object-fit cover. Background `--color-surface-warm` while loading so there is never a blank box.
2. Stock badge slot (top-right of image). Out-of-stock: `Badge` with `--color-stock-low` text on `--color-warn-bg`. Low stock: same colors with text from `i18n`. In-stock: no badge.
3. Body. Padding `--space-md`. Title in body font weight 600, single line, ellipsis on overflow. Below the title, a row with `Price` atom (LKR or USD per context) on the left and an `Add` IconButton on the right.

Container:

- Background `--color-surface` (`#FFFFFF`).
- Border `1px solid --color-border`.
- Radius `--radius-md`.
- Shadow `--shadow-sm` at rest, `--shadow-md` on hover.
- Hover: `transform: translateY(-2px)` over `--motion-soft`. Never animate width/height/shadow size. No glass on the card body, only on the detail sheet.
- Cursor: pointer. Whole card is the link/CTA; the Add IconButton is a secondary click target inside.

Skeleton:

- Same outer box, same 4:3 image area, two skeleton lines (title + price). 1.2s shimmer using `--motion-base` opacity wave. Never use transform-based shimmer that breaks scroll smoothness.

Empty (search returned zero results):

- Use a `ProductCard`-shaped empty: same outer box, an icon centered, helper text from `i18n`, and a CTA chip "Try a different word" that focuses the composer.

## `ProductCarousel` (organism)

When the model calls `present_products` with `layout: "carousel"`:

- Horizontal scroll container, `scroll-snap-type: x mandatory`, snap on each card's left edge.
- Card width: 240px mobile, 280px tablet, 300px desktop. Gap 16px.
- Two ghost arrow buttons (Lucide ChevronLeft/Right) appear on hover on desktop only. Mobile relies on touch scroll.
- Optional title row above the carousel. Title left, "see all" link right (opens a `present_products` with grid layout).
- Reduced motion: arrows still work; they do a near-instant scroll with smooth behavior disabled.

## `ProductGrid` (organism)

When the model calls `present_products` with `layout: "grid"`:

- 2 cols at < 480px, 3 cols at >= 768px, 4 cols at >= 1280px. CSS grid, gap 16px on mobile, 20px on tablet, 24px on desktop.
- No virtualization in v1 (the model returns small sets, capped at the search pagination of 3 pages).

## `ProductDetailSheet` (organism, the only product surface that uses glass)

Mounts when the model calls `present_product_detail`.

Container:

- Radix Dialog with a glass overlay (`backdrop-filter: blur(12px) saturate(140%)`) using `--glass-tint`.
- Sheet itself uses `--shadow-glass` and a 1px white inner highlight border (top edge only).
- Radius `--radius-lg`.

Layout (top to bottom on mobile, side by side >= 1024px):

1. Image gallery, 4:3 hero, with a horizontal scrollable strip of thumbnails (44px hit target each) underneath. Thumbnails get a `--color-cta` selected ring.
2. Title (display, `--text-2xl`), category breadcrumb (muted), price (`--text-xl`, tabular numerals).
3. Variant chips. Each variant uses a `Chip` (a `SuggestionChip` styled variant) with the variant label. Selected chip has `--color-cta` border and `--color-cta-hover` text.
4. Shipping note. `--text-sm`, muted, with a small Lucide icon.
5. Description (if returned). Body text, 65ch max.
6. Primary CTA "Add to cart" in CTA gold (full width on mobile, auto width on desktop). Secondary CTA "Open on Kapruka" as a ghost link to the product URL.

Behavior:

- Open animation: `--motion-surface`, `opacity` + `translateY(12px)`.
- Focus is trapped inside, returns to the trigger card on close.
- ESC closes the sheet.
- All images use `loading="eager"` for the hero, `loading="lazy"` for thumbnails not yet in view.

## Perishable warning (cake, flower, combo)

When the model emits a `delivery_quote` with `perishableWarning`, render the warning **on the product detail sheet and the delivery quote card**, both:

- A pill row at the top of the relevant card with a Lucide `AlertTriangle` icon, text `--color-warn`, background `--color-warn-bg`, border `1px solid --color-warn`.
- Text wraps; never truncate.
- Pill is keyboard-focusable with `tabindex="0"` and `role="status"` because it carries new information.

## Image fallbacks and CLS

- Every image element has `width`/`height` attributes or an explicit `aspect-ratio` container.
- `<img>` fallback on error: render a soft warm-stone gradient with the product title centered in display font. Never an alt-text-only broken-image icon.

## Page-specific anti-patterns

- Do not put glass on the `ProductCard`. It hurts contrast on the warm background and is a perf hit at carousel scale.
- Do not scale the image on hover. Lift the card instead.
- Do not animate the price on add-to-cart. Animate the IconButton (a brief 0.95 scale on press, instant return).
- Do not hide the stock badge behind the image; it must be readable at glance.
