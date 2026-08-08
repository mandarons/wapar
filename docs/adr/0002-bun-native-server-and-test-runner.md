# ADR 0002 — Bun Native Server + `bun:test` Runner

**Status:** Accepted

## Context

The server historically ran on `@hono/node-server` and tests used Vitest (root `vitest.config.ts`, `server/tests/integration/vitest.config.ts`). This added Node.js adapter weight to the Docker image and split tooling between Vitest and Bun.

## Decision

1. **Runtime:** `server/src/local.ts` starts the Hono app with **`Bun.serve()`** (no Node adapter) — smaller image, faster cold start. The entry is `bun run src/local.ts` (dev and prod).
2. **Tests:** server tests use **`bun:test`** (`bun test ...`), preloaded from `tests/setup.ts` via `server/bunfig.toml`. `vitest.config.ts` files are legacy and MUST NOT be used as the test runner. `bun run test:coverage` enforces `coverageThreshold = {lines = 100}`.

## Consequences

- **Pros:** one toolchain for server runtime+tests; 100% coverage gate runs in CI (staging/production workflows); faster, lighter Docker image.
- **Cons:** Vitest-only plugins unavailable for server tests; dev/test ports must agree (fixed 8787). App (`app/`) still uses Vitest + Playwright — a deliberate asymmetry.