# Workers App for Wapar API

Quick start:

1. Install deps
```bash
cd server
bun install
```

2. Create D1 database and apply schema
```bash
bunx wrangler d1 execute wapar-db --file=./schema.sql
```

3. Run locally
```bash
bunx wrangler dev
```

4. Deploy
```bash
npm run deploy
```

Routes:
- GET /api
- POST /api/installation
- POST /api/heartbeat
- GET /api/usage
- GET /api/version-analytics

**Request Format Support:**
Both `/api/installation` and `/api/heartbeat` endpoints support JSON and form-encoded requests for backward compatibility. See [FORM_ENCODING_SUPPORT.md](./FORM_ENCODING_SUPPORT.md) for detailed documentation.

## API Endpoints

### GET /api/version-analytics

Returns comprehensive app version distribution analytics.

**Response:**
```json
{
  "versionDistribution": [
    { "version": "2.1.0", "count": 450, "percentage": 45.0 },
    { "version": "2.0.5", "count": 350, "percentage": 35.0 },
    { "version": "1.9.8", "count": 200, "percentage": 20.0 }
  ],
  "latestVersion": "2.1.0",
  "outdatedInstallations": 550,
  "upgradeRate": {
    "last7Days": 15,
    "last30Days": 78
  }
}
```

**Fields:**
- `versionDistribution`: Array of version objects with count and percentage
- `latestVersion`: Most common version (null if no data)
- `outdatedInstallations`: Count of installations not on latest version
- `upgradeRate`: Number of installations updated in last 7 and 30 days

**Performance:** Average response time ~13ms

Scheduled job:
- Hourly cron to enrich IP geo info.

## Testing

Tests are written with Vitest and run against a real Worker started in-process via Wrangler's `unstable_dev`.

- Run the suite:
  ```bash
  bun run test
  ```

- Key pieces:
  - `tests/utils.ts`
    - Boots the Worker via `unstable_dev`.
    - Provides `getBase`, `resetDb`, `d1Exec`, `d1QueryOne`, `waitForCount`.
    - Uses in-Worker test endpoints (under `__test`) to operate on the same D1 binding for stability.
  - Test-only routes in `src/routes/test.ts`:
    - `POST /__test/reset` – clears tables with retry and returns `{ ok: true }`.
    - `POST /__test/exec` – executes a SQL statement.
    - `POST /__test/queryOne` – returns a single row as `{ ok, data }`.
    - `POST /__test/run-scheduled` – mocks `fetch` and invokes the cron `scheduled` handler.
  - Routes are guarded in `src/index.ts` and enabled in dev only.
    - Guard flag: `ENABLE_TEST_ROUTES`.
    - `wrangler.toml` sets `ENABLE_TEST_ROUTES = "1"` under `[dev].vars` and disables by default for production.
  - Vitest runs serially (see `vitest.config.ts`) to avoid local D1 locking.

- Covered endpoints:
  - `GET /api` – health.
  - `POST /api/installation` – create installation (valid/invalid payloads).
  - `POST /api/heartbeat` – one-per-day behavior; invalid/non-existent installation.
  - `GET /api/usage` – empty and non-empty aggregates.
  - Cron: `src/jobs/enrich-ip.ts` – ip-to-geo enrichment via mocked `fetch`.

## CI

A GitHub Actions workflow runs the Workers app tests on push/PR when files under `server/workers-app/` change.

- Workflow: `.github/workflows/ci-workers-tests.yml`
- Summary:
  - Checks out repo
  - Sets up Bun
  - Runs `bun install` in `server/workers-app`
  - Runs `bun run test`

## Notes

- D1 binding is configured in `wrangler.toml` under `[[d1_databases]]`.
- Adjust cron behavior via `[triggers].crons`.
- If you add new tables/columns, update `schema.sql` and re-apply to your local DB.
