---
name: refactoring
description: "Use when performing refactors, large code reorganizations, or moving/renaming code. Safe refactoring workflow for the WAPAR TypeScript codebase, including the 100% server coverage gate, resetDb test discipline, and review preparation."
---

# Refactoring Workflow

## Before You Start

1. Read the relevant system doc in `docs/systems/` (`server.md` or `app.md`) and the component's `AGENTS.md`.
2. Identify all tests covering the code you will change (`server/tests/`, `app/src/**/*.test.ts`).
3. Establish a green baseline:
   - Server: `cd server && bun test`
   - App: `cd app && bun run check && bun run test:unit`
4. Note the current coverage baseline (`cd server && bun run test:coverage` must already be 100%).

## During the Refactor

1. Make small, incremental changes; keep tests passing after each step.
2. If you move or rename functions, update imports and co-located tests at the same time (server tests live in `server/tests/`, app logic tests are co-located).
3. Do NOT restructure `server/src/local.ts` PRAGMA setup, the migrations middleware, or analytics queries without preserving behavior (index use matters — see `docs/standards/performance.md`).
4. If you touch schema, keep `schema.sql` and `src/db/schema.ts` in sync (dev: `db:push`; prod: `db:generate` + `db:migrate`).

## Before Declaring Done

1. Run the full suites:
   - Server: `cd server && bun test` then `bun run test:coverage` (MUST remain 100%).
   - App: `cd app && bun run check && bun run lint && bun run test:unit`.
2. If you changed API response shapes, update `app/src/routes/+page.server.ts` fallbacks and `server/README.md`.
3. Prepare a concise summary of the changes (what moved, what was renamed, what tests were touched) for review.

## Related

- `docs/standards/testing.md` — gates that MUST pass.
- `docs/standards/coding.md` — conventions to preserve while refactoring.
