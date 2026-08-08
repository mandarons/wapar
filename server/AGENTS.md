# AGENTS.md — server/ (Hono + SQLite API)

Hono API over local SQLite (D1-compatible shim via `bun:sqlite`); exposes installation/heartbeat ingestion and analytics endpoints. Full component doc: `docs/systems/server.md`.

## Local Commands

| Task | Command |
|------|---------|
| One-command setup + run | `./run.sh` (from `server/`; start on :8787) |
| Dev server | `bun run dev` |
| Unit tests | `bun test:unit` |
| Integration tests | `bun test:integration` |
| All tests | `bun test` |
| 100% coverage gate | `bun run test:coverage` |
| Schema: dev | `bun run db:push` |
| Schema: prod | `bun run db:generate && bun run db:migrate` |
| Verify schema=migrations | `bunx drizzle-kit check` |

## Local Rules

- **100% line coverage is a hard CI gate** — every new source line ships with tests. Adding a route/service without tests fails CI.
- **Tests use `bun:test`** (not Vitest). All unit tests **MUST call `resetDb()` first** (global in-memory DB; `tests/utils.ts`).
- Test server binds fixed port **8787** — non-negotiable.
- Never edit `schema.sql` and `src/db/schema.ts` inconsistently; `schema.sql` is canonical for test DB init.
- Do not "fix" `D1Database` type names in `src/types/database.ts` — the shim is intentional.
- High-risk: `src/local.ts` (PRAGMAs/concurrency), `src/routes/*` analytics SQL (index use), migrations middleware in `src/index.ts`.
- `run.sh` only works from `server/` (checks for package.json).

## Key Files

- `src/index.ts` — Hono app, middleware, error handling, route wiring (incl. localhost-only test SQL route).
- `src/local.ts` — Bun server + SQLite PRAGMA setup + DB bootstrap.
- `src/db/schema.ts` / `schema.sql` — schema + indexes (must stay in sync).
- `src/routes/` — endpoint modules (installation, heartbeat, usage, *-analytics, etc.).
- `src/utils/active-installations.ts` — active/stale classification logic.
- `tests/utils.ts`, `tests/setup.ts` — test bootstrap + DB reset helpers.

## Related Docs

- `docs/systems/server.md` — full system doc.
- `docs/standards/testing.md`, `docs/standards/performance.md`, `docs/standards/security.md`.
- `server/docs/LOCAL_DEVELOPMENT.md`, `server/docs/ACTIVE_INSTALLATIONS.md`, `server/docs/FORM_ENCODING_SUPPORT.md` — canonical specs for setup, classification, and request formats.