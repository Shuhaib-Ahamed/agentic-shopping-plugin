# BUILD PROMPT: Kapruka Agent Challenge 2026 entry

> How to use this file. Paste this whole document into your agentic coding tool (Claude Code, Cursor) as the project context. The build is designed for parallel agents working off a frozen contract, so follow the parallel plan in Section 20. All UI work applies two installed skills, UI/UX Pro Max and Vercel's Web Interface Guidelines, defined in Section 4b. Everything here is locked unless you explicitly override it.
>
> Two senses of the word "prompt". This document is the build prompt for the coding agent. Separately, Section 13 defines the runtime system prompt that the shopping agent runs on. That runtime prompt is hosted on Vercel and served to the gateway over HTTP, so it can be edited and versioned without redeploying logic.

---

## 0. The challenge this build serves

What you are building: a hosted, public demo on a live URL that anyone can open and immediately start shopping with, built on the Kapruka MCP. Judges care more about how it feels than how it is built.

The brief:
- Full-screen chat UI. A polished, immersive conversation as the main surface, not a small corner widget.
- Very visual. Show products beautifully with images, cards, and carousels, not walls of text.
- Personality. A distinct voice (helpful, witty, warm) that makes people want to keep chatting.
- Genuinely helpful. Move a shopper from "I am not sure" to "add to cart," including gift discovery.
- All the way to checkout. Product selection, delivery details, and a working checkout end to end.
- Live on a public URL that stays reliably up. If judges cannot open it, it cannot win.

Scoring rubric, out of 100:
- Experience and polish: 30
- Visual richness: 20
- Personality: 15
- Usefulness: 15
- End-to-end completeness: 15
- Creativity: 5

Bonus points for harder features: multi-item carts, delivery-date constraints, gift messaging, Tanglish conversation, and especially Sinhala-language support.

Rules: open to Sri Lankans based in Sri Lanka, solo builders only (one person, one entry, one prize), must be a live public URL, built on the Kapruka MCP. Entries close 30 June 2026. Grand prize is an Apple M4 Mac Mini.

Where the points are, so effort goes to the right place:
- Polish (30) plus visual richness (20) is half the score and both live in the front end. The full-screen feel, the product cards and carousels, the motion, and the empty state are where most time should go.
- Personality (15) is almost entirely the runtime system prompt in Section 13.
- Usefulness (15) plus completeness (15) is the flow working reliably on the real MCP, all the way to a confirmed order.
- Creativity (5) is small. Do not over-invest.
- Bonus features stack on top of the 100. Sinhala support is called out as especially valued, so treat full Sinhala (UI strings plus agent plus city alias resolution) as the highest-value bonus and ship it.

---

## 1. What you must fill in before building

The Kapruka MCP needs no key and no sign-up, so the only real secret is the OpenAI key.

1. `OPENAI_API_KEY`. Gateway env only. Never reaches the browser.
2. Agent persona. Name, voice, mascot, one-line mission. You have used Suba (dolphin) and Juno previously. Drop the chosen values into the persona block in Section 13.
3. Brand tokens. Primary color, accent, font, radius, drawn from Kapruka's look. These seed the UI/UX Pro Max design system in Section 4b and the Tailwind theme.

The MCP endpoint, transport, and tool set are already known and pre-filled below.

---

## 2. Mission and the one architectural call

Build a hosted full-screen Kapruka shopping agent at a public URL: a Vite React single-page app for the chat surface, plus a same-origin gateway (Vercel Functions) that runs the agent loop against the Kapruka MCP and the OpenAI Responses API.

```
Full-screen chat SPA  <-- /api, same origin -->  Gateway (Vercel Functions)  <-->  OpenAI Responses API
                                                         |
                                                         +-->  Kapruka MCP (https://mcp.kapruka.com/mcp)
```

The opinionated call: for this challenge the surface is a standalone full-screen app, not a widget embedded into third-party sites. Because the SPA and the gateway are served from the same Vercel project and origin, there is no Shadow DOM, no embed snippet, and no cross-origin CORS to get right. This removes the biggest source of fragility before the deadline and lets effort flow into polish and the end-to-end flow, which is where the rubric points are. The embeddable Shadow DOM widget is preserved as optional Appendix A for reuse beyond the challenge; it is not required to win and adds risk, so do not build it until the hosted demo is complete and polished.

The gateway owns the agent loop manually rather than delegating tool execution to the model host. This is deliberate. The whole UX depends on turning MCP results into rich visual events (product cards, cart, delivery, checkout), so the gateway must sit between the model and the MCP server to intercept every result and decide what to render. The Responses API native remote MCP feature, which lets OpenAI call the MCP server directly, hides those results from the gateway, so we do not use it. Keep a note in the README explaining this.

