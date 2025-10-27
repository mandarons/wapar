# Fix: GitHub Secrets Configuration

## Issue

The GitHub Actions workflows were using inconsistent secret names:
- ❌ `CF_API_TOKEN` (deprecated by Cloudflare)
- ❌ `CF_ACCOUNT_ID`
- ❌ `CF_SUBDOMAIN`

Wrangler now expects:
- ✅ `CLOUDFLARE_API_TOKEN`
- ✅ `CLOUDFLARE_ACCOUNT_ID`
- ✅ `CLOUDFLARE_SUBDOMAIN`

## Error Encountered

```
Using "CF_API_TOKEN" environment variable. This is deprecated. 
Please use "CLOUDFLARE_API_TOKEN", instead.

✘ [ERROR] A request to the Cloudflare API (/memberships) failed.
Authentication error [code: 10000]
```

## Changes Made

### Workflow Files Updated

1. **`.github/workflows/deploy-workers.yml`**
   - Changed all `CF_API_TOKEN` → `CLOUDFLARE_API_TOKEN`
   - Changed all `CF_ACCOUNT_ID` → `CLOUDFLARE_ACCOUNT_ID`
   - Changed all `CF_SUBDOMAIN` → `CLOUDFLARE_SUBDOMAIN`

2. **`.github/workflows/deploy-client.yml`**
   - Changed all `CF_API_TOKEN` → `CLOUDFLARE_API_TOKEN`
   - Changed all `CF_ACCOUNT_ID` → `CLOUDFLARE_ACCOUNT_ID`
   - Changed all `CF_SUBDOMAIN` → `CLOUDFLARE_SUBDOMAIN`
   - Fixed environment variable usage in bash script

### Documentation Updated

1. **`docs/IMPLEMENTATION_CHECKLIST.md`**
   - Updated secret names
   - Removed duplicate entries
   - Consolidated into single API token with combined permissions

## Required GitHub Secrets

You need to set these **3 secrets** in your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers, D1, and Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_SUBDOMAIN` | Your workers.dev subdomain (e.g., `example` from `myapp.example.workers.dev`) |

### How to Create the API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template or create custom token with:
   - Account.Cloudflare Workers Scripts (Edit)
   - Account.D1 (Edit)
   - Account.Cloudflare Pages (Edit)
4. Copy the token and add as `CLOUDFLARE_API_TOKEN` secret in GitHub

### How to Find Account ID

1. Go to Cloudflare Dashboard → Workers & Pages
2. Copy the Account ID from the right sidebar
3. Add as `CLOUDFLARE_ACCOUNT_ID` secret in GitHub

### How to Find Subdomain

1. If you have an existing worker at `myapp.example.workers.dev`, use `example`
2. Or check in Cloudflare Dashboard → Workers & Pages → any worker URL
3. Add as `CLOUDFLARE_SUBDOMAIN` secret in GitHub

## Action Required

1. Delete old secrets (if they exist):
   - `CF_API_TOKEN`
   - `CF_ACCOUNT_ID`
   - `CF_SUBDOMAIN`

2. Add new secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_SUBDOMAIN`

3. Re-run failed workflows

## Verification

After updating secrets, the workflows should:
- ✅ No longer show deprecation warnings
- ✅ Successfully authenticate with Cloudflare API
- ✅ Deploy to both staging and production environments

## Note

This change makes the configuration consistent with Cloudflare's current best practices and avoids deprecation warnings.
