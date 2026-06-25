# Juno QE Standards (strict)

This is the canonical pass/fail bar for any Juno regression run. Numbers are budgets, not targets. **A test PASSES only if every measured value lands at or under its budget.** Borderline is FAIL.

Authority: this doc supersedes `AGENTS.md` for QE pass/fail. AGENTS.md remains the source of truth for design rules and ownership.

## 1. Performance budgets

All measurements from a fresh page load on a warm dev server (vercel dev). Cold-start MCP first call gets a one-time pass; subsequent calls must meet budget.

| ID      | Metric                                         | Budget                 | Method                                                                     |
| ------- | ---------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| PERF-1  | First Contentful Paint                         | < 2000 ms              | `performance.timing` or Lighthouse                                         |
| PERF-2  | Largest Contentful Paint                       | < 2500 ms              | PerformanceObserver `largest-contentful-paint`                             |
| PERF-3  | Cumulative Layout Shift                        | < 0.1                  | PerformanceObserver `layout-shift`                                         |
| PERF-4  | Initial bundle (parsed) JS                     | < 600 KB               | Network panel transferSize                                                 |
| PERF-5  | Page TTI (interactive)                         | < 3500 ms              | First time `document.readyState === "complete"` AND main thread idle 50 ms |
| PERF-6  | Router stage latency                           | < 3500 ms warm         | `router.decided.durationMs` in vercel-dev.log                              |
| PERF-7  | First token (response stage)                   | < 2000 ms after submit | wall-clock from `chat.received` to first `token` SSE event                 |
| PERF-8  | Full turn, no tools (greeting/clarify/decline) | < 10000 ms             | `chat.received` → `response.final`                                         |
| PERF-9  | Full turn, with tools (search/cart/delivery)   | < 30000 ms warm        | same; cold-start +10s allowance once                                       |
| PERF-10 | `/api/checkout` deterministic path             | < 5000 ms              | wall-clock                                                                 |
| PERF-11 | `/api/cities` autocomplete                     | < 800 ms               | wall-clock                                                                 |
| PERF-12 | Idle-stream watchdog                           | exactly 30000 ms       | trigger by hanging upstream; verify `onError` fires                        |

## 2. Visual integrity

All measurements on a Chrome viewport. Tokens from `apps/web/src/design-system/tokens.css`.

| ID     | Rule                                                                    | How to check                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| VIS-1  | No raw hex in components                                                | grep `apps/web/src/components` for `#[0-9a-f]{3,8}\b` — must be 0                                                                                                                      |
| VIS-2  | No raw px spacing in components                                         | grep `apps/web/src/components` for inline-style `(padding                                                                                                                              | margin | gap):\s\*\d+px`— must be 0 (allow class names like`p-4` which resolve through Tailwind) |
| VIS-3  | Focus ring visible on every interactive                                 | tab through Composer, chips, cart, product cards, form fields, language radios — capture screenshot at each focus state. Ring must be ≥ 2 px and 3:1 contrast against adjacent surface |
| VIS-4  | Tap target ≥ 44 × 44 px on touch viewports (≤ 1024px wide)              | DOM rect of buttons, chips, send, add-to-cart, cart toggle                                                                                                                             |
| VIS-5  | Tap target ≥ 24 × 24 px on desktop (> 1024px)                           | same                                                                                                                                                                                   |
| VIS-6  | No horizontal page scroll at 320 / 375 / 414 / 768 / 1024 / 1280 / 1536 | document.documentElement.scrollWidth ≤ innerWidth at each                                                                                                                              |
| VIS-7  | Text contrast WCAG AA (4.5:1 normal, 3:1 large ≥18pt or ≥14pt bold)     | sample 8 high-traffic text spans across chat bubble, chips, top bar, composer, product card, cart line, footer disclaimer, error banner                                                |
| VIS-8  | UI contrast WCAG AA (3:1)                                               | sample borders, icons, chip strokes — any UI element conveying state                                                                                                                   |
| VIS-9  | Component vertical rhythm                                               | adjacent siblings in MessageList: bubble → bubble must use a consistent gap (one of `--space-md`/`lg`/`xl`). No ad-hoc magic numbers                                                   |
| VIS-10 | Conversation width cap                                                  | chat thread max-width ≤ `--layout-conversation-max` (760 px) at lg+ viewports                                                                                                          |
| VIS-11 | Sticky composer                                                         | composer remains pinned to viewport bottom across resize from 1280 → 320                                                                                                               |
| VIS-12 | Carousel does not overflow page horizontal axis                         | ProductCarousel `scrollWidth` is internal scroll, not page scroll                                                                                                                      |
| VIS-13 | No layout shift on hover or focus                                       | bounding rect of MessageBubble does not change on hover (allow shadow/transform only)                                                                                                  |
| VIS-14 | Loading states visible during async ops                                 | typing indicator within 800 ms of submit; carousel skeleton during product search; spinner on /api/checkout                                                                            |

## 3. Accessibility (WCAG 2.2 AA)

