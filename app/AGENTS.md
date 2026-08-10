# AGENTS.md — app/ (SvelteKit Dashboard)

SvelteKit + Tailwind + Skeleton UI dashboard that fetches the WAPAR API server-side (SSR) and renders metrics, charts, and a world map. Subsystem doc: `docs/systems/app.md`.

## Local Commands

| Task                     | Command                          |
| ------------------------ | -------------------------------- |
| Dev server               | `bun dev` (SvelteKit, port 5173) |
| Type check               | `bun run check` (svelte-check)   |
| Lint (Prettier + ESLint) | `bun run lint`                   |
| Format (auto-fix)        | `bun run format`                 |
| Unit tests               | `bun run test:unit` (Vitest)     |
| E2E tests                | `bun run test:e2e` (Playwright)  |
| Deployed integration     | `bun run test:integration`       |
| Full test suite          | `bun run test` (e2e then unit)   |

## Local Rules

- **WCAG AA required** on every UI change (see `app/docs/ACCESSIBILITY*.md`).
- Design tokens: use `wapar-*` names from `tailwind.config.ts`; no ad-hoc colors/spacing.
- `+page.server.ts` (`load()` in `src/routes/`) is the **only** API access point — client components must never call `/api/*` directly. Keep `PUBLIC_API_URL` override for local/staging.
- Reusable components go in `src/lib/components/ui/`.
- Pure logic in `src/lib/*.ts` SHOULD ship a co-located `*.test.ts`.
- Charts: Chart.js + `chartjs-plugin-datalabels`; map: `svgmap`. No new visualization libs without a documented reason.
- Fetch resilience: each upstream fetch in `load()` has try/catch fallback so the page never 500s on API outages.

## Key Files

- `src/routes/+page.server.ts` — SSR data load (WAPAR API + Home Assistant feed).
- `src/routes/+page.svelte` — dashboard tabs (Overview, Map, Versions, Engagement, Trends, Market Share).
- `src/lib/`: `analytics.ts`, `trendAnalysis.ts`, `marketShare.ts`, `historicalData.ts`, `dataExport.ts` — transform helpers.
- `src/lib/utils/`: `overview.ts`, `refresh.ts` (polling), `countries.ts`.
- `tailwind.config.ts` — `wapar-*` design tokens.
- `playwright.config.ts` / `playwright.config.integration.ts` — e2e + staging tests.

## Related Docs

- `docs/systems/app.md` — full component documentation.
- `app/docs/UX_GUIDELINES.md` — design system (must read before UI work).
- `docs/INTEGRATION_TESTING.md` — deployed testing strategy.
- `docs/standards/testing.md` — run/test gates.
