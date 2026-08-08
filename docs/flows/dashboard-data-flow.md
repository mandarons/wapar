# Flow — Dashboard Data Flow

How the SvelteKit dashboard obtains, transforms, and renders WAPAR analytics — with resilience rules that MUST not be broken.

## Overview

The dashboard has no direct DB access. `+page.server.ts` (SSR load) fetches the WAPAR API **and** an external Home Assistant comparison feed, applying per-source fallbacks on failure so the page always renders. Pure TypeScript modules in `app/src/lib/` transform the fetched shapes into chart/map-ready structures (SvelteKit + Chart.js + svgMap).

## Steps

1. **SSR fetch (server)** — `app/src/routes/+page.server.ts` `load()`:
   - WAPAR API base: `PUBLIC_API_URL` env var, default `https://wapar-api.mandarons.com`.
   - Sources: `/api/usage`, `/api/version-analytics`, `/api/recent-installations`, `/api/installation-stats`, `/api/heartbeat-analytics`, plus `https://analytics.home-assistant.io/custom_integrations.json` (external).
   - Each fetch is wrapped in try/catch → fallback defaults (e.g., zeroed usage object) so a single API outage never blanks the page.
2. **State handoff** — data returns via `PageServerLoad` to `+page.svelte`.
3. **Transform (client + server libs)** — `app/src/lib/`:
   - `analytics.ts` — counts/rates helpers.
   - `trendAnalysis.ts` — time-series trends.
   - `historicalData.ts` — history snapshots.
   - `marketShare.ts` — WAPAR vs HA comparison.
   - `dataExport.ts` — CSV/etc. export.
   - `utils/overview.ts`, `utils/refresh.ts` — dashboard overview + auto-refresh/polling.
4. **Render** — tabs render charts (Chart.js), interactive map (`svgmap`, active installations only), tables, and metric cards using Skeleton UI components in `app/src/lib/components/ui/`.

## Cross-Cutting

- **Accessibility**: all new components MUST meet WCAG AA (`app/docs/ACCESSIBILITY*.md`, `app/docs/UX_GUIDELINES.md`).
- **Error resilience**: fallbacks MUST keep the dashboard interactive when any upstream source fails.
- **Client data**: fetch only in `.server.ts` files; keep the client bundle free of API URLs.
- **Env config**: `PUBLIC_API_URL` governs all WAPAR fetches. See `app/README.md`.

## Extension Points

- New dashboard tab: add section in `+page.svelte` (+ component in `src/lib/components/ui/`), fetch in `+page.server.ts` with fallback, add/update helper in `src/lib/*.ts` with a co-located `*.test.ts`.

## Related

- `docs/systems/app.md` — components, tests, conventions.
- `app/docs/UX_GUIDELINES.md` — design system.
- `docs/flows/installation-heartbeat.md` — how the data got into the API.