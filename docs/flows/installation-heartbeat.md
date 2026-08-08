# Flow — Installation Registration → Heartbeat → Active/Stale Analytics

The core data flow: how an application reports into WAPAR and how those signals become the analytics the dashboard shows.

## Overview

Applications (iCloud Docker, HA Bouncie) register once with a client-generated UUID, then periodically POST heartbeats. WAPAR records these in two SQLite tables (`Installation`, `Heartbeat`) and derives active/stale classification, engagement, version, and geographic analytics on demand. No ingestion is aggregated in the background — every analytics endpoint computes from the raw rows at request time.

## Steps

1. **Registration** — App POSTs `POST /api/installation` with `appName`, `appVersion`, `countryCode`, `previousId` (optional upgrade link). Server generates a UUID `installationId`, inserts an `Installation` row (`lastHeartbeatAt` = null → classified stale).
   - Route: `server/src/routes/installation.ts` → `src/db/schema.ts` (`Installation` table).
2. **Heartbeat** — App POSTs `POST /api/heartbeat` with `installationId`. Server validates existing installation, updates `Installation.lastHeartbeatAt`, inserts a `Heartbeat` row (one per installation per day MAX).
   - Route: `server/src/routes/heartbeat.ts`.
3. **Classification (at read time)** — `activeInstallations` = installations with `lastHeartbeatAt >= now - ACTIVITY_THRESHOLD_DAYS`; `stale` = the complement (including never-heartbeat). Implemented in `server/src/utils/active-installations.ts`.
4. **Analytics endpoints (on demand)** — `/api/usage` (totals + monthly active + country counts), `/api/installation-stats` (active/stale breakdown + distributions), `/api/version-analytics` (distribution + upgrade rate), `/api/recent-installations`, `/api/new-installations`, `/api/heartbeat-analytics` (DAU/WAU/MAU).
   - Routes: `server/src/routes/{usage,installation-stats,version-analytics,recent-installations,new-installations,heartbeat-analytics}.ts`.
5. **Consumption** — `app/src/routes/+page.server.ts` fetches these endpoints server-side and renders; see `dashboard-data-flow.md`.

## Cross-Cutting

- **Auth/identity**: none on ingestion (open endpoints). Only the test-SQL route is restricted (localhost-only).
- **Validation**: zod schemas in `server/src/utils/validation.ts`; validation failures → 400 envelope via `handleValidationError`.
- **Format support**: JSON and `application/x-www-form-urlencoded` both accepted — see `server/docs/FORM_ENCODING_SUPPORT.md`.
- **Logging**: each request carries structured context through `server/src/utils/logger.ts`.
- **Errors**: JSON-parse and zod errors handled in the global `app.onError` middleware (`server/src/index.ts`).
- **Schema churn**: adding `appName`/`previousId`-style fields touches `db/schema.ts` + `drizzle/*` migration + tests + `schema.sql` — see `docs/standards/testing.md`.

## Extension Points

- New analytics endpoints: copy a sibling route module in `server/src/routes/`, register in `server/src/index.ts`, keep coverage + `resetDb()` discipline (docs/standards/testing.md).
- New ingestion semantics (e.g., custom dimensions): add columns via `db:push` (dev) then vote coverage + tests.

## Related

- `docs/systems/server.md` — routes, DB, utils.
- `server/docs/ACTIVE_INSTALLATIONS.md` — classification spec (canonical).
- `docs/glossary.md` — installation, heartbeat, threshold terms.