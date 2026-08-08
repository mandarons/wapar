# Scripts System — Legacy Migration Utilities

One-off utilities and data-migration tooling. Today this is a single legacy script: `scripts/migrate-to-d1.ts` (PostgreSQL → D1 data migration).

## Responsibilities

- Migrate data from a legacy PostgreSQL database into the D1-format schema.
- Provide `--dry-run` mode for safe inspection before applying.

It does NOT: run on the server, use the Bun runtime conventions of `server/`/`app/`, or have a test suite.

## Boundaries

- Standalone ts-node script; own `package.json`, own environment (`POSTGRES_*` env vars).
- **Legacy**: uses `ts-node` + `pg` with node's package manager (`npm install`). This predates the repo-wide Bun-only rule. Do NOT "fix" it to Bun, and do NOT delete it without explicit approval — treat as frozen.

## Key Entry Points

| File | Purpose |
|---|---|
| `scripts/migrate-to-d1.ts` | The migration script (run with `npm run migrate` or `npm run migrate:dry-run`). |

## Invariants

- MUST NOT be modified outside an explicitly approved migration task.
- `--dry-run` MUST remain available and side-effect free.
- Does not participate in the server test/coverage gate (no tests here).

## Tests

None. Validate dry-run output manually.

## Related Docs

- `docs/index.md` — component map (why this exists).
- `docs/architecture/README.md` — deployment topology (migration path into local SQLite).