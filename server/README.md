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
- `latestVersion`: Version with highest installation count (null if no data)
- `outdatedInstallations`: Count of installations not on latest version
- `upgradeRate`: Number of installations updated in last 7 and 30 days

**Performance:** Optimized for fast response times (<500ms)

## Geographic Data Enrichment

Installation records are **automatically enriched with geographic data** (country code and region) using Cloudflare's built-in request metadata available on `request.cf`. This data is captured immediately when installations are created, with no external API calls or delays.

**Benefits:**
- ✅ Immediate geographic data availability (no waiting for background jobs)
- ✅ Zero external dependencies (no rate limits or API failures)
- ✅ Free and reliable (provided automatically by Cloudflare on all requests)
- ✅ Better UX (maps and analytics populate in real-time)

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
  - Routes are guarded in `src/index.ts` and enabled in dev only.
    - Guard flag: `ENABLE_TEST_ROUTES`.
    - `wrangler.toml` sets `ENABLE_TEST_ROUTES = "1"` under `[dev].vars` and disables by default for production.
  - Vitest runs serially (see `vitest.config.ts`) to avoid local D1 locking.

- Covered endpoints:
  - `GET /api` – health.
  - `POST /api/installation` – create installation with automatic geo enrichment (valid/invalid payloads, client-provided geo data).
  - `POST /api/heartbeat` – one-per-day behavior; invalid/non-existent installation.
  - `GET /api/usage` – empty and non-empty aggregates.
  - `GET /api/version-analytics` – version distribution and upgrade metrics.

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
- Geographic data is automatically captured from Cloudflare's `request.cf` object on incoming requests.
- If you add new tables/columns, update `schema.sql` and re-apply to your local DB.
