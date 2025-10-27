# Implementation Checklist

Use this checklist to complete the staging and production environment setup.

## ✅ Completed (Already Done)

- [x] Configure `server/wrangler.toml` with staging environment
- [x] Create `.github/workflows/deploy-workers.yml` for Workers deployment
- [x] Update `.github/workflows/deploy-client.yml` for Pages preview deployments
- [x] Create setup script at `scripts/setup-staging.sh`
- [x] Create comprehensive documentation (ENVIRONMENTS.md, QUICK_START_ENVIRONMENTS.md)

## 🔧 Required Setup Steps (Do These Next)

### 1. Create Staging D1 Database

- [ ] Run the setup script:
  ```bash
  ./scripts/setup-staging.sh
  ```
  
  **OR manually:**
  
  ```bash
  cd server
  bunx wrangler d1 create wapar-db-staging
  ```
  
  Then update `server/wrangler.toml` with the returned `database_id`

### 2. Configure GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

- [ ] `CLOUDFLARE_API_TOKEN`
  - How to get: Cloudflare Dashboard → My Profile → API Tokens → Create Token
  - Template: "Edit Cloudflare Workers"
  - Permissions needed: Account.Cloudflare Workers Scripts (Edit), Account.D1 (Edit), Account.Pages (Edit)

- [ ] `CLOUDFLARE_ACCOUNT_ID`
  - How to get: Cloudflare Dashboard → Workers & Pages → Copy Account ID from right sidebar

- [ ] `CLOUDFLARE_SUBDOMAIN`
  - What it is: Your full workers.dev subdomain (e.g., `mandarons.workers.dev`)
  - How to find: Check any existing worker URL - it's everything after the worker name

### 3. Commit and Push Changes

- [ ] Review the changes:
  ```bash
  git status
  git diff server/wrangler.toml
  ```

- [ ] Commit the configuration:
  ```bash
  git add .
  git commit -m "Configure staging and production environments
  
  - Add staging environment to wrangler.toml
  - Create deploy-workers.yml workflow for automated deployments
  - Update deploy-client.yml for Pages preview deployments
  - Add setup script and documentation"
  ```

- [ ] Push to GitHub:
  ```bash
  git push origin main
  ```

### 4. Test the Setup

- [ ] Create a test branch:
  ```bash
  git checkout -b test-staging-deployment
  ```

- [ ] Make a small test change:
  ```bash
  echo "// Test staging deployment" >> server/src/index.ts
  git add server/src/index.ts
  git commit -m "Test: Verify staging deployment"
  git push -u origin test-staging-deployment
  ```

- [ ] Create a Pull Request on GitHub

- [ ] Verify GitHub Actions:
  - [ ] Check that "Deploy Workers" workflow runs
  - [ ] Check that "Deploy Pages (Frontend)" workflow runs
  - [ ] Both should succeed

- [ ] Verify PR Comments:
  - [ ] Look for a comment with staging Worker URL (🚀 Staging Deployment)
  - [ ] Look for a comment with Pages preview URL (🎨 Frontend Preview Deployment)

- [ ] Test the deployments:
  - [ ] Visit the staging Worker URL
  - [ ] Visit the Pages preview URL
  - [ ] Both should be accessible

- [ ] Clean up:
  ```bash
  git checkout main
  git branch -D test-staging-deployment
  ```
  
  And delete the remote branch via GitHub PR interface

### 5. Merge First Real PR

- [ ] Create a real feature branch
- [ ] Make changes
- [ ] Open PR
- [ ] Review staging/preview deployments
- [ ] Get code review
- [ ] Merge to main
- [ ] Verify production deployment succeeds

## 🎯 Optional Enhancements

### Security

- [ ] Enable Cloudflare Access for preview deployments:
  1. Cloudflare Dashboard → Workers & Pages → wapar
  2. Settings → General → Enable access policy
  3. Configure who can view preview deployments

### Monitoring

- [ ] Set up Cloudflare analytics dashboards
- [ ] Configure Sentry or error tracking (if needed)
- [ ] Set up uptime monitoring

### Database

- [ ] Plan for database migration strategy between staging and production
- [ ] Consider seeding staging database with test data
- [ ] Document any manual data migration steps

### Documentation

- [ ] Update main README.md to link to ENVIRONMENTS.md
- [ ] Add environment badge to README showing which deployment is which
- [ ] Document any environment-specific features or limitations

## 📋 Validation Checklist

After completing the setup, verify:

- [ ] **Production Workers**: Accessible at production URL
- [ ] **Production Pages**: Accessible at production URL
- [ ] **Staging Workers**: Deploys automatically on PRs
- [ ] **Preview Pages**: Creates preview URLs for PRs
- [ ] **PR Comments**: Automatically posted with deployment URLs
- [ ] **Tests**: Run before deployment
- [ ] **Database Schema**: Automatically deployed
- [ ] **Local Dev**: Still works with `bun run dev`

## 🆘 Troubleshooting

If something doesn't work:

1. **Check GitHub Actions logs**
   - Go to Actions tab in GitHub
   - Look for error messages
   - Common issues: missing secrets, wrong permissions

2. **Verify secrets are set**
   - Settings → Secrets and variables → Actions
   - All 5 secrets should be present

3. **Check Cloudflare Dashboard**
   - Workers & Pages section
   - Look for deployment logs
   - Verify databases exist

4. **Review wrangler.toml**
   - Staging database_id should be set (not STAGING_DB_ID_PLACEHOLDER)
   - All environments should have correct configuration

5. **Test locally**
   ```bash
   cd server
   bun run dev
   # Should work at http://localhost:8787
   ```

## 📚 Resources

- [ENVIRONMENTS.md](./ENVIRONMENTS.md) - Comprehensive documentation
- [QUICK_START_ENVIRONMENTS.md](./QUICK_START_ENVIRONMENTS.md) - Quick start guide
- [ENVIRONMENT_SETUP_SUMMARY.md](./ENVIRONMENT_SETUP_SUMMARY.md) - What was changed
- [Cloudflare Workers Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare Pages Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

---

**Last Updated**: October 26, 2025
