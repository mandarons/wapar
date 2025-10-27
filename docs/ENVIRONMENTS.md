# Environment Configuration Guide

This document explains the staging and production environment setup for the WAPAR application.

## Overview

The application now supports multiple environments with **full-stack integration**:

- **Production**: Deployed from the `main` branch (frontend + backend)
- **Staging**: Automatically deployed for each Pull Request (frontend + backend)

**Important:** Preview frontend deployments automatically connect to the staging backend API, ensuring isolated testing without affecting production data.

## Architecture

### Workers (Backend - `server/`)

The Cloudflare Workers backend uses Wrangler environments configured in `server/wrangler.toml`:

- **Production Environment** (default)
  - Worker Name: `wapar-api`
  - Database: `wapar-db`
  - Deployed on: Push to `main` branch
  - Cron Jobs: Enabled (hourly IP enrichment)
  - URL: `https://wapar-api.mandarons.com`

- **Staging Environment** (`staging`)
  - Worker Name: `wapar-api-staging`
  - Database: `wapar-db-staging`
  - Deployed on: Pull Requests to `main`
  - Cron Jobs: Disabled
  - URL: `https://wapar-api-staging.<subdomain>.workers.dev`

- **Dev Environment** (`dev`)
  - Local development only
  - Uses local D1 database

### Pages (Frontend - `app/`)

The SvelteKit frontend uses Cloudflare Pages with automatic preview deployments and **environment-aware backend integration**:

- **Production Deployment**
  - URL: `https://wapar.pages.dev` (or custom domain)
  - Backend API: `https://wapar-api.mandarons.com`
  - Deployed on: Push to `main` branch

- **Preview Deployments**
  - URL: `https://<branch-name>.wapar.pages.dev`
  - Backend API: `https://wapar-api-staging.<subdomain>.workers.dev`
  - Deployed on: Pull Requests
  - Automatically created by Cloudflare Pages for each PR
  - Each branch gets its own preview URL
  - **Connects to staging backend automatically**

### Frontend-Backend Integration

The frontend automatically uses the correct backend based on the deployment environment:

- **Preview builds**: Set `PUBLIC_API_URL` to staging backend
- **Production builds**: Set `PUBLIC_API_URL` to production backend
- **Local development**: Uses `http://localhost:8787` or can be configured

See [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) for detailed information.

## Initial Setup

### 1. Create Staging D1 Database

```bash
cd server
bunx wrangler d1 create wapar-db-staging
```

This will output a database ID. Update `server/wrangler.toml`:

```toml
[env.staging.d1_databases]
binding = "DB"
database_name = "wapar-db-staging"
database_id = "YOUR_STAGING_DATABASE_ID"  # Replace with actual ID
```

### 2. Deploy Schema to Staging Database

```bash
cd server
bunx wrangler d1 execute wapar-db-staging --remote --file=./schema.sql
```

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers, D1, and Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_SUBDOMAIN`: Your workers.dev subdomain (e.g., if your workers.dev URL is `myapp.example.workers.dev`, use `example`)

### 4. Enable GitHub Actions

The workflows are located in `.github/workflows/`:
- `deploy-workers.yml`: Deploys Workers backend
- `deploy-client.yml`: Deploys Pages frontend

Both workflows will run automatically when:
- PRs are opened/updated (deploys to staging/preview)
- Changes are pushed to `main` (deploys to production)

## Workflow Details

### Pull Request Workflow

When you create a PR:

1. **Workers Backend**
   - Tests run automatically
   - If tests pass, deploys to staging environment
   - Creates/updates a comment on the PR with the staging URL
   - Staging worker URL: `https://wapar-api-staging.<your-subdomain>.workers.dev`

2. **Pages Frontend**
   - Builds the SvelteKit app
   - Deploys to Cloudflare Pages preview
   - Creates/updates a comment on the PR with the preview URL
   - Preview URL: `https://<branch-name>.wapar.pages.dev`

### Main Branch Workflow

When changes are merged to `main`:

1. **Workers Backend**
   - Tests run
   - Deploys database schema to production D1
   - Deploys to production environment
   - Production URL: `https://wapar-api.mandarons.com`

2. **Pages Frontend**
   - Builds the SvelteKit app
   - Deploys to production Pages environment
   - Production URL: `https://wapar.pages.dev` (or custom domain)

## Local Development

### Workers Backend

```bash
cd server

# Install dependencies
bun install

# Setup local D1 database
bunx wrangler d1 execute wapar-db --file=./schema.sql

# Run in development mode
bun run dev
```

The dev server runs at `http://localhost:8787` with the `dev` environment configuration.

### Pages Frontend

```bash
cd app

# Install dependencies
bun install

# Run development server
bun dev
```

## Environment Variables

### Workers

Environment-specific variables are configured in `wrangler.toml`:

```toml
# Production
[vars]
DRIZZLE_LOG = "false"

# Staging
[env.staging.vars]
DRIZZLE_LOG = "true"

# Dev
[env.dev.vars]
DRIZZLE_LOG = "true"
```

### Pages

Frontend environment variables should be prefixed with `PUBLIC_` for SvelteKit.

Configure them in the Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your Pages project (`wapar`)
3. Settings → Environment variables
4. Add variables for Production and Preview separately

## Database Migrations

### Production

Database schema changes are automatically deployed to production when pushing to `main`:

```bash
# The GitHub Actions workflow runs:
cd server && bun run db:deploy:remote
```

### Staging

Database schema is deployed to staging on PR deployments:

```bash
# The GitHub Actions workflow runs:
bunx wrangler d1 execute wapar-db-staging --remote --file=./schema.sql
```

### Manual Deployment

If you need to manually deploy schema changes:

```bash
cd server

# Production
bunx wrangler d1 execute wapar-db --remote --file=./schema.sql

# Staging
bunx wrangler d1 execute wapar-db-staging --remote --file=./schema.sql
```

## Monitoring and Debugging

### View Logs

**Workers:**
```bash
# Production
bunx wrangler tail wapar-api

# Staging
bunx wrangler tail wapar-api --env staging
```

**Pages:**
View logs in the Cloudflare Dashboard under Workers & Pages → wapar → Deployments

### Access D1 Console

```bash
# Production
bunx wrangler d1 execute wapar-db --remote --command "SELECT * FROM installations LIMIT 10"

# Staging
bunx wrangler d1 execute wapar-db-staging --remote --command "SELECT * FROM installations LIMIT 10"
```

## Troubleshooting

### Staging Database Not Found

If you get errors about the staging database not existing:

1. Create it: `bunx wrangler d1 create wapar-db-staging`
2. Update the `database_id` in `wrangler.toml`
3. Deploy the schema: `bunx wrangler d1 execute wapar-db-staging --remote --file=./schema.sql`

### Preview Deployment Not Working

1. Check that the Cloudflare Pages project exists
2. Verify GitHub Actions secrets are set correctly
3. Check the GitHub Actions logs for errors

### Different Behavior Between Environments

Remember that:
- Cron jobs only run in production
- Staging uses a separate database with potentially different data
- Environment variables may differ between environments

## Security Notes

- Preview deployments are public by default
- To restrict access to preview deployments:
  1. Go to Cloudflare Dashboard → Workers & Pages → wapar
  2. Settings → General → Enable access policy
  3. This requires authentication via Cloudflare Access

- Staging Workers are publicly accessible
- Ensure sensitive data is not used in staging environment
- Use separate API keys/tokens for staging vs production

## Additional Resources

- [Cloudflare Workers Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare Pages Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
