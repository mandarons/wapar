# Quick Start: Staging & Production Environments

## Overview

This project uses separate environments for development, staging (PRs), and production:

- **Production**: Automatically deployed from `main` branch
- **Staging**: Automatically deployed for each Pull Request
- **Development**: Local environment for development

## One-Time Setup

### 1. Create Staging Database

Run the setup script to create and configure the staging D1 database:

```bash
./scripts/setup-staging.sh
```

This will:
- Create a new D1 database called `wapar-db-staging`
- Update `server/wrangler.toml` with the database ID
- Deploy the schema to the staging database

### 2. Configure GitHub Secrets

Add these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Workers/D1 | Dashboard → My Profile → API Tokens → Create Token (Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID | Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_SUBDOMAIN` | Your workers.dev subdomain | The part before `.workers.dev` in your worker URLs |
| `CF_API_TOKEN` | API token for Pages | Can use same as CLOUDFLARE_API_TOKEN |
| `CF_ACCOUNT_ID` | Your account ID | Can use same as CLOUDFLARE_ACCOUNT_ID |

### 3. Commit and Push

```bash
git add server/wrangler.toml
git commit -m "Configure staging environment"
git push
```

## How It Works

### When You Create a Pull Request

1. **Backend (Workers)**: 
   - Deploys to `wapar-api-staging.<subdomain>.workers.dev`
   - Uses separate staging D1 database
   - A comment is posted on the PR with the staging URL

2. **Frontend (Pages)**:
   - Deploys to `https://<branch-name>.wapar.pages.dev`
   - Preview is automatically updated with each new commit
   - A comment is posted on the PR with the preview URL

### When You Merge to Main

1. **Backend**: Deploys to production worker
2. **Frontend**: Deploys to production Pages site

## Testing the Setup

1. Create a test branch:
   ```bash
   git checkout -b test-staging-deployment
   ```

2. Make a small change to either `server/` or `app/`

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test staging deployment"
   git push -u origin test-staging-deployment
   ```

4. Create a Pull Request on GitHub

5. Watch the GitHub Actions run and check the PR comments for deployment URLs

## Local Development

### Backend (Workers)

```bash
cd server
bun install
bun run dev  # Runs on http://localhost:8787
```

### Frontend (Pages)

```bash
cd app
bun install
bun dev  # Runs on http://localhost:5173
```

## Troubleshooting

### "Database not found" error in staging

Run the setup script:
```bash
./scripts/setup-staging.sh
```

### GitHub Actions failing with authentication errors

Check that all required secrets are set in GitHub repository settings.

### Preview deployment URL not working

Wait a few minutes after the deployment completes. DNS propagation can take time.

## More Information

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for detailed documentation about:
- Environment configuration
- Database migrations
- Monitoring and debugging
- Security considerations