---

## 3. Golden rules (non-negotiables)

1. No secrets client side. The SPA calls `/api`. No OpenAI key in the browser.
2. The gateway owns the agent loop, the OpenAI key, the MCP client, and serves the runtime prompt.
3. The front end renders structured UI events, not raw model text. The SSE contract in Section 8 is the single source of truth. If the model wants something on screen, it calls a UI tool, which becomes an event.
4. Rubric first. When a tradeoff appears, favor experience, visual richness, and a flow that completes, in that order.
5. TypeScript strict everywhere. No `any` without an inline justification comment.
6. No em dashes anywhere. Copy, comments, docs, commit messages. Use commas, colons, or full stops.
7. Correct capitalization always: Kapruka, Tailwind CSS, shadcn/ui, Radix UI, Vite, React, TypeScript, OpenAI, Vercel, Zustand, Sinhala, Tamil, Tanglish.
8. Accessible (WCAG 2.2 AA), responsive (full-screen on mobile and desktop), and reliably up.
9. Every UI decision applies the UI/UX Pro Max skill and Vercel's Web Interface Guidelines (Section 4b). Generate the design system before writing component code, and treat the Vercel guidelines as a hard review gate before merge.
10. Components follow atomic design (Section 14): atoms, then molecules, then organisms, then templates, then pages. No one-off components outside this hierarchy, and a lower layer never imports a higher one.
11. Parallel agents work only inside their assigned directories (Section 20) against the frozen contract. Shared files (the protocol package and the design tokens) change only through the orchestrator.

---

## 4. Tech stack (pinned)

Do not substitute without explicit approval.

Shared
- Node.js 22 LTS for tooling. TypeScript 5.x, strict.
- Monorepo: pnpm workspaces plus Turborepo.

Front end (`apps/web`)
- React 19.
- Vite 6, standard SPA build (not library mode for the demo).
- Tailwind CSS v4 (CSS-first config), themed from the UI/UX Pro Max design system.
- shadcn/ui v4 with Radix UI primitives.
- Zustand for state.
- One lightweight motion library for micro-interactions and transitions, since polish is 30 points.

Gateway (`apps/web/api`, same Vercel project)
- Vercel Functions, Node.js runtime, response streaming enabled.
- `openai` SDK, Responses API.
- `@modelcontextprotocol/sdk` for the Kapruka MCP client.
- `zod` for request and tool argument validation.
- Default model `gpt-5.5`, overridable via `OPENAI_MODEL`. Sinhala is the top bonus, so evaluate the model's Sinhala quality early and switch if another model handles Sinhala better. Keep the choice in one env var so swapping is trivial.

Design tooling (installed skills, see Section 4b)
- UI/UX Pro Max skill (nextlevelbuilder/ui-ux-pro-max-skill) for the design system.
- Vercel Web Interface Guidelines skill (vercel-labs) as the production-quality review gate.

---

## 4b. Design standards and skills (apply to all UI work)

Two skills are installed at the repo root and used throughout. Add an `AGENTS.md` so they apply during generation, not only on review.

UI/UX Pro Max (nextlevelbuilder/ui-ux-pro-max-skill). A design-intelligence skill: searchable databases of UI styles, color palettes, font pairings, and UX rules, with a reasoning engine that produces a full design system.
- Install: `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`, or `npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --agent claude-code`.
- Use it first, before any component code. Generate the design system for this product, an image-led, conversational e-commerce surface for Sri Lanka, and commit it under `apps/web/src/design-system/`. Run domain searches as needed, for example `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "e-commerce product card image-led" --domain style` and `... "search and loading states" --domain ux`.
- Avoid the AI-slop defaults the skill warns against: no generic purple gradient, no default Inter-on-white three-card layout, no dark mode that is just desaturated light mode. The look should feel deliberate and on-brand for Kapruka, seeded by the brand tokens from Section 1.
- Per-surface overrides: if `design-system/pages/<surface>.md` exists for a surface (for example `chat`, `product`, `checkout`), it overrides the master rules for that surface.

