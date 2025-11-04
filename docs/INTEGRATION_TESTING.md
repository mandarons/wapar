# Integration Testing Documentation

This document explains the integration testing strategy for WAPAR's deployed staging environment.

## Overview

WAPAR has **three levels of testing**:

1. **Unit Tests** - Test individual functions and components in isolation
2. **E2E Tests (Local)** - Test the application with `unstable_dev` and local servers
3. **Integration Tests (Deployed)** - Test actual deployed staging environment ⭐ **(NEW)**

## Why Integration Tests?

Integration tests catch issues that unit and local E2E tests cannot:

- ✅ Missing database migrations in production
- ✅ Environment-specific configuration issues
- ✅ Cloudflare Workers/D1/Pages behavior differences
- ✅ CORS and cross-origin issues
- ✅ Network timeouts and latency
- ✅ Production data format changes

### Recent Example

The production incident where database migrations weren't applied would have been caught by these integration tests:

```typescript
test('database schema has required columns (heartbeat update)', async () => {
  // Create installation
  const { id } = await createInstallation();
  
  // Send heartbeat - updates last_heartbeat_at column
  const response = await sendHeartbeat(id);
  
  // If last_heartbeat_at column exists, this succeeds
  expect(response.ok).toBe(true);  // ❌ Would fail if migration not applied
});
```

## Architecture

### Backend Integration Tests

**Location**: `server/tests/integration/`  
**Technology**: TypeScript + Vitest + Bun  
**Runs Against**: Deployed Cloudflare Workers + D1  

Tests all API endpoints with real HTTP requests:
- POST `/api/installation` - Installation creation
- POST `/api/heartbeat` - Heartbeat submission
- GET `/api/usage` - Usage analytics
- GET `/api/installation-stats` - Installation statistics
- GET `/api/version-analytics` - Version distribution
- And more...

**Run locally**:
```bash
cd server
export STAGING_API_URL=https://wapar-api-staging.your-domain.com
bun run test:integration
```

**Documentation**: See `server/tests/integration/README.md`

### Frontend Integration Tests

**Location**: `app/tests/integration/`  
**Technology**: TypeScript + Playwright  
**Runs Against**: Deployed Cloudflare Pages + Workers API  

Tests both UI and API:
- UI rendering and navigation
- Data fetching and display
- Interactive features (maps, charts, tabs)
- API endpoints (via Playwright request context)

**Run locally**:
```bash
cd app
export STAGING_FRONTEND_URL=https://staging.wapar-dev.pages.dev
export STAGING_API_URL=https://wapar-api-staging.your-domain.com
bunx playwright test --config=playwright.config.integration.ts
```

**Documentation**: See `app/tests/integration/README.md`

## CI/CD Workflow

Integration tests run automatically after staging deployment in GitHub Actions:

```yaml
# .github/workflows/staging.yml

jobs:
  # ... test and deploy jobs ...
  
  integration-tests:
    needs: [deploy-backend, deploy-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployments to stabilize
        run: sleep 30
      
      # Backend integration tests
      - name: Run backend API integration tests
        run: cd server && bun run test:integration
        env:
          STAGING_API_URL: https://wapar-api-staging.${{ secrets.CLOUDFLARE_SUBDOMAIN }}
      
      # Frontend integration tests
      - name: Run frontend integration tests
        run: cd app && bunx playwright test --config=playwright.config.integration.ts
        env:
          STAGING_FRONTEND_URL: ${{ needs.deploy-frontend.outputs.pages-url }}
          STAGING_API_URL: https://wapar-api-staging.${{ secrets.CLOUDFLARE_SUBDOMAIN }}
```

### Workflow Sequence

```
1. Pull Request Created/Updated
   ↓
2. Run Unit Tests (server + app)
   ↓
3. Run Local E2E Tests (server + app)
   ↓
4. Deploy to Staging
   ├─ Backend (Workers + D1)
   └─ Frontend (Pages)
   ↓
5. Wait 30 seconds (deployment stabilization)
   ↓
6. Run Integration Tests ⭐ NEW
   ├─ Backend API Tests (14 tests)
   └─ Frontend E2E Tests (15 tests)
   ↓
7. Comment PR with Results
```

**If integration tests fail** → Deployment is marked as failed → Don't merge to production

## Test Coverage

### Backend Integration Tests (14 tests)

- ✅ Health endpoint
- ✅ Installation creation (POST)
- ✅ Heartbeat submission (POST)
- ✅ Usage analytics (GET)
- ✅ Installation stats (GET)
- ✅ Version analytics (GET)
- ✅ Recent installations (GET)
- ✅ New installations (GET)
- ✅ Heartbeat analytics (GET)
- ✅ Database schema validation
- ✅ Error handling (invalid IDs, missing fields)
- ✅ Malformed JSON handling
- ✅ Optional data field support

