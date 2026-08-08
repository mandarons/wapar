# Server System — Ingestion + Analytics API

Hono API backend exposing installation ingestion and analytics endpoints over a local SQLite database via a D1-compatible shim. See also `server/AGENTS.md` (commands) and `server/docs/LOCAL_DEVELOPMENT.md` (setup).

## Responsibilities

- Receive installation registrations and heartbeats from tracked apps (iCloud Docker, HA Bouncie).
- Classify installations as **active** / **stale** based on `lastHeartbeatAt` vs `ACTIVITY_THRESHOLD_DAYS` (default 3).
- Serve ingestion and analytics endpoints (JSON and legacy form-encoded).
- Run Drizzle migrations on first request (`ensureMigrations` middleware).
- Format/validate all input with zod; return consistent error envelopes.

It does NOT: serve the dashboard (that's `app/`), track per-user events, or provide authentication.

## Boundaries

- Exposed via HTTP on fixed port **8787** (dev/test) or Docker (production, `/data/local.db`).
- Owns the entire SQLite database (`Installation`, `Heartbeat` tables + indexes).
- Analytics routes read from `Installation`/`Heartbeat` only — no external data sources.

## Key Entry Points

| File | Purpose |
|---|---|
| `server/src/index.ts` | Hono app: error middleware, migrations middleware, route mounting, localhost-only test SQL route (`POST /api` with `X-Test-SQL`). |
| `server/src/local.ts` | Bun runner: opens `bun:sqlite` at `DB_PATH`/`local.db`, applies PRAGMAs (WAL, busy_timeout, mmap…), bootstraps the Hono app. |
| `server/src/db/schema.ts` | Drizzle schema for `Installation` + `Heartbeat` + indexes. |
| `server/src/db/migrations.ts` | `ensureMigrations()` — runs pending migrations from `drizzle/`. |
| `server/src/db/client.ts` | Drizzle client/wrapper (if changed, rerun migration checks). |
| `server/src/routes/*.ts` | One file per endpoint group: `installation`, `heartbeat`, `usage`, `installation-stats`, `version-analytics`, `heartbeat-analytics`, `recent-installations`, `new-installations`, `test`. |
| `server/src/utils/` | `active-installations.ts` (classification), `errors.ts` (error envelope), `logger.ts` (structured logging), `validation.ts` (zod schemas), `version.ts`, `network.ts`, `test-db.ts`. |
| `server/schema.sql` | Canonical schema for test DB init. |
| `server/run.sh` | One-command local setup: deps + `db:push` + start. |

## Invariants

- `<bun:test>` MUST be used; `vitest.config.ts` at server root is legacy — do not rely on it.
- Port 8787 reserved for the test server; dev server also runs on 8787.
- Line coverage MUST stay at 100% or CI fails (config: `bunfig.toml` `coverageThreshold = {lines = 100}`); tests excluded via `coverageSkipTestFiles = true`.
- `schema.sql` and `db/schema.ts` MUST stay in sync; changes go through `db:push` (dev) or `db:generate` + `db:migrate` (prod), verified by `bunx drizzle-kit check`.
- All routes MUST use `Logger` for request context; never log secrets.
- `migrations` middleware MUST continue to run before first request; migration failures are logged but not fatal.
- Form-encoded requests need `Content-Type: application/x-www-form-urlencoded` support + JSON. Keep compatible — see FORM_ENCODING_SUPPORT.md.

## Dependencies

- Runtime: `hono`, `drizzle-orm`, `zod`, `@libsql/client` (tests only), `bun:sqlite`.
- Depends on `drizzle-kit` (CLI) for `db:*` tasks.
- Depends on `schema.sql` + `drizzle/*` migration files for DB init.
- Nothing external at runtime (no external HTTP calls).

## Tests

- Location: `server/tests/*.test.ts` (unit), `server/tests/integration/` (integration), `server/tests/e2e/` (e2e).
- Utilities: `server/tests/utils.ts` (`getBase`, `resetDb`, `d1Exec`, `waitForCount`); `server/tests/setup.ts` preloaded via `bunfig.toml`.
- Run: `bun test`, `bun test:unit`, `bun test:integration`, `bun run test:coverage` (from `server/`).
- Every unit test file MUST call `resetDb()` at test start (shared in-memory DB).
- Coverage reports: lcov in `coverage/`; `bun run test:coverage:html` generates HTML.

## Related Docs

- `server/docs/LOCAL_DEVELOPMENT.md` — full setup guide.
- `server/docs/ACTIVE_INSTALLATIONS.md` — active/stale classification spec.
- `server/docs/FORM_ENCODING_SUPPORT.md` — request format support.
- `server/docs/TEST_COVERAGE_REPORT.md` — coverage details.
- `docs/adr/0001-*`, `0002-*` — architecture decisions for the SQLite shim and Bun runner.
- `docs/standards/coding.md`, `docs/standards/testing.md`, `docs/standards/performance.md`, `docs/standards/security.md`.