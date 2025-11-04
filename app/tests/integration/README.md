# Frontend Integration Tests

Integration tests for the deployed WAPAR frontend application and its API integrations.

## Overview

These tests run against the **deployed staging environment** (Cloudflare Pages + Workers) to verify:
- Frontend loads correctly in production environment
- API endpoints return valid data
- User interface components render properly
- Error handling works as expected

## Running Locally

### Prerequisites

1. Backend API must be running (either locally or deployed staging)
2. Frontend must be built and served

### Setup

```bash
cd app

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps chromium

# Set environment variables
export STAGING_FRONTEND_URL=http://localhost:4173  # or deployed URL
export STAGING_API_URL=http://localhost:8787       # or deployed URL

# Build frontend
bun run build

# Serve built frontend
bun run preview &

# Run integration tests
bunx playwright test --config=playwright.config.integration.ts
```

### Quick Test (API only, no UI)

If you just want to test API endpoints without building the frontend:

```bash
export STAGING_API_URL=http://localhost:8787
bunx playwright test tests/integration/deployed.test.ts --grep "API should"
```

## Running in CI

These tests run automatically in the GitHub Actions workflow after staging deployment:

1. Backend (Workers) is deployed to `wapar-api-staging.{domain}`
2. Frontend (Pages) is deployed to staging branch URL
3. Integration tests run against both deployments
4. Results are uploaded as artifacts

See `.github/workflows/staging.yml` for the complete workflow.

## Test Structure

### UI Tests
- Page loading and rendering
- Navigation between tabs
- Interactive elements (buttons, maps, charts)
- Error states and loading indicators

### API Tests (via Playwright request context)
- `/api/usage` - Usage analytics data
- `/api/installation-stats` - Installation statistics
- `/api/version-analytics` - Version distribution
- `/api/recent-installations` - Recent installations
- `/api/new-installations` - New installation trends
- `/api/heartbeat-analytics` - Heartbeat/engagement data

## Configuration

- **Config file**: `playwright.config.integration.ts`
- **Test directory**: `tests/integration/`
- **Test timeout**: 30 seconds per test
- **Retries**: 2 (in CI only)
- **Workers**: 1 (sequential execution)
- **Screenshots**: Only on failure
- **Traces**: On first retry

## Writing New Tests

### UI Test Pattern

```typescript
test('should display feature X', async ({ page }) => {
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
  
  // Test UI elements
  await expect(page.getByTestId('feature-x')).toBeVisible();
});
```

### API Test Pattern

```typescript
test('API endpoint returns expected data', async ({ request }) => {
  const response = await request.get(`${API_URL}/api/endpoint`);
  
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data).toHaveProperty('expectedField');
  expect(typeof data.expectedField).toBe('string');
});
```

## Troubleshooting

### Tests Timeout

**Problem**: Tests take too long and timeout

**Solutions**:
- Check network connectivity to staging environment
- Verify deployments completed successfully
- Increase `timeout` in `playwright.config.integration.ts`
- Add wait for deployments to stabilize (already done in CI: 30s sleep)

### Frontend Not Loading

**Problem**: `page.goto()` fails or page shows errors

**Solutions**:
- Verify `STAGING_FRONTEND_URL` is correct
- Check browser console for errors: `page.on('console', msg => console.log(msg.text()))`
- Ensure Pages deployment completed successfully
- Check that API_URL is correctly set in frontend build environment

### API Tests Failing

**Problem**: API requests return 500 or unexpected errors

**Solutions**:
- Verify database migrations were applied: `wrangler d1 migrations list wapar-db --remote`
- Check Workers deployment logs
- Verify `STAGING_API_URL` environment variable is correct
- Test API endpoints manually: `curl https://wapar-api-staging.{domain}/api/usage`

### Playwright Browser Not Found

**Problem**: "Browser not found" error when running tests

**Solution**:
```bash
bunx playwright install --with-deps chromium
```

## CI/CD Integration

The integration tests are part of the deployment pipeline:

```
┌─────────────────┐
│  Test Backend   │──┐
│   (Unit/E2E)    │  │
└─────────────────┘  │
                     ├──> Deploy Backend ──┐
┌─────────────────┐  │                     │
│ Test Frontend   │──┘                     ├──> Integration Tests ──> Comment PR
│   (Unit/E2E)    │                        │
└─────────────────┘                        │
                                           │
        Deploy Frontend ────────────────────┘
```

Tests run after both deployments complete, ensuring the full stack is tested in the actual production environment.

## What Would These Tests Catch?

✅ **Missing database migrations** - Would fail installation/heartbeat tests  
✅ **Broken API endpoints** - Would fail API response tests  
✅ **CORS issues** - Would fail cross-origin API requests  
✅ **Frontend build errors** - Would fail page load tests  
✅ **Data format changes** - Would fail response validation tests  
✅ **Environment configuration** - Would fail if env vars not set correctly  
✅ **Deployment failures** - Would fail if services not accessible  

This addresses the gap that allowed the recent production incident where database migrations weren't applied.