Vercel Web Interface Guidelines (vercel-labs). A living checklist for production-grade interfaces, installable as an agent command that fetches the latest rules.
- Install: `npx -y skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code`, or `curl -fsSL https://vercel.com/design/guidelines/install | bash`. Source of truth: https://vercel.com/design/guidelines and `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
- Apply during generation, then run `/web-interface-guidelines` over `apps/web/src` as a review gate before every merge, and fix all findings.
- The universal rules that matter most here. Build to them from the start:
  - Interactions: every flow keyboard operable per the WAI-ARIA patterns; a visible focus ring using `:focus-visible`, and `:focus-within` for grouped controls; managed focus on dialogs and sheets (trap, then return). Hit targets at least 24px, 44px on mobile, and expand the hit target when the visual is smaller.
  - Forms: real `<label>` elements, `inputMode` and `autoComplete` set, Enter submits, inline validation, and disabled-while-pending with a spinner. Mobile input font size at least 16px to stop iOS Safari zoom.
  - Animation: animate compositor-friendly properties only (transform, opacity), keep it purposeful and short, and honor `prefers-reduced-motion`.
  - Content and i18n: accessible typography with `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`; explicit loading, empty, and error states for every async surface; layouts that survive Sinhala and Tamil string lengths.
  - Numbers and currency: numerals for counts, a space between number and unit, and consistent currency formatting per context (LKR and USD each shown with a fixed number of decimals, never mixed).
  - Performance: optimize images (correct sizing, lazy below the fold, no layout shift), keep the client bundle lean, and avoid blocking the main thread.
- Vercel's brand content preferences (Title Case headings, ampersands) are brand-specific, not universal. Skip them. Keep our copy in sentence case with no em dashes per the golden rules.

The handoff. UI/UX Pro Max sets the design system (style, palette, type, spacing, motion), which becomes the Tailwind theme and the atom layer. The Vercel guidelines set the behavioral and accessibility bar every component must clear. Atomic design (Section 14) is how the two compose into the surface.

---

## 5. Request lifecycle

1. The SPA sends `POST /api/chat` with the conversation, a session id, and context (locale, currency, current cart). The connection is held open and the gateway streams SSE back.
2. The gateway loads the runtime system prompt (Section 13), assembles the tool set (the discovered Kapruka tools plus the fixed UI tools from Section 11), and calls the Responses API.
3. The model returns tool calls or text.
   - Kapruka tool call: the gateway executes it against the MCP server, derives and emits any UI event the result warrants, then feeds the tool output back to the model and loops.
   - UI tool call: the gateway emits the matching SSE event, feeds a short acknowledgement back, and loops.
   - Final text: streamed as a `message`, then `done`.
4. The SPA updates state on each event and re-renders the relevant action surface.

A step cap (default 8 model turns per user message) and a per-request timeout prevent runaway loops. Checkout is a sub-flow, detailed in Section 14.

---

## 6. Kapruka MCP: connection and tools

Connection
- Endpoint: `https://mcp.kapruka.com/mcp`. Transport: Streamable HTTP. No authentication. Live.
- Health at `/health` returns `{"status":"ok"}`. Stats at `/stats` returns cache metrics. Use `/health` in the deploy reliability check.
- Source repo at github.com/kapruka/mcp if you need code-level detail on tool result shapes. You should not need it, since the gateway discovers each tool's input schema at runtime.

Limits and behavior to respect in the gateway
- 60 requests per minute per client IP across all tools. Standard `RateLimit-*` headers on every response. Read and respect them, back off on `429`, and surface a friendly "one moment" status rather than an error when throttled.
- `kapruka_create_order` is additionally capped at 30 calls per hour per IP. Do not retry order creation blindly.
- Guest-checkout orders return a click-to-pay link valid for 60 minutes with prices locked. Show the shopper a countdown and handle expiry by re-creating the order.
- Product and category reads are server-side cached up to 30 minutes. You may also memoize reads within a session to stay well under the rate limit. Writes are never cached.

The seven tools. The gateway discovers these dynamically, so do not hardcode their input schemas. The mapping to the flow:

- `kapruka_search_products`. Search the catalog. Params: `q`, `category`, `min_price`, `max_price`, `in_stock_only`, `sort`, `limit`, `cursor`, `currency`. Pagination capped at 3 pages. This is the primary discovery tool. Feed selected results to `present_products`.
- `kapruka_get_product`. Full detail for one product by `product_id` (name, price, stock, variants, images, shipping, direct URL). Params: `product_id`, `currency`. Use for the detail sheet and to get variant and image data before adding to cart.
- `kapruka_list_categories`. Top-level category names with browse URLs. Param: `depth`. Use to offer browsable categories on the empty state and to set the `category` filter on search.
- `kapruka_list_delivery_cities`. Search the delivery network by canonical name or vernacular alias, up to 50 matches. Params: `query`, `limit`. This resolves a shopper's typed city, including romanized or Sinhala or Tamil spellings, to a canonical city. Use it to power city autocomplete in the delivery step. This tool is central to the Sinhala and Tanglish bonuses.
- `kapruka_check_delivery`. Checks whether an order can be delivered to a city on a date, returning the flat LKR rate plus a perishable warning when the product is a cake, flower, or combo. Params: `city`, `delivery_date`, `product_id`. This powers the delivery-date constraint bonus. Surface the perishable warning prominently in the UI.
- `kapruka_create_order`. Creates a guest-checkout order and returns a click-to-pay URL. Params: `cart`, `recipient`, `delivery`, `sender`, `gift_message`, `currency`. Multi-currency. The `gift_message` param is the gift-messaging bonus. Prices locked 60 minutes. Rely on the discovered schema for the exact sub-fields of `cart`, `recipient`, `delivery`, and `sender`.
- `kapruka_track_order`. Status, recipient, items, and timestamped delivery progress. Param: `order_number`, read from the order-complete response. Powers the success card timeline and the order-status polling route.

