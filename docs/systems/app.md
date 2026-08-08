# App System — SvelteKit Dashboard

SvelteKit + Tailwind + Skeleton UI dashboard that visualizes WAPAR analytics with server-side data fetching. See also `app/AGENTS.md` (commands).

## Responsibilities

- Render analytics: overview metrics (active/stale/total), geographic world map, version adoption, engagement (DAU/WAU/MAU), historical trends, market share vs Home Assistant.
- Fetch WAPAR API + external HA analytics server-side in `+page.server.ts` (SSR), with graceful fallback defaults on fetch failure.
- Provide interactive charts (Chart.js), map (svgmap), and reusable UI components.
- Comply with WCAG AA accessibility and the design system in `app/docs/UX_GUIDELINES.md`.

It does NOT: ingest data, own the database, or write analytics.

## Boundaries

- Default API base URL: `https://wapar-api.mandarons.com` (production). Override with `PUBLIC_API_URL` for local/staging.
- Fetches WAPAR endpoints: `/api/usage`, `/api/version-analytics`, `/api/recent-installations`, `/api/installation-stats`, `/api/new-installations`, `/api/heartbeat-analytics`.
- Also fetches external HA comparison data: `https://analytics.home-assistant.io/custom_integrations.json`.

## Key Entry Points

| File | Purpose |
|---|---|
| `app/src/routes/+page.server.ts` | SSR `load()` — fetches WAPAR + HA data with fallbacks, passes to page. |
| `app/src/routes/+page.svelte` | Main dashboard: tabs (Overview, Map, Versions, Engagement, Historical, Market Share…). |
| `app/src/lib/*.ts` | Pure analytics helpers: `analytics.ts`, `marketShare.ts`, `trendAnalysis.ts`, `historicalData.ts`, `dataExport.ts` — each has a co-located `.test.ts`. |
| `app/src/lib/utils/` | `overview.ts`, `refresh.ts` (polling/refresh), `countries.ts` (country metadata). |
| `app/src/lib/components/ui/` | Reusable UI components (exported via `index.ts`). |
| `app/src/theme.ts`, `app/tailwind.config.ts` | Design tokens (`wapar-*`). |

## Invariants

- UI MUST use `wapar-*` design tokens; no ad-hoc hex colors.
- WCAG AA MUST be maintained; accessibility tests are part of the suite (see `app/docs/ACCESSIBILITY*`).
- Data fetching MUST stay server-side in `.server.ts` files; keep API under `PUBLIC_API_URL` override.
- Reusable components MUST go in `src/lib/components/ui/` before being composed elsewhere.
- Charts rely on `chart.js` + `chartjs-plugin-datalabels`; map on `svgmap`; do not add competing libraries without ADR-style justification.
- Every new pure logic module in `src/lib/` SHOULD ship with a co-located `*.test.ts`.

## Dependencies

- Runtime: `@sveltejs/kit`, `svelte`, `@skeletonlabs/skeleton` + tw plugin, `tailwindcss`, `chart.js`, `chartjs-plugin-datalabels`, `svgmap`.
- Dev: `vitest`, `@playwright/test`, `svelte-check`, `prettier`, `eslint`, `happy-dom`/`jsdom`.
- Depends on `server/` API (network, at runtime) and on `external/icloud-docker` + HA data (reporting sources).

## Tests

- Unit: `cd app && bun run test:unit` (Vitest; `tests/test.ts` + `src/**/*.test.ts`).
- E2E: `bun run test:e2e` (Playwright, config `playwright.config.ts`).
- Integration (deployed staging): `bun run test:integration` (`playwright.config.integration.ts`).
- Type check: `bun run check` (`svelte-check`).
- Format/lint: `bun run format` / `bun run lint` (Prettier + ESLint).

## Related Docs

- `app/docs/UX_GUIDELINES.md` — design system (must read before UI work).
- `app/docs/ACCESSIBILITY.md` + `ACCESSIBILITY_IMPLEMENTATION.md` + `ACCESSIBILITY_TESTING.md`.
- `app/docs/contrib/features/` — feature docs (interactive map, engagement health, advanced analytics, historical trends).
- `docs/INTEGRATION_TESTING.md` — deployed-staging integration strategy (covers both server + app).
- `docs/standards/coding.md`, `docs/standards/testing.md`.