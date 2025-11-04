# Deployment Guide - WAPAR Workers App with Drizzle ORM

This guide covers deploying the WAPAR Workers App to Cloudflare Workers with Drizzle ORM integration.

## Prerequisites

- Cloudflare account with Workers and D1 access
- Wrangler CLI installed and authenticated (`wrangler auth login`)
- Node.js/Bun and npm installed

## Important: Migration Strategy

**Runtime migrations are disabled** in this application. Migrations must be applied using the Wrangler CLI before deployment, not at runtime in the Worker.

### Why Runtime Migrations Are Disabled

1. **Bundle Size**: Including migration files in the Worker bundle increases bundle size
2. **Reliability**: Pre-deployment migrations are more reliable and predictable
3. **Performance**: No migration overhead on Worker startup
4. **Best Practice**: Cloudflare recommends applying D1 migrations via CLI

### Migration Configuration

The `wrangler.toml` is configured to use the `drizzle/` folder for migrations:

```toml
[[d1_databases]]
binding = "DB"
database_name = "wapar-db"
database_id = "your-database-id-here"
migrations_dir = "drizzle"  # Points to Drizzle's migration folder
```

## Database Setup

### 1. Create D1 Database (if not exists)
```bash
wrangler d1 create wapar-db
```

### 2. Update wrangler.toml
Ensure your `wrangler.toml` has the correct database configuration:
```toml
[[d1_databases]]
binding = "DB"
database_name = "wapar-db"
database_id = "your-database-id-here"
migrations_dir = "drizzle"
```

## Deployment Process

### Quick Deployment (Recommended)
```bash
npm run deploy
```
This automatically:
1. Applies pending migrations to the remote D1 database
2. Deploys the Workers application

### Manual Step-by-Step Deployment

1. **Generate Migrations** (if schema changed)
   ```bash
   npm run db:generate
   ```

2. **List Pending Migrations**
   ```bash
   npm run db:list
   ```

3. **Apply Migrations to Production**
   ```bash
   npm run db:deploy
   ```

4. **Deploy Application**
   ```bash
   wrangler deploy
   ```

## Available Scripts

- `npm run dev` - Start local development server
- `npm run db:generate` - Generate Drizzle migration files from schema
- `npm run db:list` - List pending migrations
- `npm run db:deploy` - Deploy migrations to remote (production) D1 database
- `npm run db:deploy:local` - Apply migrations to local D1 database
- `npm run deploy` - **Full deployment: runs db:deploy + wrangler deploy**
- `npm run test` - Run test suite

## Environment Configuration

### Production Environment (default)
- `DRIZZLE_LOG="false"` - Disables Drizzle query logging
- Geographic data automatically captured from Cloudflare's `request.cf` object

### Staging Environment (`--env staging`)
- Database: `wapar-db-staging`
- `DRIZZLE_LOG="true"` - Enables query logging
- Geographic data automatically captured from Cloudflare's `request.cf` object

### Development Environment (`npm run dev`)
- `ENABLE_TEST_ROUTES="1"` - Enables test routes
- `DRIZZLE_LOG="true"` - Enables query logging
- Local D1 database

## Database Schema Management

The app uses Drizzle ORM with the following tables:
- `Installation` - Tracks app installations with geolocation data
- `Heartbeat` - Records periodic health checks from installations

Schema is defined in `src/db/schema.ts` and migrations are generated in the `drizzle/` directory.

### Adding New Migrations

1. Update schema in `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `drizzle/XXXX_*.sql`
4. Apply to development: `npm run db:deploy:local`
5. Test locally with `npm run dev`
6. Deploy to production: `npm run deploy`

## Troubleshooting

### "Can't find meta/_journal.json" Error
**This error has been fixed** by:
1. Configuring `migrations_dir = "drizzle"` in `wrangler.toml`
2. Disabling runtime migrations in `src/db/migrations.ts`
3. Applying migrations via Wrangler CLI before deployment

If you still see this error:
- Ensure `migrations_dir = "drizzle"` is set in your `wrangler.toml`
- Run `npm run db:deploy` before deploying
- Check that `drizzle/meta/_journal.json` exists locally

### Migration Issues
If you encounter migration errors:
1. Check that your D1 database exists: `wrangler d1 list`
2. Verify database ID matches in `wrangler.toml` and `drizzle.config.ts`
3. Ensure you're authenticated: `wrangler whoami`
4. List migrations: `npm run db:list`
5. Try applying migrations manually: `wrangler d1 migrations apply wapar-db --remote`

### "Table already exists" Error
If migrations fail with "table already exists":
- The database was likely created manually or from an old process
- Use the `fix-migration-state.sh` script to mark existing migrations as applied
- Or drop and recreate the database for a clean slate

### Deployment Failures
If deployment fails:
1. Authenticate: `wrangler auth login`
2. Check D1 access: `wrangler d1 list`
3. Verify environment variables in `wrangler.toml`
4. Check logs: `wrangler tail wapar-api`

## Security Notes

- All database queries use Drizzle ORM to prevent SQL injection
- Test routes are automatically disabled in production
- Environment variables configured through `wrangler.toml`
- No sensitive data in version control