---

## 7. Project structure

One Vercel project, same origin for app and gateway. Directories are split so parallel agents (Section 20) do not collide.

```
kapruka-agent/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  README.md
  AGENTS.md                  makes agents apply both skills during generation
  .claude/skills/            ui-ux-pro-max and web-design-guidelines installed here
  packages/
    protocol/                shared SSE event and tool types (the frozen contract)
      src/index.ts
      package.json
  apps/
    web/                     the Vercel project: SPA plus same-origin functions
      index.html
      vite.config.ts
      vercel.json
      .env.example
      prompts/
        system.md            the runtime system prompt (hosted)
      api/                   owned by Agent Gateway
        chat.ts              POST, streams SSE, runs the agent loop
        order-status.ts      GET, polled during payment, calls kapruka_track_order
        prompts/[name].ts    serves hosted prompts
        _lib/
          agent.ts           the loop
          mcp.ts             Kapruka MCP client adapter
          uiTools.ts         UI action tool defs and emit handlers
          openai.ts          Responses API helpers
          sse.ts             SSE writer
          prompts.ts         prompt loader
          env.ts             validated env
      src/
        main.tsx
        store.ts             Zustand                          owned by Agent Surface
        transport.ts         fetch SSE client to /api/chat    owned by Agent Surface
        styles.css           Tailwind v4 entry, theme from the design system
        design-system/       generated by UI/UX Pro Max       owned by Agent Design
          tokens.css         color, type, spacing, radius, motion tokens
          master.md          the generated design system rules
          pages/             per-surface overrides: chat.md, product.md, checkout.md
        i18n/                owned by Agent Language
          en.ts  si.ts  ta.ts   strings, including Tanglish handling
        components/
          atoms/             Button, IconButton, Input, Badge, Price, Spinner, Skeleton, Avatar
          molecules/         MessageBubble, SuggestionChip, QuantityStepper, ProductCard,
                             CartLineItem, CityAutocompleteField, DatePickerField, CountdownPill
          organisms/         Hero, MessageList, Composer, ProductCarousel, ProductGrid,
                             ProductDetailSheet, CartPanel, DeliveryForm, GiftMessageField,
                             CheckoutPanel, SuccessCard
          templates/         ChatLayout (conversation column plus action surface)
        pages/
          App.tsx            mounts ChatLayout, wires store and transport
```

The `protocol` package and `design-system/` are the contract. They are frozen in Phase 0 and changed only through the orchestrator. The SPA and the functions both import the same event and tool types from `protocol`.

---

## 8. The contract: SSE UI event protocol

Define these in `packages/protocol/src/index.ts` with Zod schemas and inferred types.

Request body for `POST /api/chat`:

```
ChatRequest {
  sessionId: string
  messages: Array<{ role: "user" | "assistant", content: string }>
  context?: {
    locale?: "en" | "si" | "ta"
    currency?: "LKR" | "USD"
    cart?: CartLine[]
  }
}
```

Server-sent events, each `event: <type>` plus `data: <json>`:

- `status` `{ state: "thinking" | "working" | "idle", label?: string }`.
- `message` `{ id, role: "assistant", text }`.
- `token` `{ id, delta }`. Optional incremental text.
- `products` `{ title?, layout: "carousel" | "grid", items: Product[] }`.
- `product_detail` `{ product: Product, variants?: Variant[], images: string[] }`. Renders the detail sheet.
- `request_info` `{ title, intent: "delivery" | "contact" | "gift" | "custom", fields: Field[], submitLabel }`.
- `cart` `{ lines: CartLine[], subtotal: Money }`.
- `delivery_quote` `{ city, date, rate: Money, perishableWarning?: string }`.
- `checkout` `{ summary: OrderSummary, payUrl: string, orderId: string, expiresAt: string }`.
- `order_confirmed` `{ orderId, summary: OrderSummary, trackingUrl? }`.
- `error` `{ code, message, recoverable: boolean }`.
- `done` `{}`.

