# ADR 0003 — Text UUID Keys and Schema Conventions

**Status:** Accepted

## Context

Schema design in a D1-compatable SQLite world must be portable and analytics-friendly. Initial schema sketches used integer autoincrement IDs; analytics joins, upgrade lineage (`previousId`), and API payloads all address installations by UUID.

## Decision

Canonical schema conventions (see `docs/standards/coding.md`):

1. **Text UUID primary keys** for `Installation.id` and `Heartbeat.id` (no auto-increment).
2. **ISO timestamps as TEXT** (`createdAt`/`lastHeartbeatAt`, default `(datetime('now'))`).
3. **JSON in TEXT columns** with manual `JSON.stringify`/`JSON.parse`.
4. **Foreign keys via `text().references()`** (e.g., `Heartbeat.installationId`).
5. **Indexes declared separately** from tables — one index per analytics filter column (`idx_installation_last_heartbeat_at`, `idx_installation_app_version`, `idx_installation_country_code`, etc.).
6. `server/schema.sql` (canonical for test init) MUST stay in sync with `server/src/db/schema.ts` (dev DB). Schema evolution: `db:push` in dev; `db:generate` + `db:migrate` in production; verified by `bunx drizzle-kit check`.

## Consequences

- **Pros:** stable external IDs (stable API + `previousId` lineage), no integer races for cross-client IDs, portable across SQLite/D1, hot queries are index-served.
- **Cons:** slight storage bloat vs integers; manual JSON handling; schema duality (`schema.sql` vs `db/schema.ts`) requires disciplined syncing.