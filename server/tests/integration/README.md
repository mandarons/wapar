# Backend API Integration Tests

Tests the deployed staging API to verify it works correctly in Cloudflare Workers environment.

## Running Locally

```bash
cd server
export STAGING_API_URL=https://wapar-api-staging.your-domain.com
bun test tests/integration/
```

## Running in CI

These tests run automatically after staging deployment in `.github/workflows/staging.yml`.

## What These Tests Verify

- ✅ Installation creation (POST)
- ✅ Heartbeat submission (POST)
- ✅ Database schema correctness
- ✅ Error handling
- ✅ Data validation
- ✅ Usage analytics endpoint
- ✅ Installation stats endpoint

## Test Strategy

These integration tests differ from unit/e2e tests in that they:
1. Test against the **actual deployed staging environment**
2. Verify **real Cloudflare Workers + D1 database** behavior
3. Catch deployment issues like missing migrations
4. Use **production-like HTTP requests** (not in-process testing)

## Architecture

Unlike the local unit/e2e tests that use `unstable_dev` to run the worker in-process, these integration tests:
- Make real HTTP requests to deployed staging URLs
- Test actual network behavior and latency
- Verify CORS, headers, and production configuration
- Catch environment-specific issues

## Writing New Tests

Follow these patterns:

```typescript
test('descriptive test name', async () => {
  const response = await fetch(`${API_BASE_URL}/api/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data).toHaveProperty('expectedField');
});
```

## Troubleshooting

**Problem**: Tests timeout
- **Solution**: Increase `testTimeout` in `vitest.config.ts` or check network connectivity

**Problem**: 404 errors
- **Solution**: Verify `STAGING_API_URL` environment variable is correct

**Problem**: Database errors
- **Solution**: Check that migrations were applied during deployment
