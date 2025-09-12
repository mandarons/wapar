# Deployment Guide - WAPAR Workers App with Drizzle ORM

This guide covers deploying the WAPAR Workers App to Cloudflare Workers with Drizzle ORM integration.

## Prerequisites

- Cloudflare account with Workers and D1 access
- Wrangler CLI installed and authenticated
- Node.js and npm installed

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
```

## Drizzle ORM Deployment Process

### 1. Generate Migrations
Generate Drizzle migration files from schema:
```bash
npm run db:generate
```

### 2. Deploy Database Schema
Apply migrations to your D1 database:
```bash
npm run db:deploy
```

### 3. Deploy Application
Deploy the Workers app:
```bash
npm run deploy
```

The `deploy` script automatically runs database deployment followed by app deployment.

## Available Scripts

- `npm run dev` - Start local development server
- `npm run db:generate` - Generate Drizzle migration files
- `npm run db:deploy` - Deploy database schema to D1
- `npm run db:push` - Push schema changes directly (development only)
- `npm run deploy` - Full deployment (database + app)
- `npm run test` - Run test suite

## Environment Configuration

### Production Variables
- `ENABLE_TEST_ROUTES="0"` - Disables test routes in production
- `DRIZZLE_LOG="false"` - Disables Drizzle query logging

### Development Variables
- `ENABLE_TEST_ROUTES="1"` - Enables test routes for development
- `DRIZZLE_LOG="true"` - Enables Drizzle query logging for debugging

## Database Schema Management

The app uses Drizzle ORM with the following tables:
- `Installation` - Tracks app installations with geolocation data
- `Heartbeat` - Records periodic health checks from installations

Schema is defined in `src/db/schema.ts` and migrations are generated in the `drizzle/` directory.

## Troubleshooting

### Migration Issues
If you encounter migration errors:
1. Check that your D1 database exists and is accessible
2. Verify the database ID in `wrangler.toml` matches your actual database
3. Ensure you have proper Cloudflare permissions

### Query Errors
If you see SQL-related errors:
1. Check that migrations have been applied: `npm run db:deploy`
2. Verify schema matches your Drizzle definitions
3. Enable query logging with `DRIZZLE_LOG="true"` for debugging

### Deployment Failures
If deployment fails:
1. Ensure you're authenticated with Wrangler: `wrangler auth login`
2. Check that your account has Workers and D1 enabled
3. Verify all environment variables are properly configured

## Security Notes

- All database queries use Drizzle ORM to prevent SQL injection
- Test routes are automatically disabled in production
- Environment variables should be configured through Wrangler, not hardcoded
