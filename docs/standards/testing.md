# Standard — Testing

How to test in this repo, what MUST pass before merge, and how to run component-specific suites. RFC 2119 keywords apply.

## Quality Gates (before merge / CI)

- **Server**: `bun run test:coverage` MUST report **100% line coverage** — CI blocks merges otherwise (`bunfig.toml`: `coverageThreshold = {lines = 100}`, test files excluded). Any added server source MUST ship with tests that cover it.
- **Server**: `bunx drizzle-kit check` MUST pass when schema changed.
- **App**: `bun run check` (svelte-check) and `bun run lint` MUST pass; unit + e2e tests MUST pass.
- Run the full gates in CI workflows (`.github/workflows/staging.yml`, `production.yml`) — they are the same commands as above.

## Runner Selection

- **Server tests use `bun:test`** (`bun test ...`). Root `server/vitest.config.ts` is legacy/unused — do not add Vitest tests there; run integration/e2e via `app`'s Playwright or `server/tests/integration` with the bun runner.
- **App tests use Vitest** (`bun run test:unit`) and Playwright (`bun run test:e2e`, `bun run test:integration`).

## Server Test Conventions (MUST)

1. **Call `resetDb()` at the top of every test block** — the suite shares one global in-memory DB; state leaks between tests otherwise. Utilities in `server/tests/utils.ts`: `getBase()`, `resetDb()`, `d1Exec()`, `waitForCount()`.
2. Test server binds **port 8787** — don't assume a different port.
3. Use the seeded test DB via `tests/setup.ts` (preloaded by `bunfig.toml`), not the dev `local.db`.
4. Assert on HTTP responses via `fetch(getBase() + '/api/...')`, plus direct DB assertions with `d1Exec` where useful.
5. Integration tests go in `server/tests/integration/` and run with `bun run test:integration`; e2e flows in `server/tests/e2e/`.

```ts
import { describe, test, expect } from 'bun:test';
import { getBase, resetDb } from './utils';

describe('/api/usage', () => {
  test('returns totals', async () => {
    await resetDb(); // MUST
    const res = await fetch(`${getBase()}/api/usage`);
    expect(res.status).toBe(200);
  });
});
```

## App Test Structure (MUST)

- Pure logic in `app/src/lib/*.ts` MUST have co-located `*.test.ts` (Vitest).
- E2E specs use Playwright (`app/playwright.config.ts`); deployed-staging tests use `app/playwright.config.integration.ts` (`bun run test:integration`).

## Running Individual Component Suites

| Scope | Command (from repo root unless noted) |
|---|---|
| Server unit | `cd server && bun run test:unit` |
| Server integration | `cd server && bun run test:integration` |
| Server coverage | `cd server && bun run test:coverage` |
| App type check | `cd app && bun run check` |
| App lint/format | `cd app && bun run lint` / `cd app && bun run format` |
| App unit | `cd app && bun run test:unit` |
| App e2e | `cd app && bun run test:e2e` |
| App integration | `cd app && bun run test:integration` |

To run a single file: `bun test path/to/file.test.ts` (server) or `npx vitest run path` (app) — but still verify full suite at the end.

## Integration / Deployed Testing

- Cross-component strategy: `docs/INTEGRATION_TESTING.md`.
- Run against staging: `app`'s Playwright integration config; server integration via `bun run test:integration`.

## Related

- `docs/standards/coding.md`, `server/docs/TEST_COVERAGE_REPORT.md`, `docs/flows/*` (per-flow test hooks).