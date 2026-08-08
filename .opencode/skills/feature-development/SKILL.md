---
name: feature-development
description: "Use when building new features, API endpoints, or UI components. Feature implementation workflow for WAPAR (server API and/or SvelteKit dashboard): planning, schema changes (db:push vs migrate), testing with the 100% coverage gate, UI/UX constraints, and documentation updates."
---

# Feature Development Workflow

## Before You Start

1. Read `docs/index.md` and the relevant `docs/systems/<component>.md`.
2. Decide where the feature lives: `server/` (ingestion/analytics API), `app/` (dashboard/visualization), or both.

## Plan the Change

1. If the feature adds analytics, review `server/src/routes/*` for a sibling pattern to copy (validation → route → index registration).
2. If it changes the schema:
   - Dev: `cd server && bun run db:push`
   - Production-ready: `bun run db:generate` then `bun run db:migrate`
   - Verify: `bunx drizzle-kit check`
   - Keep `server/schema.sql` and `server/src/db/schema.ts` in sync (canonical test schema).
3. For frontend features: read `app/docs/UX_GUIDELINES.md` and the accessibility docs before writing UI.

## Implement

1. Server: add/update route module in `server/src/routes/`, wire it in `server/src/index.ts`, use zod validation and shared error envelopes.
2. App: keep API access in `+page.server.ts` (SSR) with fallback defaults; add pure transform logic in `src/lib/*.ts` with a co-located test.
3. UI components: use `wapar-*` design tokens; place reusable components in `app/src/lib/components/ui/`.

## Test & Validate

1. Server tests: `cd server && bun test` — every new source line covered; `bun run test:coverage` MUST stay 100%. Each new test file MUST call `resetDb()`.
2. App: `cd app && bun run check && bun run lint && bun run test:unit` (and e2e if the feature touches UI flow).
3. Update documentation (DRY): extend the relevant `docs/flows/*` or `docs/systems/*` entry and, if the API changes, the canonical API doc (`server/README.md` / `server/docs/*`).

## Related

- `docs/standards/coding.md`, `docs/standards/testing.md`.
- `docs/flows/installation-heartbeat.md` (ingestion features) or `docs/flows/dashboard-data-flow.md` (UI features).
