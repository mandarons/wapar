# Environment Configuration Guide

Complete guide for staging and production environment setup for the WAPAR application.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Initial Setup](#initial-setup)
- [How Deployments Work](#how-deployments-work)
- [Local Development](#local-development)
- [Database Migrations](#database-migrations)
- [Environment Variables](#environment-variables)
- [Frontend-Backend Integration](#frontend-backend-integration)
- [Monitoring & Debugging](#monitoring--debugging)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Workflow Diagrams](#workflow-diagrams)

---

## Quick Start

### One-Time Setup

**1. Create Staging Database**

```bash
cd server
bunx wrangler d1 create wapar-db-staging
```

Update `server/wrangler.toml` with the returned database ID:

```toml
[env.staging.d1_databases]
binding = "DB"
database_name = "wapar-db-staging"
database_id = "YOUR_STAGING_DATABASE_ID"
```

**2. Apply Migrations to Staging**

```bash
cd server
bunx wrangler d1 migrations apply wapar-db-staging --env staging --remote
```

**3. Configure GitHub Secrets**

Add these secrets in GitHub repository (Settings → Secrets → Actions):

| Secret | Description | How to Get |
|--------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Workers, D1, Pages | Dashboard → My Profile → API Tokens → Create Token (Edit Cloudflare Workers + Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID | Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_SUBDOMAIN` | Your workers.dev subdomain | Include `.workers.dev` (e.g., `mandarons.workers.dev`) |

**4. Test the Setup**

Create a test PR to verify staging deployments work:

```bash
git checkout -b test-staging
# Make a small change
git commit -am "Test staging deployment"
git push -u origin test-staging
# Open PR on GitHub
```

---

## Architecture Overview

### Workers (Backend - `server/`)

Cloudflare Workers backend with three environments configured in `server/wrangler.toml`:

| Environment | Worker Name | Database | Deployed On | Cron Jobs | URL |
|-------------|-------------|----------|-------------|-----------|-----|
| **Production** (default) | `wapar-api` | `wapar-db` | Push to `main` | ✅ Enabled (hourly) | `https://wapar-api.mandarons.com` |
| **Staging** | `wapar-api-staging` | `wapar-db-staging` | Pull Requests | ❌ Disabled | `https://wapar-api-staging.<subdomain>.workers.dev` |
| **Dev** | Local | Local D1 | Manual (`bun run dev`) | ❌ Disabled | `http://localhost:8787` |

### Pages (Frontend - `app/`)

SvelteKit frontend with automatic preview deployments and environment-aware backend integration:

| Environment | Frontend URL | Backend URL | Deployed On |
|-------------|--------------|-------------|-------------|
| **Production** | `https://wapar.pages.dev` | `https://wapar-api.mandarons.com` | Push to `main` |
| **Preview (PR)** | `https://<branch>.wapar.pages.dev` | `https://wapar-api-staging.<subdomain>.workers.dev` | Pull Requests |
| **Dev** | `http://localhost:5173` | `http://localhost:8787` | Manual (`bun dev`) |

**Key Feature:** Preview frontend automatically connects to staging backend, ensuring isolated testing.

---

## Initial Setup

### Create Staging D1 Database

```bash
cd server
bunx wrangler d1 create wapar-db-staging
```

This outputs a database ID. Update `server/wrangler.toml`:

```toml
[env.staging]
name = "wapar-api-staging"
compatibility_date = "2024-01-01"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "wapar-db-staging"
database_id = "YOUR_STAGING_DATABASE_ID"  # Replace with actual ID

[env.staging.vars]
DRIZZLE_LOG = "true"
```

### Apply Database Schema

Staging and production databases use **Drizzle migrations** (located in `server/drizzle/`):

```bash
# Staging
bunx wrangler d1 migrations apply wapar-db-staging --env staging --remote

# Production (when ready)
bunx wrangler d1 migrations apply wapar-db --remote
```

**Note:** Schema is automatically applied during CI/CD deployments. Manual application is only needed for initial setup or troubleshooting.

### Configure GitHub Actions

The workflows in `.github/workflows/` require these secrets:

- `CLOUDFLARE_API_TOKEN` - Create in Cloudflare Dashboard → API Tokens
- `CLOUDFLARE_ACCOUNT_ID` - Found in Dashboard → Workers & Pages
- `CLOUDFLARE_SUBDOMAIN` - Your `*.workers.dev` subdomain

Workflows automatically:
- Run tests before deployment
- Apply database migrations
- Deploy to staging (PRs) or production (main branch)
- Post deployment URLs as PR comments

---

## How Deployments Work

### Pull Request Workflow

When you create or update a PR:

**Backend (Workers):**
1. Tests run automatically
2. Database migrations applied to `wapar-db-staging`
3. Worker deployed to staging environment
4. PR comment posted with staging URL: `https://wapar-api-staging.<subdomain>.workers.dev`

**Frontend (Pages):**
1. SvelteKit app built with `PUBLIC_API_URL` set to staging backend
2. Deployed to Cloudflare Pages preview
3. PR comment posted with preview URL: `https://<branch>.wapar.pages.dev`

**Result:** Fully isolated staging environment for testing.

### Production Workflow

When PR is merged to `main`:

**Backend:**
1. Tests run
2. Database migrations applied to `wapar-db` (production)
3. Worker deployed to production
4. Live at: `https://wapar-api.mandarons.com`

**Frontend:**
1. Built with `PUBLIC_API_URL` set to production backend
2. Deployed to Cloudflare Pages production
3. Live at: `https://wapar.pages.dev`

---

## Local Development

### Backend (Workers)

```bash
cd server

# Install dependencies
bun install

# Apply migrations to local database
bunx wrangler d1 migrations apply wapar-db --local

# Run dev server (uses 'dev' environment)
bun run dev
```

Server runs at `http://localhost:8787` with verbose logging enabled.

### Frontend (Pages)

```bash
cd app

# Install dependencies
bun install

# Run dev server
bun dev
```

Frontend runs at `http://localhost:5173` and connects to `http://localhost:8787` by default.

To test with a different backend:

```bash
PUBLIC_API_URL=https://wapar-api-staging.example.workers.dev bun dev
```

Or create `app/.env`:
```
PUBLIC_API_URL=http://localhost:8787
```

---

## Database Migrations

### Using Drizzle ORM

This project uses **Drizzle ORM** for database migrations. Migrations are in `server/drizzle/`.

**Important:** Runtime migrations are disabled. Migrations must be applied via Wrangler CLI before deployment.

### Creating Migrations

When you modify `server/src/db/schema.ts`:

```bash
cd server

# Generate migration files
bun run db:generate

# This creates a new file in drizzle/ with SQL changes
```

### Applying Migrations

**Local:**
```bash
bunx wrangler d1 migrations apply wapar-db --local
```

**Staging:**
```bash
bunx wrangler d1 migrations apply wapar-db-staging --env staging --remote
```

**Production:**
```bash
bunx wrangler d1 migrations apply wapar-db --remote
```

**CI/CD:** Migrations are automatically applied during deployment workflows.

### Viewing Migration Status

```bash
# Local
bunx wrangler d1 migrations list wapar-db --local

# Staging
bunx wrangler d1 migrations list wapar-db-staging --env staging --remote

# Production
bunx wrangler d1 migrations list wapar-db --remote
```

---

## Environment Variables

### Workers Backend

Configured in `server/wrangler.toml`:

```toml
# Production (default)
[vars]
DRIZZLE_LOG = "false"
ACTIVITY_THRESHOLD_DAYS = "3"

# Staging
[env.staging.vars]
DRIZZLE_LOG = "true"
ACTIVITY_THRESHOLD_DAYS = "3"

# Dev
[env.dev.vars]
DRIZZLE_LOG = "true"
```

### Pages Frontend

SvelteKit requires public environment variables to be prefixed with `PUBLIC_`:

- `PUBLIC_API_URL` - Backend API URL (set automatically by CI/CD)

Configure in Cloudflare Dashboard:
1. Workers & Pages → Select project
2. Settings → Environment variables
3. Add separately for Production and Preview environments

---

## Frontend-Backend Integration

### How It Works

The frontend uses `PUBLIC_API_URL` to determine which backend to connect to:

```typescript
// app/src/routes/+page.server.ts
import { env } from '$env/dynamic/public';
const API_URL = env.PUBLIC_API_URL || 'https://wapar-api.mandarons.com';
```

### Automatic Environment Detection

GitHub Actions automatically sets the correct API URL:

**Preview (PR):**
```yaml
PUBLIC_API_URL: https://wapar-api-staging.<subdomain>.workers.dev
```

**Production (main):**
```yaml
PUBLIC_API_URL: https://wapar-api.mandarons.com
```

### Environment Matrix

| Frontend | Backend | Database | Purpose |
|----------|---------|----------|---------|
| Preview deployment | Staging worker | `wapar-db-staging` | Test PR changes |
| Production site | Production worker | `wapar-db` | Live users |
| Local dev | Local worker | Local D1 | Development |

### Benefits

✅ **Isolated Testing** - Preview deployments never affect production data  
✅ **Automatic Configuration** - No manual environment switching needed  
✅ **Consistency** - Frontend and backend deployed together with matching versions

### Verification

To verify preview deployments use staging backend:

1. Create a test PR
2. Visit the preview URL (posted in PR comment)
3. Open DevTools → Network tab
4. Check API requests go to `wapar-api-staging.*.workers.dev`

---

## Monitoring & Debugging

### View Logs

**Workers (real-time):**
```bash
# Production
bunx wrangler tail wapar-api

# Staging
bunx wrangler tail wapar-api-staging --env staging
```

**Pages:**  
View in Cloudflare Dashboard → Workers & Pages → wapar → Deployments → Logs

### Access D1 Console

Execute SQL queries directly:

```bash
# Production
bunx wrangler d1 execute wapar-db --remote --command "SELECT * FROM Installation LIMIT 10"

# Staging
bunx wrangler d1 execute wapar-db-staging --env staging --remote --command "SELECT COUNT(*) FROM Installation"
```

### Check Deployment Status

```bash
# List Workers deployments
bunx wrangler deployments list

# Check D1 databases
bunx wrangler d1 list
```

---

## Troubleshooting

### Staging Database Not Found

**Error:** `Database 'wapar-db-staging' not found`

**Fix:**
1. Create: `bunx wrangler d1 create wapar-db-staging`
2. Update `database_id` in `server/wrangler.toml`
3. Apply migrations: `bunx wrangler d1 migrations apply wapar-db-staging --env staging --remote`

### Preview Frontend Calling Production Backend

**Symptom:** Preview shows production data

**Cause:** `PUBLIC_API_URL` not set during build

**Fix:** Check GitHub Actions logs for the Build step. Verify `PUBLIC_API_URL` environment variable is set correctly.

### Migration Already Applied Error

**Error:** `Migration already applied`

**Cause:** Migration tracking table (`d1_migrations`) out of sync

**Fix:** Check applied migrations:
```bash
bunx wrangler d1 execute wapar-db --remote --command "SELECT * FROM d1_migrations"
```

### CORS Errors in Preview

**Symptom:** Browser console shows CORS errors

**Cause:** Staging backend doesn't allow preview domain

**Fix:** Update CORS configuration in `server/src/index.ts`:
```typescript
app.use('*', cors({
  origin: [
    'https://wapar.pages.dev',
    'https://*.wapar.pages.dev',  // Allow all preview deployments
  ]
}))
```

### Different Behavior Between Environments

Remember:
- Cron jobs only run in production
- Staging uses separate database (different data)
- Environment variables may differ
- Logging verbosity differs (`DRIZZLE_LOG`)

---

## Security Notes

### Preview Deployments

- Preview deployments are **public by default**
- Staging Workers are **publicly accessible**
- Use separate API keys/tokens for staging vs production
- Don't use sensitive production data in staging

### Restricting Access

To require authentication for preview deployments:

1. Cloudflare Dashboard → Workers & Pages → wapar
2. Settings → General → Enable access policy
3. Configure Cloudflare Access

### Best Practices

✅ Use separate databases for each environment  
✅ Never share production secrets with staging  
✅ Rotate API tokens regularly  
✅ Enable audit logging for production deployments  
✅ Review PR deployments before merging  

---

## Workflow Diagrams

### Pull Request Workflow

```
Developer creates PR (feature-branch → main)
    ↓
GitHub Actions Triggered
    ├─→ Workers CI/CD
    │   ├─→ Run Tests ✅
    │   ├─→ Apply Migrations to staging DB
    │   └─→ Deploy to wapar-api-staging
    │
    └─→ Pages CI/CD
        ├─→ Build with PUBLIC_API_URL=staging
        └─→ Deploy to <branch>.wapar.pages.dev
    ↓
Post PR comment with URLs
    ├─→ Backend: https://wapar-api-staging.example.workers.dev
    └─→ Frontend: https://<branch>.wapar.pages.dev
```

### Production Deployment Workflow

```
PR merged to main
    ↓
GitHub Actions Triggered
    ├─→ Workers CI/CD
    │   ├─→ Run Tests ✅
    │   ├─→ Apply Migrations to production DB
    │   └─→ Deploy to wapar-api (production)
    │
    └─→ Pages CI/CD
        ├─→ Build with PUBLIC_API_URL=production
        └─→ Deploy to wapar.pages.dev
    ↓
Production live ✅
    ├─→ Workers: https://wapar-api.mandarons.com
    ├─→ Pages: https://wapar.pages.dev
    └─→ Cron jobs: Active
```

### Environment Comparison

```
┌──────────────┬──────────────────┬───────────────────┬───────────────────┐
│ Aspect       │ Development      │ Staging (PR)      │ Production (Main) │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Worker URL   │ localhost:8787   │ wapar-api-staging │ wapar-api.        │
│              │                  │ .workers.dev      │ mandarons.com     │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Pages URL    │ localhost:5173   │ <branch>.wapar    │ wapar.pages.dev   │
│              │                  │ .pages.dev        │                   │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Database     │ Local D1         │ wapar-db-staging  │ wapar-db          │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Cron Jobs    │ ❌ Disabled      │ ❌ Disabled       │ ✅ Enabled        │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Logging      │ ✅ Verbose       │ ✅ Verbose        │ ⚠️  Minimal       │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Deploy       │ Manual           │ Auto on PR        │ Auto on merge     │
├──────────────┼──────────────────┼───────────────────┼───────────────────┤
│ Purpose      │ Local dev/test   │ Test before merge │ Live production   │
└──────────────┴──────────────────┴───────────────────┴───────────────────┘
```

### Database Migration Flow

```
Schema change in server/src/db/schema.ts
    ↓
Generate migration: bun run db:generate
    ↓
Creates file in server/drizzle/NNNN_description.sql
    ↓
Open PR with migration
    ↓
GitHub Actions: Apply to staging DB
    ↓
Test with staging database
    ↓
Merge PR
    ↓
GitHub Actions: Apply to production DB
    ↓
Production DB updated ✅
```

---

## Additional Resources

- [Cloudflare Workers Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare Pages Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [SvelteKit Environment Variables](https://kit.svelte.dev/docs/modules#$env-dynamic-public)
