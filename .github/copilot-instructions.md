# WAPAR AI Agent Instructions

## Architecture Overview

This is a **serverless application analytics platform** migrated from Node.js/PostgreSQL to Cloudflare Workers/D1. Three main components:

- **`server/`**: Hono-based Cloudflare Workers API backend with D1 database
- **`app/`**: SvelteKit frontend with geographic visualization  
- **`scripts/`**: PostgreSQL→D1 migration utilities

## Key Development Workflows

### Workers Backend (`server/`)
```bash
# Initial D1 database setup (required before first run)
bunx wrangler d1 migrations apply wapar-db --local

# Development
bun run dev  # wrangler dev on localhost:8787

# Database operations
bun run db:generate      # Generate Drizzle migrations
bun run db:deploy        # Apply migrations to local D1
bun run db:deploy:remote # Apply migrations to production D1

# Deploy
bun run deploy  # Applies migrations + wrangler deploy
```

### Frontend (`app/`)
Uses **bun** (not npm/yarn/pnpm):
```bash
bun dev     # SvelteKit dev server
bun build   # Build for Cloudflare Pages
```

## Testing Patterns (Non-Standard)

Workers tests use **in-process testing** via `wrangler`'s `unstable_dev`:

- Tests import `worker` from `tests/utils.ts` 
- Database operations go through **test-only routes** (`/__test/*`) for stability
- Use helpers: `resetDb()`, `d1Exec()`, `waitForCount()`, `getBase()`
- **No mocking** - tests hit actual D1 binding through running worker

```typescript
// Example test pattern from tests/utils.ts
const base = getBase();
await resetDb(); // Clears tables via /__test/reset endpoint
const result = await fetch(`${base}/api/installation`, {...});
```

## Data Patterns

### Database Schema (`server/src/db/schema.ts`)
- **Text primary keys** (UUIDs), not auto-increment
- **Separate index definitions** from table schema
- **ISO string timestamps** stored as TEXT in SQLite
- JSON data in TEXT fields with manual serialization

### API Structure
- Routes: `/api`, `/api/installation`, `/api/heartbeat`, `/api/usage`
- Hourly cron job (`jobs/enrich-ip.ts`) for IP geolocation enrichment
- Global error handling catches **Zod validation errors** specifically

## Integration Points

### Frontend Data Sources
`app/src/routes/+page.server.ts` combines:
- Internal API: `https://wapar-api.mandarons.com/api/usage` 
- External: `https://analytics.home-assistant.io/custom_integrations.json`

### Geographic Visualization
Uses `svgmap` library in `+page.svelte` for installation mapping.

## Key Files for Patterns

- `server/src/index.ts` - Hono app setup, global error handling
- `server/tests/utils.ts` - In-process testing utilities  
- `server/src/db/schema.ts` - Drizzle schema with separate indexes
- `app/src/routes/+page.server.ts` - Multi-source data fetching
- `scripts/migrate-to-d1.ts` - PostgreSQL migration patterns

## Documentation Structure

### Server Documentation (`server/docs/`)
- **DEPLOYMENT.md** - Workers deployment and D1 setup
- **ENVIRONMENTS.md** - Staging/production environments, CI/CD workflows
- **ACTIVE_INSTALLATIONS.md** - Active installation tracking feature
- **FORM_ENCODING_SUPPORT.md** - API request format documentation

### Frontend Documentation (`app/docs/`)
- **UX_GUIDELINES.md** - Design system, components, accessibility standards
- **ACCESSIBILITY*.md** - Accessibility implementation and testing
- **contrib/features/** - Feature-specific documentation

## Migration Context

Legacy references to `server/` folder in Dockerfile indicate this was migrated from traditional Node.js setup. Current architecture is fully serverless on Cloudflare platform. Schema management uses **Drizzle migrations only** - no schema.sql file.