### Frontend Integration Tests (15 tests)

- ✅ Page loading
- ✅ Overview metrics display
- ✅ Geographic visualization
- ✅ Distribution insights
- ✅ Manual refresh
- ✅ Last synced timestamp
- ✅ API data fetching (all endpoints)
- ✅ Error resilience

## Running All Tests

### Locally

**Prerequisites**:
1. Staging environment deployed (or local dev servers running)
2. Environment variables set

**Backend**:
```bash
cd server
export STAGING_API_URL=http://localhost:8787  # or deployed URL
bun run test:integration
```

**Frontend**:
```bash
cd app
export STAGING_FRONTEND_URL=http://localhost:4173  # or deployed URL
export STAGING_API_URL=http://localhost:8787       # or deployed URL
bunx playwright test --config=playwright.config.integration.ts
```

### In CI

Integration tests run automatically on every PR to staging. Check:
- GitHub Actions workflow runs
- Test results in Actions tab
- Playwright test report artifacts

## Configuration Files

| File | Purpose |
|------|---------|
| `server/tests/integration/vitest.config.ts` | Backend integration test config |
| `app/playwright.config.integration.ts` | Frontend integration test config |
| `.github/workflows/staging.yml` | CI/CD workflow with integration tests |

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STAGING_API_URL` | Backend API URL | `https://wapar-api-staging.example.com` |
| `STAGING_FRONTEND_URL` | Frontend Pages URL | `https://staging.wapar-dev.pages.dev` |

## Troubleshooting

### All Tests Failing

**Likely cause**: Deployments not ready or URLs incorrect

**Solutions**:
1. Verify deployments completed successfully
2. Check environment variables are set correctly
3. Test URLs manually: `curl $STAGING_API_URL/api`
4. Increase wait time in CI workflow

### Backend Tests Pass, Frontend Tests Fail

**Likely cause**: Frontend deployment or build issue

**Solutions**:
1. Check Cloudflare Pages deployment logs
2. Verify Pages URL is accessible
3. Check browser console for errors
4. Ensure `PUBLIC_API_URL` was set during build

### Frontend Tests Pass, Backend Tests Fail

**Likely cause**: API or database issue

**Solutions**:
1. Check Cloudflare Workers deployment logs
2. Verify database migrations applied: `wrangler d1 migrations list wapar-db --remote`
3. Test API endpoints manually
4. Check Workers environment variables

### Intermittent Failures

**Likely cause**: Race conditions or deployment delays

**Solutions**:
1. Increase wait time before running tests (currently 30s)
2. Add retry logic (Playwright already has 2 retries in CI)
3. Check for rate limiting or quota issues

## Best Practices

### Writing Integration Tests

1. **Test real behavior**: Don't mock external services
2. **Use real HTTP requests**: Test actual network calls
3. **Validate response structures**: Check data types and required fields
4. **Test error cases**: Invalid IDs, missing fields, malformed data
5. **Be resilient**: Add appropriate timeouts and retries

### Maintaining Tests

1. **Update tests with API changes**: When API response format changes, update tests
2. **Add tests for new endpoints**: Every new API endpoint should have integration tests
3. **Keep tests independent**: Each test should work standalone
4. **Clean up test data**: Don't leave test data in staging database (or use unique IDs)

### CI/CD Integration

1. **Run after deployment**: Ensure deployments complete before running tests
2. **Block on failures**: Don't allow merges if integration tests fail
3. **Upload artifacts**: Save test results and screenshots for debugging
4. **Notify on failures**: Ensure team is alerted when tests fail

## Success Metrics

These integration tests are successful if they:

- ✅ Run automatically on every staging deployment
- ✅ Catch deployment issues before production
- ✅ Complete in under 5 minutes
- ✅ Have < 5% flake rate (intermittent failures)
- ✅ Provide clear error messages when failing
- ✅ Block broken deployments from reaching production

## Future Enhancements

Potential improvements:

- [ ] Add performance testing (response time assertions)
- [ ] Add load testing (concurrent requests)
- [ ] Test different geographic regions
- [ ] Add visual regression testing
- [ ] Monitor test execution time trends
- [ ] Add database state validation tests
- [ ] Test migration rollback scenarios

## Related Documentation

- `server/tests/integration/README.md` - Backend integration tests
- `app/tests/integration/README.md` - Frontend integration tests
- `.github/workflows/staging.yml` - CI/CD workflow

## Questions?

For issues or questions:
1. Check troubleshooting sections in this doc and test-specific READMEs
2. Review GitHub Actions logs for test failures
3. Create a discussion in the repository
4. Tag issue with `testing` label
