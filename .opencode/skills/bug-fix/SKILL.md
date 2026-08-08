---
name: bug-fix
description: "Use when diagnosing failures, investigating anomalies, or fixing bugs. Bug investigation and fix workflow for WAPAR — reproduce server/API or dashboard issues with bun test suites, inspect structured logs and SQLite state, fix while preserving the 100% coverage gate, and verify."
---

# Bug Fix Workflow

## Investigate

1. Reproduce first, locally:
   - Server: `cd server && bun test` (look for failing unit/integration). Start dev with `bun run dev` and replay the failing request against `http://localhost:8787`.
   - App: `cd app && bun run check && bun run test:unit`; for fetch/data issues check `+page.server.ts` fallbacks.
2. For analytics-anomalies, inspect structured logs (`server/src/utils/logger.ts` request context) — never log secrets. Check `server/local.db` directly with `bunx drizzle-kit` queries if needed (tests use in-memory DB; dev uses `local.db`).
3. Read the relevant `docs/flows/*` to confirm expected behavior (e.g., active/stale classification in `installation-heartbeat.md`).

## Fix

1. Write a failing test FIRST (server: new case in `server/tests/*.test.ts` with `resetDb()`; app: co-located `*.test.ts`).
2. Fix the smallest surface: one route module, one util, one component. Keep the fix idiomatic with `docs/standards/coding.md`.
3. Watch for shared-DB leaks: if the bug is state-leakage, the fix is likely a missing `resetDb()` in a test, not product code.
4. For schema/index issues (slow analytics), apply `docs/standards/performance.md` (index discipline + PRAGMAs); verify with the perf regression suite `server/tests/version-analytics-performance.test.ts`.

## Verify

1. `cd server && bun run test:coverage` MUST hold 100% (new tests count toward the gate).
2. `cd app && bun run check && bun run lint && bun run test:unit` for app-side fixes.
3. If prod behavior changed (threshold env, migration), run `bunx drizzle-kit check` and the integration suites.

## Document

- Update relevant `docs/systems/*` / `docs/flows/*` only if behavior or boundaries changed (DRY — link the canonical docs).

## Related

- `docs/standards/testing.md`, `docs/standards/security.md` (no secret logging while debugging).