Supporting types:

```
Product { id, title, price: Money, image?, url?, rating?, inStock: boolean, badge? }
Variant { id, label, price?: Money, inStock: boolean }
Money { amount: number, currency: "LKR" | "USD" }
CartLine { productId, title, qty, variantId?, price: Money }
Field { name, label, type: "text" | "tel" | "email" | "date" | "select" | "city", required, options?, placeholder? }
OrderSummary { lines: CartLine[], delivery: Money, total: Money, recipient?: Recipient, giftMessage? }
Recipient { name, phone, line1, line2?, city, postalCode? }
```

The UI tools in Section 11 map one to one onto these events. The gateway never sends an event the front end has no renderer for.

---

## 9. The agent loop (`api/_lib/agent.ts`)

Responsibilities:
1. Load the system prompt via the loader (Section 12).
2. Build the tool list: discovered Kapruka tools (Section 10) plus the fixed UI tools (Section 11).
3. Run the Responses API loop: call `responses.create` with the running input items and tools. For each `function_call`: execute Kapruka tools against the MCP client, derive and emit any UI event the result warrants, append a `function_call_output`; or run a UI tool's emit handler and append a short acknowledgement. On final text with no tool calls, stream `message`, then `done`.
4. Guard rails: cap at `MAX_STEPS` (default 8), enforce a per-request timeout, honor an `AbortSignal` on client disconnect, and on any thrown error emit a recoverable `error` then `done`.

Responses API notes:
- Function tools are flattened: `{ type: "function", name, description, parameters, strict }`. UI tools use `strict: true` with `additionalProperties: false` and all properties required. Discovered Kapruka tools use `strict: false` to tolerate their existing schemas.
- Append output items and `function_call_output` items (reusing each `call_id`) to maintain state across iterations.
- Token streaming is optional behind a flag. Message-level streaming is fine for v1.

---

## 10. Kapruka MCP client adapter (`api/_lib/mcp.ts`)

Use `@modelcontextprotocol/sdk`. Interface:

```
connect(): Promise<void>
listTools(): Promise<McpTool[]>            { name, description, inputSchema }
callTool(name, args): Promise<McpResult>   normalized to text plus optional structured json
```

Behavior:
- Connect with `StreamableHTTPClientTransport(new URL("https://mcp.kapruka.com/mcp"))`. No auth. Connect once per cold start and reuse. The endpoint is overridable via `MCP_SERVER_URL` for local mocking only.
- `listTools` maps each tool to a Responses API function tool, passing the MCP `inputSchema` through as `parameters` with `strict: false`.
- `callTool` normalizes the MCP content: join text parts, parse the first JSON part into `json` so the loop can build typed UI events (for example product arrays into `present_products`, the pay URL into `present_checkout`).
- Rate limits: read `RateLimit-*` headers, throttle proactively to stay under 60 per minute, back off on `429`, and never auto-retry `kapruka_create_order`. Memoize read results within a session.
- Optional mock mode behind `MCP_MOCK=1` for offline development, returning sample products, a quote, a fake pay URL, and a track sequence. The real endpoint is the default, since it is open and live.

---

## 11. UI action tools (`api/_lib/uiTools.ts`)

Tools the model calls to drive the screen. Each has a strict schema and an emit handler that writes the matching SSE event. Validate arguments with the protocol Zod schema before emitting; on a miss, feed an error back so the model self-corrects.

- `present_products({ title?, layout, items: Product[] })` emits `products`. The model selects and orders items it fetched. It must not invent products.
- `present_product_detail({ product, variants?, images })` emits `product_detail`.
- `request_info({ title, intent, fields, submitLabel })` emits `request_info`. Use for delivery details, contact, and the gift message.
- `update_cart({ lines, subtotal })` emits `cart`.
- `present_delivery_quote({ city, date, rate, perishableWarning? })` emits `delivery_quote`.
- `present_checkout({ summary, payUrl, orderId, expiresAt })` emits `checkout`. Values come from `kapruka_create_order`, never fabricated.
- `order_confirmed({ orderId, summary, trackingUrl? })` emits `order_confirmed`.
- `notify({ state, label? })` emits `status`.

---

## 12. Gateway routes

- `api/chat.ts`. POST only. Validate the body with `ChatRequest`. Set headers `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`. Stream the agent loop, flush each event immediately, end on `done`. Same origin, so CORS is not a concern for the demo.
- `api/order-status.ts`. GET `?orderId=`. Calls `kapruka_track_order` and returns `{ status: "pending" | "paid" | "failed", trackingUrl? }`. The SPA polls this during payment so the SSE stream does not stay open across the external pay redirect.
- `api/prompts/[name].ts`. GET. Serves files from `prompts/` as `text/markdown` with an ETag. This hosts the runtime prompt on Vercel and is how the gateway loads it.

