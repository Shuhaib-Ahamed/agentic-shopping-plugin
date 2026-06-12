# Kapruka Shopping Agent

A full-screen conversational shopping agent for Kapruka, Sri Lanka's largest local store. Built on the Kapruka MCP and the OpenAI Responses API. Entry for the Kapruka Agent Challenge 2026.

## Quick start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# add your OPENAI_API_KEY to apps/web/.env.local
pnpm dev
```

Open http://localhost:3000.

## Architecture (one architectural call)

```
Full-screen chat SPA  <-- /api, same origin -->  Gateway (Vercel Functions)  <-->  OpenAI Responses API
                                                         |
                                                         +-->  Kapruka MCP (https://mcp.kapruka.com/mcp)
```

The gateway owns the agent loop manually instead of using the Responses API's native remote MCP feature. This is deliberate: the whole UX depends on turning MCP tool results into rich visual events (product cards, cart, delivery, checkout). The gateway must sit between the model and the MCP server so it can intercept every result and decide what to render.

## Directory layout

```
kapruka-agent/
  packages/
    protocol/        shared SSE event and tool types (the frozen contract)
  apps/
    web/             the Vercel project: SPA + same-origin functions
      api/           gateway functions
      prompts/       runtime system prompt (hosted)
      src/
        design-system/   master.md, tokens.css, pages/<surface>.md overrides
        components/      atoms, molecules, organisms, templates
        i18n/            en, si, ta strings
        pages/           App
        store.ts         Zustand
        transport.ts     SSE client
```

## Stack

- React 19, Vite 6, TypeScript 5, strict.
- Tailwind CSS v4 (CSS-first), shadcn/ui v4, Radix UI primitives.
- Zustand for state, Framer Motion for micro-interactions.
- Vercel Functions, Node runtime, streaming.
- `openai` SDK (Responses API), `@modelcontextprotocol/sdk`, `zod`.

## Environment

Only one real secret. Set in Vercel and locally:

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `OPENAI_API_KEY` | yes | | Server only, never client. |
| `OPENAI_MODEL` | no | `gpt-4.1` | Override if a model handles Sinhala better. |
| `MCP_SERVER_URL` | no | `https://mcp.kapruka.com/mcp` | Override only for local mocking. |
| `MCP_MOCK` | no | unset | Set to `1` for offline development. |
| `MAX_STEPS` | no | `8` | Agent loop step cap per turn. |

## Deploy

One Vercel project pointed at `apps/web`. Functions live under `apps/web/api/`. Same origin, so no CORS to set up.

```bash
vercel link
vercel env add OPENAI_API_KEY
vercel deploy --prod
```

## Bonuses delivered

- Multi-item cart (built into the cart panel).
- Delivery-date constraints + perishable warnings (cake, flower, combo).
- Gift messaging.
- Tanglish via the model voice + vernacular city alias resolution.
- Full Sinhala (UI strings + Noto Sans Sinhala typography + agent fluency).

## Notes for parallel work

See `AGENTS.md` for directory ownership and the two skills (UI/UX Pro Max + Vercel Web Interface Guidelines) every UI change must apply.
