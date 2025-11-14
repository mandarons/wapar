# WAPAR AI Agent Instructions

## Architecture Overview

WAPAR is a **local application analytics platform** with three main components:

- **`server/`**: Hono-based API backend with local SQLite database
- **`app/`**: SvelteKit frontend with geographic visualization  
- **`scripts/`**: Migration and utility scripts

The application runs **locally with SQLite** - not on Cloudflare Workers/D1 despite some legacy type references.

## Critical: Bun-Only Environment

**All commands MUST use `bun`, never npm/yarn/pnpm**:
```bash
# ✅ Correct
bun install
bun run dev
bun test

# ❌ Never use
npm install
yarn dev
```

This applies to both `server/` and `app/` directories. Package managers other than Bun will fail.

## Key Development Workflows

### Server Backend (`server/`)
```bash
# Quick start (from server/)
./run.sh  # One-command setup: installs deps, creates DB, applies migrations, starts server

# Development
bun run dev         # Start on localhost:8787
bun run start       # Alias for dev

# Database operations (uses Drizzle)
bun run db:push     # Push schema changes (no migration files) - use for dev
bun run db:generate # Generate migration files from schema changes
bun run db:migrate  # Apply migrations to database

# Testing (Bun test runner, NOT vitest)
bun test            # Run all tests with minimal output
bun test:unit       # Unit tests only (excludes tests/integration/)
bun test:integration # Integration tests only
bun test:verbose    # Full output for debugging

# Coverage (enforced at 100% in CI)
bun test:coverage           # Text summary with CLAUDECODE=1 env var
bun test:coverage:html      # Generate HTML report in coverage/html/
bun test:coverage:open      # Generate + open in browser (needs Python 3)
```

### Frontend (`app/`)
```bash
bun dev             # SvelteKit dev server with --host
bun build           # Production build
bun preview         # Preview production build

# Testing
bun run test        # Runs both e2e and unit tests
bun run test:e2e    # Playwright end-to-end tests
bun run test:unit   # Vitest unit tests
bun run test:integration # Playwright integration tests
```

### Docker Deployment
```bash
# From server/ directory
docker compose up          # Development with volume mounts
docker compose -f docker-compose.prod.yaml up  # Production mode
```

## Testing Architecture

### Server Tests (Bun Test Runner)
Tests use **in-memory SQLite** with a D1-compatible wrapper:

- **Global setup**: `tests/setup.ts` preloaded via `bunfig.toml`
- **Test database**: In-memory SQLite, NOT the local.db file
- **Database mock**: `server/src/types/database.ts` defines D1Database interface
- **Mock adapter**: `server/src/local.ts` wraps `bun:sqlite` Database as D1Database

**Key test utilities** (`tests/utils.ts`):
```typescript
const base = getBase();        // Get test server URL
await resetDb();               // Clear Installation + Heartbeat tables
await d1Exec(sql);             // Execute raw SQL on test DB
await waitForCount(table, n);  // Poll until table has N rows
```

