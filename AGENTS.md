# AGENTS.md — WAPAR Repository Instructions

WAPAR (Web Application Performance Analytics and Reporting) is an application analytics platform that tracks installation metrics, user engagement, version adoption, and geographic distribution for applications (iCloud Docker and HA Bouncie). The `server/` exposes an ingestion + analytics API; the `app/` dashboard visualizes the data. The system runs on **local SQLite, not Cloudflare D1**, deployed via Docker in production.

## Quick Reference

- **Language(s):** TypeScript (Bun runtime)
- **Framework(s):** Hono (server), SvelteKit + Tailwind + Skeleton UI (app), Drizzle ORM
- **Package manager:** Bun ONLY — never npm, yarn, or pnpm; they will fail.

## Commands

| Task | Command |
|------|---------|
| Install deps (server) | `cd server && bun install` |
| Install deps (app) | `cd app && bun install` |
| Server: one-command setup | `cd server && ./run.sh` (deps + db:push + start on :8787) |
| Server start (dev) | `cd server && bun run dev` |
| Server tests (all) | `cd server && bun test` |
| Server tests (unit) | `cd server && bun test:unit` |
| Server tests (integration) | `cd server && bun test:integration` |
| Server coverage (100% gate) | `cd server && bun run test:coverage` |
| DB schema (dev, no migrations) | `cd server && bun run db:push` |
| DB schema (prod) | `cd server && bun run db:generate && bun run db:migrate` |
| Verify schema = migrations | `cd server && bunx drizzle-kit check` |
| App type check | `cd app && bun run check` |
| App lint | `cd app && bun run lint` |
| App format (auto-fix) | `cd app && bun run format` |
| App unit tests | `cd app && bun run test:unit` |
| App e2e tests | `cd app && bun run test:e2e` |
| App all tests | `cd app && bun run test` |

Always run the linter and relevant tests before declaring work complete.

## Architecture Overview

Two-workspace repo: a Hono API (`server/`) exposing installation/heartbeat ingestion and analytics endpoints over a **local SQLite database** (wrapped as a D1-compatible shim), and a SvelteKit dashboard (`app/`) that fetches those endpoints server-side and renders charts/maps. `scripts/` holds legacy one-off migrations; `external/icloud-docker` is a git submodule that reports analytics into WAPAR. See `docs/index.md` for the full architecture map.

## Key Conventions

- **Bun only** — `bun install`, `bun test`, `bun run ...`; never npm/yarn/pnpm.
- **Schema patterns** (see `docs/standards/coding.md`): text UUID primary keys; ISO timestamps in TEXT; JSON in TEXT with manual `JSON.stringify`/`parse`; text `references()` for FKs; indexes declared separately.
- **UI**: use `wapar-*` design tokens from `app/tailwind.config.ts`; WCAG AA required; reusable components go in `app/src/lib/components/ui/`; follow `app/docs/UX_GUIDELINES.md`.
- **API format**: endpoints accept JSON (recommended) and `application/x-www-form-urlencoded` (legacy) — see `server/docs/FORM_ENCODING_SUPPORT.md`.

## Safety and Constraints

- **Server tests MUST maintain 100% line coverage** (CI blocks merges; enforced via `bunfig.toml` `coverageThreshold = {lines = 100}`). Adding source code requires adding tests.
- **Server tests MUST call `resetDb()` at test start** — the suite shares one global in-memory DB; state leaks between tests otherwise.
- **Server tests use `bun:test`, NOT Vitest** (`vitest.config.ts` is legacy). The test server binds fixed port **8787**.
- **Never edit `server/schema.sql` and `server/src/db/schema.ts` inconsistently** — `schema.sql` is canonical for test DB init; `db/schema.ts` for dev DB via `db:push`/migrations. Use `db:push` in dev, `db:generate` + `db:migrate` in production.
- **Local SQLite shim**: `src/local.ts` wraps `bun:sqlite` as a D1-compatible shim. Do not "fix" `D1Database` type names to real D1.
- **High-risk edits**: `server/src/local.ts` (SQLite PRAGMAs, concurrency), `server/src/routes/*` analytics queries (index usage), migrations middleware in `server/src/index.ts`.
- **Do not log secrets** (see `docs/standards/security.md`); test SQL route in `server/src/index.ts` MUST stay localhost-only.

## Documentation Map

- `docs/index.md` — Start here for architecture and component overview
- `docs/systems/server.md`, `docs/systems/app.md`, `docs/systems/scripts.md` — Per-component documentation
- `docs/flows/` — End-to-end flow documentation
- `docs/architecture/` — Cross-cutting design and deployment topology
- `docs/standards/` — Coding, testing, performance, and security standards
- `docs/glossary.md` — Domain terminology
- `docs/adr/` — Architecture Decision Records

Existing canonical docs (DRY — link, don't duplicate): `server/docs/` (LOCAL_DEVELOPMENT, ACTIVE_INSTALLATIONS, FORM_ENCODING_SUPPORT, TEST_COVERAGE_REPORT), `app/docs/` (UX_GUIDELINES, ACCESSIBILITY\*), `docs/INTEGRATION_TESTING.md`, `CONTRIBUTING.md`.

## Working in This Repo

1. Read `docs/index.md` for architecture context before making changes.
2. Check `docs/systems/<component>.md` for the component you are modifying; local `AGENTS.md` in `server/` and `app/` carry component-specific commands.
3. Run tests after every change (server: `bun test:unit` + `test:coverage`; app: `bun run check` + `test:unit`).
4. Follow the standards in `docs/standards/` — loaded into every session.
5. For schema changes: use `db:push` in dev, generate+migrate for production, and verify with `bunx drizzle-kit check`.