`vercel.json` sets the Node runtime, enables streaming, and sets `maxDuration` to a safe value (60 on Hobby, up to 300 on Pro). Keep the chat loop well under the limit; the 60-minute pay window is handled by the polled `order-status` route, not by a held connection.

---

## 13. The runtime system prompt (`apps/web/prompts/system.md`)

Start from the version below, then fill the persona block. No em dashes in this file.

```
You are {{AGENT_NAME}}, a {{PERSONA_ONE_LINER}} shopping assistant for Kapruka, Sri Lanka's largest local store.
Your job is to take a shopper from a vague need or gift idea to a completed, paid order, entirely in chat, and to make it feel delightful.

How you work
- You have two kinds of tools. Kapruka tools fetch real data and act on the store. UI tools put things on the shopper's screen (present_products, present_product_detail, request_info, update_cart, present_delivery_quote, present_checkout, order_confirmed, notify).
- Never describe products in plain text when you can show them. Search with kapruka_search_products, then call present_products with the items you chose. Three to six is usually right.
- Never invent products, prices, stock, delivery rates, pay links, or order numbers. Every concrete value comes from a Kapruka tool result. If you do not have it, fetch it.

The flow
1. Understand the need. If it is a gift, ask who it is for and the occasion, at most one question at a time. Offer browsable categories from kapruka_list_categories on a cold start.
2. Search and present a small, relevant set with present_products. Use kapruka_get_product and present_product_detail when the shopper wants a closer look or needs to pick a variant.
3. Build a multi-item cart and keep it visible with update_cart.
4. Collect delivery details with request_info. Resolve the recipient's city with kapruka_list_delivery_cities, accepting Sinhala, Tamil, or romanized spellings. Collect a delivery date.
5. Quote delivery with kapruka_check_delivery for the city, date, and product. Show the rate with present_delivery_quote. If it returns a perishable warning for a cake, flower, or combo, surface it clearly and confirm the date still works.
6. Offer a gift message. If the shopper wants one, capture it and pass it as gift_message.
7. Read back the full total. Create the order with kapruka_create_order, then present_checkout with the returned pay link and its 60-minute expiry.
8. After payment, confirm with order_confirmed and offer tracking via kapruka_track_order.

Voice and language
- {{VOICE_GUIDELINES}}
- Mirror the shopper's language. Support English, Sinhala, Tamil, and romanized Tanglish, switching naturally mid-conversation. Keep replies short and warm.
- No em dashes. Use commas, colons, or full stops.

Boundaries
- You help only with shopping on Kapruka. Decline unrelated requests briefly and steer back.
- Do not ask for card details in chat. Payment happens through the pay link only.
- The pay link expires in 60 minutes. If it lapses, offer to create a fresh order.
- If a tool is rate limited or fails, say so plainly and offer to retry.

Persona block to fill
AGENT_NAME: {{e.g. Juno}}
PERSONA_ONE_LINER: {{e.g. warm, witty, fast}}
VOICE_GUIDELINES: {{two or three lines of tone, with one or two signature phrases}}
```

---

## 14. Front end: the full-screen chat surface, atomic design

This is where half the rubric lives. Build a standalone, immersive full-screen chat, not a corner panel.

Layout and feel
- An immersive empty state (`Hero`) with the agent's personality, a few suggested prompts, and browsable categories pulled from `kapruka_list_categories`. This is the first thing judges see.
- The conversation is the full surface. Messages and rich action cards share one column on mobile, with room to breathe on desktop.
- Tasteful motion on message entry, card reveals, and the cart. Respect reduced motion.

Built with atomic design. The design system from UI/UX Pro Max (Section 4b) defines style, palette, type, spacing, and motion; the Vercel guidelines set the behavioral bar every layer must clear (focus, hit targets, motion, and explicit loading, empty, and error states). Lower layers are dumb and reusable; higher layers compose them and own data.

Atoms. Styled primitives over shadcn/ui and Radix UI: Button, IconButton, Input, Badge, Price (formats LKR and USD consistently), Spinner, Skeleton, Avatar. No business logic.

Molecules. Small compositions: MessageBubble, SuggestionChip, QuantityStepper, ProductCard (image-led, with stock badge, rating, and add to cart), CartLineItem, CityAutocompleteField (debounced, backed by `kapruka_list_delivery_cities`, accepts Sinhala, Tamil, and romanized spellings), DatePickerField, CountdownPill.

