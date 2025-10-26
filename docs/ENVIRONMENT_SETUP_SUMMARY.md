# Environment Configuration Summary

## What Was Changed

### 1. Workers Configuration (`server/wrangler.toml`)

**Added staging environment:**
- New `[env.staging]` section with separate D1 database binding
- Staging worker will be named `wapar-api-staging`
- Staging database: `wapar-db-staging` (needs to be created)
- Cron jobs disabled in staging (only run in production)

**Reorganized structure:**
- Production environment is now the default (top-level)
- Dev environment for local development
- Staging environment for PR deployments

### 2. Workers Deployment Workflow (`.github/workflows/deploy-workers.yml`)

**New workflow that:**
- Runs tests before deployment
- Deploys to **staging** on Pull Requests
- Deploys to **production** on push to main
- Automatically deploys database schema
- Posts a comment on PRs with staging deployment URL
- Supports manual deployment via workflow_dispatch

### 3. Pages Deployment Workflow (`.github/workflows/deploy-client.yml`)

**Updated workflow to:**
- Deploy on both PRs (preview) and main (production)
- Use branch name for preview deployments
- Post a comment on PRs with preview URL
- Leverage Cloudflare's automatic preview deployment feature

### 4. Documentation

**Created three documentation files:**

1. **ENVIRONMENTS.md** - Comprehensive guide covering:
   - Architecture overview
   - Setup instructions
   - Workflow details
   - Database migrations
   - Monitoring and debugging
   - Security considerations

2. **QUICK_START_ENVIRONMENTS.md** - Quick start guide for:
   - One-time setup steps
   - How environments work
   - Testing the setup
   - Troubleshooting common issues

3. **scripts/setup-staging.sh** - Automated setup script that:
   - Creates staging D1 database
   - Extracts and updates database ID in wrangler.toml
   - Deploys schema to staging database

## Next Steps

### Immediate Actions Required

1. **Create staging D1 database:**
   ```bash
   ./scripts/setup-staging.sh
   ```

2. **Configure GitHub Secrets** (in repository Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_SUBDOMAIN`
   - `CF_API_TOKEN`
   - `CF_ACCOUNT_ID`

3. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Configure staging and production environments"
   git push
   ```

### Testing the Setup

1. Create a test branch
2. Make a small change to `server/` or `app/`
3. Open a Pull Request
4. Verify that:
   - GitHub Actions workflows run successfully
   - Staging/preview deployments are created
   - Comments are posted on the PR with deployment URLs

## How Environments Work Now

### Production (Main Branch)

**Workers Backend:**
- URL: `https://wapar-api.mandarons.com` (or your production domain)
- Database: `wapar-db` (existing production database)
- Cron Jobs: Enabled (hourly)
- Deployed: On push to `main`

**Pages Frontend:**
- URL: `https://wapar.pages.dev` (or custom domain)
- Deployed: On push to `main`

### Staging (Pull Requests)

**Workers Backend:**
- URL: `https://wapar-api-staging.<subdomain>.workers.dev`
- Database: `wapar-db-staging` (separate staging database)
- Cron Jobs: Disabled
- Deployed: On PR creation/update

**Pages Frontend:**
- URL: `https://<branch-name>.wapar.pages.dev`
- Deployed: On PR creation/update
- Automatically created by Cloudflare

### Development (Local)

**Workers Backend:**
- URL: `http://localhost:8787`
- Database: Local D1 instance
- Command: `bun run dev`

**Pages Frontend:**
- URL: `http://localhost:5173`
- Command: `bun dev`

## Key Features

### Automatic PR Deployments

When you create a PR:
1. Tests run automatically
2. If tests pass, deploys to staging/preview
3. Posts comment with deployment URLs
4. Updates automatically on new commits

### Separate Databases

- Production and staging use separate D1 databases
- No risk of staging changes affecting production data
- Schema changes tested in staging before production

### Environment-Specific Configuration

- Different logging levels (verbose in staging/dev, minimal in production)
- Cron jobs only in production
- Easy to add more environment-specific settings

### Manual Deployment Option

Use workflow_dispatch to manually deploy to either environment:
1. Go to Actions → Deploy Workers
2. Click "Run workflow"
3. Select environment (production/staging)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Repository                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Push to main          │         Pull Request               │
│         │              │              │                      │
│         ▼              │              ▼                      │
│  ┌─────────────┐       │      ┌─────────────┐              │
│  │   CI/CD     │       │      │   CI/CD     │              │
│  │  (Actions)  │       │      │  (Actions)  │              │
│  └──────┬──────┘       │      └──────┬──────┘              │
│         │              │              │                      │
└─────────┼──────────────┼──────────────┼──────────────────────┘
          │              │              │
          ▼              │              ▼
┌──────────────────┐     │     ┌──────────────────┐
│   Production     │     │     │     Staging      │
├──────────────────┤     │     ├──────────────────┤
│                  │     │     │                  │
│  Workers:        │     │     │  Workers:        │
│  wapar-api       │     │     │  wapar-api-      │
│                  │     │     │    staging       │
│  Database:       │     │     │                  │
│  wapar-db        │     │     │  Database:       │
│                  │     │     │  wapar-db-       │
│  Pages:          │     │     │    staging       │
│  wapar.pages.dev │     │     │                  │
│                  │     │     │  Pages:          │
│  Crons: ✓        │     │     │  <branch>.       │
│                  │     │     │  wapar.pages.dev │
│                  │     │     │                  │
│                  │     │     │  Crons: ✗        │
└──────────────────┘     │     └──────────────────┘
```

## Questions or Issues?

- Check [ENVIRONMENTS.md](./ENVIRONMENTS.md) for detailed documentation
- See [QUICK_START_ENVIRONMENTS.md](./QUICK_START_ENVIRONMENTS.md) for setup guide
- Review GitHub Actions logs for deployment issues
- Check Cloudflare Dashboard for runtime issues
