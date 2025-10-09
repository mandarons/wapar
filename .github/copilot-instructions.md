# WAPAR AI Agent Instructions

## Architecture Overview

This is a **serverless application analytics platform** migrated from Node.js/PostgreSQL to Cloudflare Workers/D1. Three main components:

- **`cf-server/`**: Hono-based Cloudflare Workers API backend with D1 database
- **`app/`**: SvelteKit frontend with geographic visualization  
- **`scripts/`**: PostgreSQL→D1 migration utilities

## Key Development Workflows

### Workers Backend (`cf-server/`)
```bash
# Initial D1 database setup (required before first run)
bunx wrangler d1 execute wapar-db --file=./schema.sql

# Development
bun run dev  # wrangler dev on localhost:8787

# Database operations
bun run db:deploy        # Deploy schema to local D1
bun run db:deploy:remote # Deploy schema to production D1
bun run db:generate      # Generate Drizzle migrations

# Deploy
bun run deploy  # Runs db:deploy + wrangler deploy
```

### Frontend (`app/`)
Uses **pnpm** (not npm/yarn):
```bash
pnpm dev     # SvelteKit dev server
pnpm build   # Build for Cloudflare Pages
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

### Database Schema (`cf-server/src/db/schema.ts`)
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

- `cf-server/src/index.ts` - Hono app setup, global error handling
- `cf-server/tests/utils.ts` - In-process testing utilities  
- `cf-server/src/db/schema.ts` - Drizzle schema with separate indexes
- `app/src/routes/+page.server.ts` - Multi-source data fetching
- `scripts/migrate-to-d1.ts` - PostgreSQL migration patterns

## Migration Context

Legacy references to `server/` folder in Dockerfile indicate this was migrated from traditional Node.js setup. Current architecture is fully serverless on Cloudflare platform.