Organisms. The action surfaces the SSE events render into:
- `Hero`: immersive empty state with personality, suggested prompts, and categories from `kapruka_list_categories`.
- `ProductCarousel` and `ProductGrid`: rows and grids of ProductCard. Images are the star, so own aspect ratio, lazy loading, and fallbacks with no layout shift.
- `ProductDetailSheet`: image gallery, variants, shipping note, link to the Kapruka product URL.
- `CartPanel`: multi-item list, QuantityStepper controls, subtotal, proceed to checkout.
- `DeliveryForm`: CityAutocompleteField plus DatePickerField, with an inline perishable warning when `kapruka_check_delivery` flags a cake, flower, or combo.
- `GiftMessageField`: optional gift message captured into the order.
- `CheckoutPanel`: order summary, a pay button that opens the pay URL, and a CountdownPill showing the 60-minute expiry.
- `SuccessCard`: order number and a timestamped tracking timeline from `kapruka_track_order`.
- `MessageList` and `Composer`: the conversation stream and the input.

Templates. `ChatLayout`: the full-screen shell, a conversation column with the active action surface, collapsing to a full-screen sheet on mobile.

Pages. `App`: mounts `ChatLayout` and wires the store and transport. The only data-aware page.

Checkout and payment sequence
1. Shopper proceeds to checkout from `CartPanel`. The SPA sends a user turn with the current cart.
2. The model confirms delivery details and gift message, quotes delivery, reads back the total, then calls `kapruka_create_order` and gets `orderId`, `payUrl`, and an expiry.
3. The model calls `present_checkout`. The SPA renders `CheckoutPanel` with the pay button and countdown.
4. The shopper taps pay. The SPA opens `payUrl` in a new tab and polls `GET /api/order-status?orderId=` every few seconds, with a cap and backoff, until `paid` or the link expires.
5. On `paid`, the SPA sends a tagged user turn `payment completed for {orderId}`; the model calls `order_confirmed` and the `SuccessCard` renders.
6. On expiry or failure, render a recoverable error that offers to create a fresh order.

A server-side payment webhook is more robust than polling and is a good post-deadline upgrade; the polled route is the portable default.

---

## 15. State and transport

`transport.ts`. POST to `/api/chat`, read `response.body` as a stream, parse SSE frames, dispatch typed events into the store. Support `AbortController` and a single reconnect with replay of the last user turn. No `EventSource`, since the request is a POST with a body.

`store.ts` (Zustand). Holds `messages`, `status`, and the current action surface (`products`, `productDetail`, `cart`, `deliveryQuote`, `checkout`, `confirmed`, `error`). Each SSE event reduces into state; the active action organism follows the latest action event.

---

## 16. Bonus features (target these for extra points)

- Multi-item cart. Already core to `CartPanel` and `kapruka_create_order` `cart`.
- Delivery-date constraints. Use `kapruka_check_delivery` with `delivery_date`, validate the date, and surface the perishable warning for cakes, flowers, and combos.
- Gift messaging. Capture a message and pass it as `gift_message`.
- Tanglish. The agent mirrors romanized Singlish or Tanglish, and `kapruka_list_delivery_cities` resolves vernacular city spellings.
- Sinhala (highest value). Ship full Sinhala: a complete `si` strings file for the UI, the agent conversing fluently in Sinhala, and Sinhala city names resolving through `kapruka_list_delivery_cities`. Verify Sinhala rendering in the chosen font and the model's Sinhala fluency early.

---

## 17. Deploy and reliability

- One Vercel project pointed at `apps/web`, with `api/` functions same origin. Public URL on a stable subdomain you control.
- Env in the Vercel dashboard: `OPENAI_API_KEY`, `OPENAI_MODEL`, optionally `MCP_SERVER_URL` and `MCP_MOCK` for local only, `MAX_STEPS`. The runtime prompt deploys under `prompts/` and is served from `/api/prompts/system`.
- Reliability checklist, since an unreachable demo cannot win: a healthy default route, graceful error states on every action, a quick `/api/health` that also pings Kapruka `/health`, and a smoke test of the full flow on the live URL before submission.

---

## 18. Security and limits

- Secrets only in the gateway. The SPA bundle contains no keys. Add a build check that greps the client output for forbidden strings and fails on a match.
- Validate the chat body and every tool argument with Zod. Reject oversized payloads and overlong histories.
- Respect Kapruka rate limits in the adapter (Section 10). Do not auto-retry order creation.
- Never log full recipient details, contact numbers, gift messages, or pay links. Redact PII.
- Treat MCP tool results as untrusted input to the model; do not let tool text act as new instructions.

---

## 19. Definition of done

