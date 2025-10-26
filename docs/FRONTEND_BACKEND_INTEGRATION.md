# Frontend-Backend Environment Integration

## Summary

**Question:** Does the staged frontend use the staged backend URL?

**Answer:** YES! ✅

As of the latest configuration, the staging/preview frontend deployments automatically connect to the staging backend API, and production frontend connects to production backend.

## How It Works

### Environment Variable Configuration

The frontend uses the `PUBLIC_API_URL` environment variable to determine which backend to connect to:

```typescript
// app/src/routes/+page.server.ts
const API_URL = env.PUBLIC_API_URL || 'https://wapar-api.mandarons.com';
```

### Automatic Environment Detection

The GitHub Actions workflow automatically sets the correct API URL based on the deployment environment:

**For Pull Requests (Preview/Staging):**
```yaml
PUBLIC_API_URL: https://wapar-api-staging.<subdomain>.workers.dev
```

**For Production (Main Branch):**
```yaml
PUBLIC_API_URL: https://wapar-api.mandarons.com
```

## Environment Matrix

| Frontend Environment | Frontend URL | Backend URL | Database |
|---------------------|--------------|-------------|----------|
| **Preview (PR)** | `https://<branch>.wapar.pages.dev` | `https://wapar-api-staging.<subdomain>.workers.dev` | `wapar-db-staging` |
| **Production (Main)** | `https://wapar.pages.dev` | `https://wapar-api.mandarons.com` | `wapar-db` |
| **Local Dev** | `http://localhost:5173` | `http://localhost:8787` | Local D1 |

## Benefits

### 1. Isolated Testing
- Preview deployments never affect production data
- Safe to test database schema changes
- Can test full-stack features end-to-end

### 2. Automatic Configuration
- No manual environment switching
- CI/CD handles all configuration
- Developers don't need to worry about URLs

### 3. Consistency
- Both frontend and backend deployed together
- Matching versions in staging
- Easier debugging of issues

## Example Flow

```
Developer creates PR with changes
    │
    ├─► Backend deployed to staging
    │   └─► https://wapar-api-staging.example.workers.dev
    │       └─► Uses wapar-db-staging database
    │
    └─► Frontend deployed to preview
        └─► https://<branch>.wapar.pages.dev
            └─► Configured with PUBLIC_API_URL pointing to staging backend
                └─► All API calls go to staging, not production
```

## Testing Locally

To test the frontend with different backend URLs locally:

### Option 1: Environment Variable
```bash
cd app
PUBLIC_API_URL=http://localhost:8787 bun dev
```

### Option 2: .env File
Create `app/.env`:
```
PUBLIC_API_URL=http://localhost:8787
```

Then run:
```bash
cd app
bun dev
```

## Verification

To verify the configuration is working:

1. **Create a test PR**
2. **Check the PR comments** - should show both frontend and backend URLs
3. **Visit the preview URL**
4. **Open browser DevTools** → Network tab
5. **Check API requests** - should go to `wapar-api-staging.*.workers.dev`

## Troubleshooting

### Preview frontend calling production backend

**Symptom:** Preview deployment shows production data

**Cause:** `PUBLIC_API_URL` not set during build

**Fix:** Check GitHub Actions logs to ensure `PUBLIC_API_URL` is set in the Build step

### CORS errors in preview

**Symptom:** Browser console shows CORS errors

**Cause:** Staging backend may not allow preview domain

**Fix:** Update CORS configuration in `server/src/index.ts` to allow preview domains

## Related Files

- `app/src/routes/+page.server.ts` - Frontend API client
- `.github/workflows/deploy-client.yml` - Frontend deployment with environment detection
- `.github/workflows/deploy-workers.yml` - Backend deployment

## Additional Notes

### Why Use `PUBLIC_API_URL`?

SvelteKit requires environment variables accessible in server-side code to be prefixed with `PUBLIC_` if they need to be available during build time. This ensures the API URL is baked into the build.

### Default Fallback

The code defaults to production URL if `PUBLIC_API_URL` is not set:
```typescript
const API_URL = env.PUBLIC_API_URL || 'https://wapar-api.mandarons.com';
```

This ensures:
- Local development works without configuration
- Production builds work even if env var is missing
- Explicit configuration only needed for non-production environments
