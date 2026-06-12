# AGENTS.md

Two skills apply to every UI change in this repo, during generation, not only at review.

## 1. UI/UX Pro Max

Source of truth: `apps/web/src/design-system/`.

- `master.md` is the global rule set.
- `pages/<surface>.md` overrides master for that surface. Surfaces: `chat`, `product`, `checkout`.
- `tokens.css` is the only place design tokens live. Tailwind v4 reads it via `@theme`.

Before any component or page work:

1. Open `master.md`.
2. If a per-surface override exists for what you are about to build, open it. It overrides master.
3. Use only `tokens.css` variables. No raw hex in components.

To generate or extend the design system:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

Domains: `style`, `color`, `typography`, `landing`, `ux`, `chart`, `react`, `web`, `prompt`, `product`.

## 2. Vercel Web Interface Guidelines

Apply during generation. Run `/web-interface-guidelines` over `apps/web/src` before merge as a hard review gate.

Universal rules built into the component baseline:

- Every interactive element keyboard operable per WAI-ARIA patterns.
- `:focus-visible` ring required, hit target >= 24px (44px on touch).
- Forms: real `<label>`, `inputMode`, `autoComplete`, Enter submits, inline validation, disabled-while-pending.
- Animate `transform`/`opacity` only, respect `prefers-reduced-motion`.
- Explicit loading, empty, and recoverable error states on every async surface.
- Numbers with non-breaking space before units, currency formatted per locale, never mixed in one view.
- Sinhala and Tamil strings must render correctly: font stack already includes Noto Sans Sinhala and Noto Sans Tamil. Test by switching locale.

## Directory ownership (parallel agents)

From build prompt Section 20, owned directories per agent:

| Agent | Owns |
|------|------|
| Orchestrator | `packages/protocol/`, `apps/web/src/design-system/`, root tooling |
| Gateway | `apps/web/api/`, `apps/web/prompts/` |
| Design | `apps/web/src/components/atoms/`, `apps/web/src/components/molecules/` |
| Surface | `apps/web/src/components/organisms/`, `apps/web/src/components/templates/`, `apps/web/src/pages/`, `apps/web/src/store.ts`, `apps/web/src/transport.ts` |
| Language and personality | `apps/web/src/i18n/`, `apps/web/prompts/system.md` |

A lower atomic layer never imports a higher one. Atoms do not know about molecules; molecules do not know about organisms.

## Non-negotiables

- No em dashes anywhere, comments included. Commas, colons, full stops.
- TypeScript strict. No `any` without an inline comment explaining why.
- No secrets in the SPA bundle. The OpenAI key lives only in gateway env.
- The SSE contract in `packages/protocol/src/index.ts` is frozen; changes go through the orchestrator.