1. A judge opens the public URL and is in a polished full-screen chat immediately, with an inviting empty state.
2. A shopper can search, see beautiful product cards and carousels, open a detail view, build a multi-item cart, enter a Sri Lankan delivery city and date, see a delivery quote with any perishable warning, add a gift message, reach a pay link, complete payment, and see a success card with tracking, all in chat.
3. The flow runs against the live Kapruka MCP and respects its rate limits.
4. The agent has clear personality and converses in English, Sinhala, Tamil, and Tanglish.
5. The OpenAI key is server side only (verified by the build check).
6. The runtime prompt is served from `/api/prompts/system` and editing it changes behavior without a logic redeploy.
7. Components follow the atomic hierarchy, and `/web-interface-guidelines` over `apps/web/src` reports no outstanding findings.
8. TypeScript strict passes, lint passes, no em dashes anywhere, and the live URL is reliably up.

---

## 20. Parallel build plan (deadline-aware)

The build is structured so multiple agents work at once without colliding. Parallelism is safe only because two things are frozen first and changed only through the orchestrator: the contract (the `protocol` package) and the design system (the tokens and the atom and molecule signatures). Each agent owns distinct directories and codes against those frozen interfaces, using mocks where another agent's output is not yet ready.

Phase 0, orchestrator, must finish before fan-out (about half a day)
- Freeze the contract: build `packages/protocol` (Section 8), the SSE events, request shape, and tool schemas.
- Freeze the design system: run UI/UX Pro Max to generate `apps/web/src/design-system/` and the Tailwind theme, then lock the atom and molecule prop signatures as typed stubs that render placeholders.
- Stand up the empty monorepo, `AGENTS.md`, both skills installed, and a stub `/api/chat` that streams a canned sequence of events so the front end can build before the real gateway lands.

Fan-out, four agents in parallel, each inside its own directories
- Agent Gateway owns `apps/web/api/` and `apps/web/prompts/`. Builds `env`, `mcp` (real Kapruka MCP), `uiTools`, `sse`, `openai`, `agent`, and the three routes. Codes against `protocol` only. Replaces the Phase 0 stub when ready.
- Agent Design owns `apps/web/src/design-system/`, `components/atoms/`, and `components/molecules/`. Implements the design system as real atoms and molecules over shadcn/ui, each meeting the Vercel guidelines. Ships a component gallery route so they can be reviewed in isolation.
- Agent Surface owns `components/organisms/`, `components/templates/`, `pages/`, `store.ts`, and `transport.ts`. Builds the chat shell, the action organisms, transport, and store against the frozen `protocol` types and the frozen atom and molecule signatures, using the Phase 0 stubs until Agent Design lands real ones.
- Agent Language and Personality owns `apps/web/src/i18n/` and the runtime prompt copy in `apps/web/prompts/system.md`. Builds the English, Sinhala, Tamil, and Tanglish strings, the persona and voice, and a set of golden test conversations (including a full Sinhala gift-buying flow) used to validate behavior.

Sync points
- When Agent Gateway lands the real `/api/chat`, Agent Surface switches off the stub and walks the full flow on live Kapruka data.
- When Agent Design lands real atoms and molecules, Agent Surface drops the stubs.
- Agent Language and Personality merges strings into the organisms and the prompt continuously.

Integration, orchestrator
- Merge in dependency order, then run `tsc`, lint, and the secret-scan build check.
- Run `/web-interface-guidelines` over `apps/web/src` and fix all findings. This is the design review gate.
- Pour remaining time into rubric polish: visual richness and motion on the organisms, then sharpen personality in the runtime prompt. Sinhala first among bonuses, then delivery-date and perishable handling, gift messaging, and Tanglish.
- Deploy to the public URL, run the reliability checklist and a full live smoke test, then submit before 30 June 2026.

If you are running a single agent rather than several, execute the phases in order: Phase 0, then Gateway, then Design, then Surface, then Language, then Integration. The directory boundaries still keep the work clean.

---

## Appendix A: optional embeddable widget mode

Only after the hosted demo is complete and polished. To also ship a drop-in widget for arbitrary host sites, add a second Vite library-mode build that mounts the same chat into a custom element with Shadow DOM, served as a single `embed.js` with a one-line config. This reuses the protocol, transport, store, atoms, molecules, and organisms unchanged; only the mount and styling isolation differ. The three Shadow DOM traps to solve in that mode: Radix portals escaping to `document.body` (provide a portal container inside the shadow root), CSS injecting into `document.head` instead of the shadow root (adopt a Constructable Stylesheet), and `rem` units resolving against the host root (add a PostCSS rem-to-px transform at build time). This mode also needs a CORS allowlist on the gateway, since it becomes cross-origin. None of this is required for the challenge.