**Test pattern**:
```typescript
import { describe, test, expect } from 'bun:test';
import { getBase, resetDb } from './utils';

describe('API endpoint', () => {
  test('creates installation', async () => {
    await resetDb();
    const res = await fetch(`${getBase()}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* data */ })
    });
    expect(res.status).toBe(200);
  });
});
```

### Coverage Requirements
- **100% line coverage** enforced in CI for server code
- **Test files excluded** via `bunfig.toml`: `coverageSkipTestFiles = true`
- **Coverage threshold**: `coverageThreshold = {lines = 100}` in bunfig.toml
- CI blocks merges if coverage drops below 100%

### Test Configuration
- **bunfig.toml**: Bun-specific test configuration (preload, coverage)
- **vitest.config.ts**: Unused (legacy from Vitest migration)
- Tests run with `bun test`, not `vitest`

## Database Patterns

### Schema Design (`server/src/db/schema.ts`)
**Critical patterns** that differ from typical ORMs:

1. **Text primary keys (UUIDs)**, not auto-increment integers
2. **Indexes defined separately** from table schema:
   ```typescript
   export const installations = sqliteTable('Installation', { /* columns */ });
   export const installationAppNameIdx = index('idx_installation_app_name').on(installations.appName);
   ```
3. **ISO string timestamps** stored as TEXT: `createdAt: text('created_at').default(sql\`(datetime('now'))\`)`
4. **JSON in TEXT fields**: Manual `JSON.stringify()` / `JSON.parse()` required
5. **Foreign keys use `text().references()`**, not integer IDs

### Migration Strategy
- **Drizzle migrations** stored in `drizzle/` directory
- **drizzle.config.ts** points to `local.db` (or `DB_PATH` env var)
- **Migration files**: Numbered SQL files (e.g., `0000_ambiguous_callisto.sql`)
- **Check migrations**: `bunx drizzle-kit check` validates schema vs migrations

### Active vs Stale Installations
Core business logic tracked via `lastHeartbeatAt` field:
- **Active**: Heartbeat within `ACTIVITY_THRESHOLD_DAYS` (default: 3)
- **Stale**: No heartbeat or heartbeat older than threshold
- See `server/docs/ACTIVE_INSTALLATIONS.md` for full specification

## API Architecture

### Hono Framework (`server/src/index.ts`)
- **Global error handler**: Catches Zod validation errors as 400, JSON parse errors
- **Middleware**: `ensureMigrations()` runs on first request to apply pending migrations
- **Type bindings**: `type Bindings = { DB: D1Database }` for Hono context

### Key Endpoints
```
POST /api/installation     # Register new installation (generates UUID)
POST /api/heartbeat        # Record heartbeat (updates lastHeartbeatAt)
GET  /api/usage            # Overall usage stats (active/stale/total)
GET  /api/installation-stats # Detailed active/stale breakdown
GET  /api/version-analytics  # Version distribution (active only)
GET  /api/heartbeat-analytics # DAU/WAU/MAU engagement metrics
GET  /api/recent-installations # Latest installations feed
GET  /api/new-installations    # New installations in time range
```

### Request Format Support
API accepts both JSON and `application/x-www-form-urlencoded` (see `server/docs/FORM_ENCODING_SUPPORT.md`)

## Frontend Architecture

### SvelteKit + Skeleton UI
- **Styling**: Tailwind CSS with `@skeletonlabs/skeleton` components
- **Design tokens**: Defined in `app/tailwind.config.ts` (spacing, typography, colors)
- **Accessibility**: WCAG AA contrast ratios enforced (see `app/docs/ACCESSIBILITY*.md`)
- **UX Guidelines**: `app/docs/UX_GUIDELINES.md` - comprehensive design system

### Data Fetching Pattern
`app/src/routes/+page.server.ts` loads data from **multiple sources**:
```typescript
// Internal API
const internalData = await fetch('https://wapar-api.mandarons.com/api/usage');

// External comparison data
const externalData = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
```

### Geographic Visualization
- **Library**: `svgmap` for interactive world map
- **Data**: Active installations only (stale installations excluded from map)

## CI/CD Workflows

### Staging (`.github/workflows/staging.yml`)
Runs on PRs:
1. Server tests with 100% coverage check
2. Build and push Docker image to GitHub Container Registry
3. No cloud deployment (app runs locally)

### Production (`.github/workflows/production.yml`)
Runs on `main` branch pushes + hourly cron:
1. Same as staging but with 90-day artifact retention
2. Uses `lcov-filtered.info` for coverage reporting
3. Docker image tagged as `latest`

### Coverage Workflow
CI extracts coverage from `coverage/lcov.info`:
```bash
COVERAGE=$(lcov --summary coverage/lcov.info 2>&1 | grep "lines......" | awk '{print $2}' | sed 's/%//')
```
Fails if `$COVERAGE < 100`.

## Documentation Structure

### Server Docs (`server/docs/`)
- **LOCAL_DEVELOPMENT.md**: Complete local setup guide, architecture diagrams
- **ACTIVE_INSTALLATIONS.md**: Business logic for active/stale classification
- **FORM_ENCODING_SUPPORT.md**: API request format documentation
- **TEST_COVERAGE_REPORT.md**: Coverage reporting details
- **DOCKER.md**: Production Docker deployment guide

### Frontend Docs (`app/docs/`)
- **UX_GUIDELINES.md**: Design system, tokens, component patterns
- **ACCESSIBILITY*.md**: WCAG compliance, testing, implementation
- **contrib/features/**: Feature-specific documentation (maps, analytics, trends)

### Integration Testing
- `docs/INTEGRATION_TESTING.md`: Cross-component test strategy
- Server: `server/tests/integration/README.md`
- App: `app/tests/integration/README.md`

## Common Gotchas

### 1. D1Database Types Are Not Cloudflare D1
Despite the name, `D1Database` in `server/src/types/database.ts` is a **local interface** wrapping `bun:sqlite`. This is a compatibility shim, not Cloudflare Workers.

### 2. Database File Location
- **Dev**: `server/local.db` (created by `./run.sh` or `bun run db:push`)
- **Tests**: In-memory only (no file)
- **Docker**: `/app/data/local.db` (volume mount recommended)
- **Config**: `DB_PATH` env var overrides default

### 3. Migration vs Push
- **`db:push`**: Applies schema directly (no migration files) - use in dev
- **`db:generate` + `db:migrate`**: Creates migration files - use for production changes

### 4. Test Isolation
Tests share a global in-memory database. **Always call `resetDb()` at test start** to avoid state leakage.

### 5. Frontend API URLs
Production frontend points to `https://wapar-api.mandarons.com/api/*` (hardcoded in `+page.server.ts`). Update for different environments.

## AI Contribution Guidelines

1. **Use Context7 tool** for library documentation when available
2. **Run tests before committing**: `bun test` from `server/`
3. **Verify coverage**: `bun run test:coverage` must show 100%
4. **Check migrations**: `bunx drizzle-kit check` after schema changes
5. **Follow UX guidelines**: Reference `app/docs/UX_GUIDELINES.md` for frontend changes
6. **Accessibility**: All new UI must meet WCAG AA standards
7. **Document features**: Add to `app/docs/contrib/features/` for new dashboard features
```