# Standard — Performance

Constraints that MUST not be regressed. RFC 2119 keywords apply. Source hierarchy: `server/src/local.ts` (SQLite PRAGMAs), `server/src/db/schema.ts`/`schema.sql` (indexes), analytics routes.

## SQLite Configuration (server/src/local.ts)

The production server MUST keep the PRAGMA set in `local.ts` — treat changes as high-risk:

- `journal_mode = WAL`, `synchronous = NORMAL` (durability/perf balance)
- `busy_timeout = 5000` (graceful concurrent writes)
- `cache_size = -64000` (64MB), `mmap_size = 268435456` (256MB)
- `temp_store = MEMORY`

Never add a signature-changing PRAGMA without verifying the `version-analytics-performance` test and coverage gate.

## Index Discipline (MUST)

- Every column used for filtering/ordering in analytics queries MUST have an index declared in `server/src/db/schema.ts` (and `server/schema.sql`), e.g. `idx_installation_last_heartbeat_at`, `idx_installation_country_code`, `idx_installation_app_version`, `idx_installation_created_at`, `idx_heartbeat_installation_id`, `idx_heartbeat_created_at`.
- New analytics queries MUST be reviewed for index usage; the perf regression test `server/tests/version-analytics-performance.test.ts` guards the hot path — keep it passing.

## Query Shape (MUST)

- Analytics endpoints compute from raw rows **at request time** (no background aggregation). Keep queries index-friendly; avoid `SELECT *` into application memory loops where a SQL aggregate suffices.
- Heartbeats are written one per installation per day — bulk inserts MUST batch within a single transaction.

## App Bundle/Request Perf

- Dashboard data fetches MUST stay server-side (SSR) — the client bundle must not fetch `/api/*` directly.
- Keep chart/map payloads bounded; the `refresh.ts` poller in `app/src/lib/utils/` SHOULD not fire more than once per minute.

## Enforced in CI

- `bun run test:coverage` (100% lines) + performance test + `bunx drizzle-kit check` in `staging.yml` / `production.yml`.

## Related

- `server/docs/TEST_COVERAGE_REPORT.md`, `docs/systems/server.md`, `docs/architecture/README.md` (topology).