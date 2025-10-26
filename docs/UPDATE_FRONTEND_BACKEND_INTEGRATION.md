# Update: Frontend-Backend Integration

## What Changed

In response to the question "does the staged frontend use staged backend URL?", the configuration has been updated to ensure **YES** - preview/staging frontends now automatically connect to the staging backend.

## Changes Made

### 1. Frontend API Client (`app/src/routes/+page.server.ts`)

**Before:**
```typescript
let res = await fetch('https://wapar-api.mandarons.com/api/usage');
```
Hardcoded to always use production backend.

**After:**
```typescript
import { env } from '$env/dynamic/public';
const API_URL = env.PUBLIC_API_URL || 'https://wapar-api.mandarons.com';
let res = await fetch(`${API_URL}/api/usage`);
```
Now uses environment variable with production as fallback.

### 2. Deployment Workflow (`.github/workflows/deploy-client.yml`)

**Added:**
- Automatic API URL detection based on deployment type
- Sets `PUBLIC_API_URL` environment variable during build
- Updates PR comment to show which backend is being used

**Logic:**
```yaml
# For PRs
PUBLIC_API_URL: https://wapar-api-staging.<subdomain>.workers.dev

# For Production
PUBLIC_API_URL: https://wapar-api.mandarons.com
```

### 3. Documentation

**Created:**
- `FRONTEND_BACKEND_INTEGRATION.md` - Comprehensive guide on frontend-backend integration

**Updated:**
- `ENVIRONMENTS.md` - Added frontend-backend integration section

## Environment Matrix

| Environment | Frontend | Backend | Database |
|------------|----------|---------|----------|
| **PR/Staging** | `<branch>.wapar.pages.dev` | `wapar-api-staging.*.workers.dev` | `wapar-db-staging` |
| **Production** | `wapar.pages.dev` | `wapar-api.mandarons.com` | `wapar-db` |
| **Local** | `localhost:5173` | `localhost:8787` | Local D1 |

## Benefits

✅ **Isolated Testing**: Preview deployments never touch production data  
✅ **Full-Stack PRs**: Test both frontend and backend changes together  
✅ **Automatic**: No manual configuration needed  
✅ **Safe**: Production data protected from staging experiments  

## What This Means for Developers

When you create a PR:
1. Frontend preview is created at `https://<branch>.wapar.pages.dev`
2. Backend staging is created at `https://wapar-api-staging.*.workers.dev`
3. **Frontend automatically connects to staging backend**
4. You get a fully isolated environment for testing
5. PR comment shows both URLs

## Local Development

To test with local backend:
```bash
# Terminal 1 - Backend
cd server && bun run dev

# Terminal 2 - Frontend (with local backend)
cd app && PUBLIC_API_URL=http://localhost:8787 bun dev
```

Or create `app/.env`:
```
PUBLIC_API_URL=http://localhost:8787
```

## No Action Required (If Following Checklist)

If you follow the `IMPLEMENTATION_CHECKLIST.md`, everything will work automatically:
1. Run `./scripts/setup-staging.sh` to create staging DB
2. Set GitHub secrets (including `CLOUDFLARE_SUBDOMAIN`)
3. Create a PR
4. Frontend preview will automatically use staging backend

## Verification

To verify it's working:
1. Create a test PR
2. Check PR comments - should show both frontend and backend URLs
3. Open browser DevTools on preview URL
4. Network tab should show API calls to `wapar-api-staging.*.workers.dev`

---

**Bottom Line:** Yes, staged/preview frontends now use the staged backend API automatically! 🎉
