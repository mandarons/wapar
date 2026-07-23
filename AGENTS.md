# AGENTS.md - WAPAR Repository Instructions

## Package Manager: Bun Only

All commands use `bun`. Never use npm, yarn, or pnpm. They will fail.

## Two Workspaces

| Directory | Stack | Entry Point |
|-----------|-------|-------------|
| `server/` | Hono + SQLite + Drizzle ORM | `server/src/index.ts` (app), `server/src/local.ts` (local dev) |
| `app/` | SvelteKit + Tailwind + Skeleton UI | `app/src/routes/+page.server.ts` |

## Essential Commands

### Server (`server/`)
```bash
cd server && bun install
./run.sh                          # One-command setup: deps + db push + start
bun run dev                       # Start on :8787
bun test                          # All tests
bun test:unit                     # Unit tests (excludes tests/integration/)
bun test:integration              # Integration tests only
bun run test:coverage             # 100% line coverage required in CI
bun run db:push                   # Apply schema changes (dev - no migration files)
bun run db:generate               # Generate migration files (production)
bun run db:migrate                # Apply migration files
bunx drizzle-kit check            # Verify schema matches migrations
```

### Frontend (`app/`)
```bash
cd app && bun install
bun dev                           # Dev server with --host
bun run check                     # Type checking (svelte-check)
bun run lint                      # Prettier + ESLint
bun run format                    # Auto-fix formatting
bun run test                      # Runs e2e + unit sequentially
bun run test:unit                 # Vitest
bun run test:e2e                  # Playwright
```

## Critical Architecture Facts

### Server runs on local SQLite, NOT Cloudflare D1
Despite `D1Database` type names in `server/src/types/database.ts`, this is a **local SQLite shim**. The mock adapter in `server/src/local.ts` wraps `bun:sqlite` as D1-compatible.

### Database file locations
- **Dev**: `server/local.db` (created by `./run.sh` or `bun run db:push`)
- **Tests**: In-memory only (`:memory:`)
- **Docker**: `/data/local.db` (volume mount recommended)
- **Override**: `DB_PATH` env var

### 100% Server Test Coverage Required
CI blocks merges if server line coverage drops below 100%. Enforced via `bunfig.toml` (`coverageThreshold = {lines = 100}`). Test files excluded from coverage (`coverageSkipTestFiles = true`).

### Server Tests: Always Reset State
Tests share a global in-memory database. **Always call `resetDb()` at test start** to prevent state leakage between tests. Test utilities are in `tests/utils.ts` (provides `getBase()`, `resetDb()`, `d1Exec()`, `waitForCount()`).

### Test Runner is Bun, NOT Vitest
Server tests use `bun:test` (not Vitest). Preloaded via `bunfig.toml` from `tests/setup.ts`.

## Schema Patterns
- Text primary keys (UUIDs), not auto-increment integers
- ISO string timestamps stored as TEXT: `text('created_at').default(sql\`...\`)`
- JSON in TEXT fields requires manual `JSON.stringify()` / `JSON.parse()`
- Foreign keys use `text().references()`, not integer IDs
- Indexes defined separately from table schema

## CI Checks (staging.yml / production.yml)
1. Server tests with 100% coverage check (lcov)
2. `bunx drizzle-kit check` - verify migrations ready
3. Docker image build and push to GHCR

## Docker
```bash
cd server
docker compose up                     # Dev with volume mounts
docker compose -f docker-compose.prod.yaml up  # Production
```

## Common Pitfalls

1. **Frontend API URL**: `app/src/routes/+page.server.ts` defaults to `https://wapar-api.mandarons.com`. Override with `PUBLIC_API_URL` env var for local dev.

2. **`db:push` vs `db:generate` + `db:migrate`**: Use `db:push` during development (no migration files). Use `db:generate` + `db:migrate` for production schema changes.

3. **Test server is on fixed port 8787**: Tests start their own server instance on port 8787. Don't assume another port is available.

4. **Schema file**: `server/schema.sql` is the canonical D1 schema. Used by test setup to initialize in-memory DB.

5. **`run.sh` must be run from `server/` directory** - it checks for `package.json` in cwd.

## UI Conventions
- Design tokens defined in `app/tailwind.config.ts` - use `wapar-*` color names, spacing, typography
- Accessibility: WCAG AA required for all UI changes
- Reusable components go in `app/src/lib/components/ui/`
- Follow UX guidelines in `app/docs/UX_GUIDELINES.md` before UI work

## Reference Docs
- `.github/copilot-instructions.md` - detailed architecture reference
- `CONTRIBUTING.md` - contribution workflow and commit conventions
- `app/docs/UX_GUIDELINES.md` - design system
- `server/docs/` - API docs, local development guide, active installations spec
