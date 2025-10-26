# Environment Workflow Diagram

## Pull Request Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer creates PR                                            │
│  (feature-branch → main)                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Triggered                                        │
│  - deploy-workers.yml                                           │
│  - deploy-client.yml                                            │
└────────────┬───────────────────────┬────────────────────────────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Workers CI/CD │      │  Pages CI/CD   │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Run Tests     │      │  Build App     │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             │ ✅ Pass               │ ✅ Success
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Deploy Schema │      │  Deploy to     │
    │  to staging DB │      │  Pages Preview │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Deploy Worker │      │  Get Preview   │
    │  to staging    │      │  URL           │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Post PR Comment     │
              │  with URLs:          │
              │  - Staging Worker    │
              │  - Preview Pages     │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Developer tests     │
              │  staging deployment  │
              └──────────────────────┘
```

## Production Deployment Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  PR merged to main branch                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Triggered                                        │
│  - deploy-workers.yml                                           │
│  - deploy-client.yml                                            │
└────────────┬───────────────────────┬────────────────────────────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Workers CI/CD │      │  Pages CI/CD   │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Run Tests     │      │  Build App     │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             │ ✅ Pass               │ ✅ Success
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Deploy Schema │      │  Deploy to     │
    │  to prod DB    │      │  Pages Prod    │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │  Deploy Worker │      │  Live at       │
    │  to production │      │  wapar.pages   │
    │                │      │  .dev          │
    └────────┬───────┘      └────────┬───────┘
             │                       │
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Production live     │
              │  - Workers API       │
              │  - Pages Frontend    │
              │  - Cron jobs active  │
              └──────────────────────┘
```

## Environment Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ENVIRONMENTS                                    │
├─────────────┬─────────────────┬──────────────────┬──────────────────────┤
│  Aspect     │  Development    │  Staging (PR)    │  Production (Main)   │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Worker     │  localhost:8787 │  wapar-api-      │  wapar-api.          │
│  URL        │                 │  staging.workers │  mandarons.com       │
│             │                 │  .dev            │                      │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Pages      │  localhost:5173 │  <branch>.wapar  │  wapar.pages.dev     │
│  URL        │                 │  .pages.dev      │  (+ custom domain)   │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Database   │  Local D1       │  wapar-db-       │  wapar-db            │
│             │  (wapar-db)     │  staging         │  (production)        │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Cron Jobs  │  ❌ Disabled    │  ❌ Disabled     │  ✅ Enabled (hourly) │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Logging    │  ✅ Verbose     │  ✅ Verbose      │  ⚠️  Minimal         │
│             │  (DRIZZLE_LOG)  │  (DRIZZLE_LOG)   │                      │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Deploy     │  Manual         │  Automatic on PR │  Automatic on merge  │
│  Trigger    │  (bun run dev)  │  open/update     │  to main             │
├─────────────┼─────────────────┼──────────────────┼──────────────────────┤
│  Purpose    │  Local coding   │  Test PR changes │  Live production     │
│             │  and testing    │  before merge    │  serving users       │
└─────────────┴─────────────────┴──────────────────┴──────────────────────┘
```

## Deployment Decision Tree

```
                    ┌────────────────┐
                    │  Code Change   │
                    └────────┬───────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  ▼                     ▼
         ┌────────────────┐    ┌────────────────┐
         │  Local Branch  │    │  Push to Main  │
         └────────┬───────┘    └────────┬───────┘
                  │                     │
                  │                     ▼
                  │            ┌─────────────────┐
                  │            │  Deploy to      │
                  │            │  PRODUCTION     │
                  │            │  - Workers API  │
                  │            │  - Pages Site   │
                  │            └─────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Open PR       │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  Deploy to     │
         │  STAGING       │
         │  - Test Worker │
         │  - Preview Pages│
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  Review & Test │
         └────────┬───────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
  ┌─────────┐         ┌──────────┐
  │ Changes │         │  Approve │
  │ Needed  │         │  & Merge │
  └────┬────┘         └─────┬────┘
       │                    │
       │  Push              │
       │  Updates           │
       │                    │
       └──────────┐         │
                  │         │
                  ▼         │
         ┌────────────────┐ │
         │  Auto-update   │ │
         │  Staging       │ │
         └────────────────┘ │
                            │
                            ▼
                   ┌─────────────────┐
                   │  Deploy to      │
                   │  PRODUCTION     │
                   └─────────────────┘
```

## Database Migration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Schema Change in schema.sql                                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Open PR with        │
              │  schema change       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  GitHub Actions:     │
              │  1. Generate         │
              │     migrations       │
              │  2. Deploy to        │
              │     staging DB       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Test with           │
              │  staging database    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Verify schema       │
              │  works correctly     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Merge PR            │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  GitHub Actions:     │
              │  Deploy schema to    │
              │  production DB       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Production DB       │
              │  updated ✅          │
              └──────────────────────┘
```

## Key Benefits

### 🔒 Safety
- Test changes in staging before production
- Separate databases prevent data corruption
- Schema migrations tested before going live

### 🚀 Speed
- Automatic deployments on PR and merge
- No manual deployment steps
- Fast feedback on changes

### 👁️ Visibility
- PR comments show deployment URLs
- Easy to share staging links for review
- Clear separation of environments

### 🧪 Testing
- Real Cloudflare environment for PRs
- Test with actual Workers runtime
- Preview deployments for frontend changes

### 🔄 Iteration
- Push updates → automatic redeployment
- No need to manually trigger builds
- Instant feedback loop