| ID      | Rule                                                              | How to check                                                                      |
| ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A11Y-1  | All interactive elements keyboard reachable                       | Tab through, verify focus moves in document order without skipping                |
| A11Y-2  | Logical tab order                                                 | Visual order matches DOM tab order across sections                                |
| A11Y-3  | Visible focus on all interactives                                 | (also VIS-3)                                                                      |
| A11Y-4  | Forms use real `<label>` or `aria-label`                          | DeliveryForm, GiftMessageField, Composer textbox                                  |
| A11Y-5  | Disabled state announced                                          | `aria-disabled` mirrors visual disabled (Send button when empty)                  |
| A11Y-6  | Marquee pauses on hover, focus-within, and prefers-reduced-motion | manual check + run agent-browser with reduced-motion emulated                     |
| A11Y-7  | Status changes announced                                          | live region for status pill or chat messages (`aria-live="polite"` or equivalent) |
| A11Y-8  | Color is not the sole signal                                      | error banners include icon or text "Error"; success same                          |
| A11Y-9  | Language attribute on root                                        | `<html lang>` matches active locale                                               |
| A11Y-10 | No keyboard trap                                                  | Escape closes any modal/popover, Tab does not loop inside non-dialog content      |

## 4. User flow correctness

| ID      | Rule                                               | Test                                                                                            |
| ------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| FLOW-1  | Golden discovery → cart → checkout → real order id | end-to-end completes, ORD-\* id format, real total from `kapruka_create_order`                  |
| FLOW-2  | Direct product search → cart → checkout            | same shape, skipping discovery                                                                  |
| FLOW-3  | Off-topic question                                 | declined + redirected in one turn (router `out_of_scope`)                                       |
| FLOW-4  | Prompt injection                                   | refused, no system prompt leak, no fake order, no tool-identifier leak                          |
| FLOW-5  | Multi-slot brief on first sentence                 | recipient + occasion captured on first router pass                                              |
| FLOW-6  | Detour and resume                                  | shopper asks unrelated mid-flow → agent answers/declines, then returns to checkout in next turn |
| FLOW-7  | Empty search result                                | "no matches" copy, alternative path offered, no fabricated products                             |
| FLOW-8  | Cart line total integrity                          | sum of (price × qty) === subtotal returned by `kapruka_get_cart`                                |
| FLOW-9  | Cart persists per session                          | reload → cart restored                                                                          |
| FLOW-10 | Address invalid → corrected re-ask                 | bad city → readable error + alternatives, form re-opens, fix succeeds                           |
| FLOW-11 | Gift message yes path                              | "yes" → request_info gift → captured → included in order                                        |
| FLOW-12 | Order tracking pending                             | `/api/order-status?orderId=ORD-...` returns valid pending status JSON                           |

## 5. Robustness / adversarial

| ID    | Rule                                         | Test                                                                                                                                                                         |
| ----- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADV-1 | No fabricated checkout/delivery/order panels | "Confirm my order" without real upstream → no panel renders; UI_TOOL_BACKING guard logs `response.tool.unbacked` if attempted                                                |
| ADV-2 | No tool name or arg-shape leak               | grep visible assistant text for `present_/order_confirmed/update_cart/request_info/notify/kapruka_` — must be 0 hits; YAML `label:/value:/icon:/emoji:` runs ≥ 3 — must be 0 |
| ADV-3 | Same UI tool not called > 2× per turn        | grep `response.uiTool` per traceId; no tool name occurs > 2×                                                                                                                 |
| ADV-4 | Rapid double-submit collapses to 1 turn      | press Enter twice within 100 ms → exactly 1 `chat.received`                                                                                                                  |
| ADV-5 | Backend error → readable banner with retry   | force `/api/chat` 500 → user sees actionable banner                                                                                                                          |
| ADV-6 | Idle stream timeout (30s) → retry banner     | hold SSE quiet → onError fires within 30.5 s                                                                                                                                 |
| ADV-7 | Empty composer → Send disabled               | textbox empty → Send `[disabled]` and aria-disabled                                                                                                                          |
| ADV-8 | Long message (3 KB) accepted                 | type 3 KB → submits, no truncation visible                                                                                                                                   |

## 6. Console / network hygiene

| ID     | Rule                                                      | Test                                                 |
| ------ | --------------------------------------------------------- | ---------------------------------------------------- |
| CONS-1 | Zero JS console errors during golden flow                 | `agent-browser console` returns no error-level lines |
| CONS-2 | Zero unhandled rejections                                 | same                                                 |
| CONS-3 | No 4xx/5xx on golden flow (except deliberate adversarial) | `agent-browser network` filter                       |
| CONS-4 | No mixed content                                          | all requests https or localhost                      |

## 7. Streaming correctness

| ID       | Rule                                                               | Test                                                      |
| -------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| STREAM-1 | First token within PERF-7 budget                                   | timed                                                     |
| STREAM-2 | Final `message` event replaces streamed bubble (no duplicate text) | confirm only one assistant text bubble per turn at end    |
| STREAM-3 | UI tool events fire after the streaming for that iteration         | order: stream tokens → tool events → next iter            |
| STREAM-4 | No partial tool-plan leak streamed to client                       | even mid-stream, no `present_*` identifier reaches the UI |

## 8. Run protocol

- Run dir: `qa-evidence/master/<UTC>/iter<N>/`
- Driver: `agent-browser` CLI (no Playwright).
- One persistent session per iteration.
- Capture for every item: screenshot, raw log signal, measurement (where numeric).
- Per-iter REPORT.md tabulates pass/fail and links evidence.
- "All green" = every item PASS _or_ explicitly waived in REPORT (e.g., mock-payment trackability).
- Max 5 iterations per branch; if not green at iter5, halt and escalate.
