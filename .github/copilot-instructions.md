# WAPAR AI Agent Instructions

## Architecture Overview

This is a **local application analytics platform** with three main components:

- **`server/`**: Hono-based API backend with local SQLite database
- **`app/`**: SvelteKit frontend with geographic visualization  
- **`scripts/`**: Migration and utility scripts

## Key Development Workflows

### Server Backend (`server/`)
```bash
# Development
bun run dev  # Start server on localhost:8787

# Database operations
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Apply migrations
bun run db:push      # Push schema changes to database

# Testing
bun test             # Run all tests
bun test:unit        # Run unit tests only
```

### Frontend (`app/`)
Uses **bun** (not npm/yarn/pnpm):
```bash
bun dev     # SvelteKit dev server
bun build   # Build for production
```

## Testing Patterns

Server tests use **Bun's test runner** with in-memory SQLite:

- Tests use global setup via `tests/setup.ts` (preloaded in `bunfig.toml`)
- Database operations use mock D1Database wrapper over Bun's native SQLite
- Use helpers: `resetDb()`, `d1Exec()`, `waitForCount()`, `getBase()`
- Tests run against actual in-memory database for realistic testing

```typescript
// Example test pattern from tests/utils.ts
const base = getBase();
await resetDb(); // Clears tables in test database
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
- `scripts/migrate-to-d1.ts` - Database migration patterns

## Documentation Structure

### Server Documentation (`server/docs/`)
- **LOCAL_SQLITE_SETUP.md** - Local SQLite database setup and configuration
- **ACTIVE_INSTALLATIONS.md** - Active installation tracking feature
- **FORM_ENCODING_SUPPORT.md** - API request format documentation
- **README.md** - Server documentation overview

### Frontend Documentation (`app/docs/`)
- **UX_GUIDELINES.md** - Design system, components, accessibility standards
- **ACCESSIBILITY*.md** - Accessibility implementation and testing
- **contrib/features/** - Feature-specific documentation

## Migration Context

This application runs locally with SQLite. Legacy Cloudflare references have been removed. Schema management uses **Drizzle migrations** with the drizzle.config.ts file pointing to local.db.

Use context7 tool for documentation, when available.
```