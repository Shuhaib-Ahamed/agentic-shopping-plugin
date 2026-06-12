# Surface override: checkout (delivery, gift, pay, success)

Overrides `master.md` for the final stretch of the flow. Two principles:

- The shopper must feel safe. Trust signals (read-back totals, expiry, recipient summary) are loud, not whispered.
- The 60-minute pay link is a real constraint. The countdown is honest and prominent.

## `DeliveryForm` (organism)

Mounts when a `request_info` event with `intent: "delivery"` arrives.

Layout: single column, max 540px on desktop, full width on mobile. Each field stacked, label-on-top.

Fields (driven by the SSE event payload; these are the expected ones):

- Recipient name (`type: "text"`, `autoComplete: "name"`, `inputMode: "text"`, required).
- Recipient phone (`type: "tel"`, `autoComplete: "tel"`, `inputMode: "tel"`, required). Inline validation: must start with a Sri Lankan format the agent accepted; if invalid, show below-field error in `--color-error`.
- Address line 1, optional line 2 (`autoComplete: "address-line1"`, `address-line2`).
- City. Uses `CityAutocompleteField` molecule. Debounced 250ms. Calls `/api/chat` only indirectly (the agent owns this), so the field actually fires a UI event that triggers a `kapruka_list_delivery_cities` lookup. UI-wise: a combobox per WAI-ARIA combobox pattern (input + listbox + activedescendant). Accepts Sinhala, Tamil, romanized spellings (the matched canonical name is what gets stored).
- Postal code (`autoComplete: "postal-code"`, optional).
- Delivery date. Uses `DatePickerField` molecule. Min = today + 1 day in Asia/Colombo TZ. Max = today + 60 days. Native `<input type="date">` on mobile; Radix-based date picker on desktop with the same value semantics. `inputMode="numeric"`.

Behavior:

- Enter submits the form (Vercel guideline).
- Submit button is `--color-cta` primary, full width on mobile, auto-width on desktop. Disabled while pending with a Spinner. Disabled-while-pending always.
- Validation: inline, per field, on blur and on submit. Server-side delivery rejection comes back as a `delivery_quote` error or an `error` event; the form re-enables and surfaces the reason.

## `GiftMessageField` (organism, optional)

Mounts when a `request_info` event with `intent: "gift"` arrives, or inline inside the `CheckoutPanel` when the model is asking permission to add one.

- A collapsible block with a toggle "Add a gift message" (`Switch` from Radix).
- When open: a textarea, max 200 characters, with a live counter. Counter color shifts to `--color-warn` under 20 characters left.
- Helper text in `--text-xs` muted: "We print this on the card."
- Save button uses CTA gold.
- No glass.

## `CheckoutPanel` (organism, glass surface)

Mounts on the `checkout` event with `summary`, `payUrl`, `orderId`, `expiresAt`.

Container:

- Glass: `--glass-tint`, `--shadow-glass`, radius `--radius-lg`, 1px top inner highlight.
- Width: full inside the action surface column.

Anatomy (top to bottom):

1. Order summary header. `--text-lg` display, "Order summary" from `i18n`. Subtext: order id in monospace with a copy IconButton.
2. Line items. Each `CartLineItem` shows thumbnail (40x40 rounded `--radius-sm`), title, qty, price. Tabular numerals on prices.
3. Subtotal row. Muted label, tabular numerals.
4. Delivery row. Muted label, the quoted rate in tabular numerals. If there is a perishable warning attached upstream, the warning pill (from `product.md`) is included here too, just above the row.
5. Total row. `--text-xl` total, weight 700, tabular numerals. This is the read-back total; it is the loudest number on the screen.
6. Recipient summary. Two columns on desktop: name + phone on the left, address + city + date on the right. On mobile, stacked. Edit IconButton to top right that emits a new `request_info` (the model handles the back-and-forth).
7. Gift message preview (if any). Italic, `--color-text-muted`, with a small quote-mark icon to set it apart.
8. `CountdownPill` (see below) above the pay button.
9. Pay button. Full-width primary CTA, label from `i18n` ("Pay securely on Kapruka"). On click, opens `payUrl` in a new tab (`rel="noopener noreferrer"`) and the SPA begins polling `/api/order-status?orderId=`.
10. Below the pay button, a muted line "Pay link expires in 60 minutes. Prices locked."

## `CountdownPill` (molecule)

Pill that shows time until `expiresAt`, ticking every 1s.

- Resting color: `--color-surface` background, `--color-text-muted` text, border `--color-border`. Clock icon at the leading edge.
- Under 5 minutes: background `--color-warn-bg`, text `--color-warn`, border `--color-warn`. Subtle pulsing opacity on the icon only (1.0 to 0.6 over 1.2s) so it draws the eye without strobing.
- Under 1 minute: text `--color-error`, border `--color-error`, the time format switches from `MM:SS` to a clearer `0:42 left`.
- At 0: pill collapses; the `CheckoutPanel` swaps to an inline recoverable error with a CTA "Create a fresh order" that emits a tagged user turn so the agent re-creates the order.
- Time uses `tabular-nums` so digits do not jitter.
- Reduced motion: no pulse.

## Polling and payment redirect

UX rules (the technical contract is in build prompt Section 14):

- The pay button never closes or replaces the `CheckoutPanel`. It opens a new tab.
- An inline status row appears under the pay button: "Waiting for payment..." with a Spinner, plus a small "I paid" button as an escape hatch if the polled status hangs.
- On `paid`, the panel cross-fades to `SuccessCard` over `--motion-celebrate`.
- On expiry or `failed`, panel shows the recoverable error.

## `SuccessCard` (organism)

Mounts on the `order_confirmed` event.

Anatomy (top to bottom):

1. A short success header band using `--color-success-bg` with `--color-success` text. Lucide CheckCircle2 icon. Big copy: order id in display font.
2. Read-back of the order summary (same `CartLineItem` rows, total).
3. Tracking timeline. A vertical list of steps. Each step has:
   - A circle node (12px) connected by a 2px dotted vertical line.
   - Step label (`text-base`, weight 600).
   - Timestamp (`text-xs`, muted, locale-formatted, includes timezone short code).
   - Steps that have happened are filled `--color-cta`; the current step is gold ringed; future steps are muted.
4. Tracking link button (secondary, ghost) that opens `trackingUrl` in a new tab if present.
5. CTA chip "Shop again" that resets the action surface and focuses the composer with a friendly prompt.

Entry animation: `--motion-celebrate`, opacity + a brief 1.02 scale settle on the success header band. Reduced motion: opacity only.

## Recoverable errors

Every checkout error state must:

- State plainly what failed (no system messages).
- Offer one primary recovery CTA.
- Preserve as much of the user's data as possible (delivery info stays in the form, the cart stays in the cart).

Visual:

- Inline error block at the top of the surface in `--color-error` text on `--color-surface` with a `--color-error` left border (4px), radius `--radius-md`.
- Lucide AlertCircle icon.
- Primary CTA in `--color-cta`. Secondary "Cancel" is a ghost button.

## Page-specific anti-patterns

- Do not bury the total. It must be the biggest text in the panel.
- Do not silently expire the link. Show the countdown the whole time it is alive.
- Do not auto-retry `kapruka_create_order` if creation fails. Show the error and let the shopper retry.
- Do not capture card details in chat. Payment is the pay link only.
- Do not animate the total on change. A subtle 200ms fade is enough; large jumps in numbers feel manipulative.
- Do not put the "I paid" escape hatch above the pay button. It must be subordinate, not competing for the click.
