# WAPAR API Server

A local SQLite-based analytics API server built with Hono and Bun.

## Quick Start

1. Install dependencies
```bash
cd server
bun install
```

2. Initialize database
```bash
bun run db:push
```

3. Run locally
```bash
bun run dev
```

The server will start on `http://localhost:8787`.

## Development

### Server Commands
- `bun run dev` - Start development server
- `bun run start` - Start production server

### Database Commands
- `bun run db:push` - Apply schema changes to database
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Apply migrations

### Testing Commands
- `bun test` - Run all tests (minimal output, failures only)
- `bun test:verbose` - Run all tests with full output
- `bun test:unit` - Run unit tests only (excludes integration tests)
- `bun test:integration` - Run integration tests only
- `bun test:coverage` - Generate code coverage report (text)
- `bun test:coverage:html` - Generate HTML coverage report and open in browser

## API Routes

- `GET /api` - Health check
- `POST /api/installation` - Register new installation
- `POST /api/heartbeat` - Record installation heartbeat
- `GET /api/usage` - Get usage analytics
- `GET /api/version-analytics` - Get version distribution analytics
- `GET /api/installation-stats` - Get installation statistics
- `GET /api/heartbeat-analytics` - Get heartbeat analytics
- `GET /api/recent-installations` - Get recent installations
- `GET /api/new-installations` - Get new installations analytics

## Active/Stale Installation Tracking

WAPAR tracks the activity status of installations using heartbeat timestamps. See [ACTIVE_INSTALLATIONS.md](./docs/ACTIVE_INSTALLATIONS.md) for comprehensive documentation.

**Quick Overview:**
- **Active**: Installations with heartbeat within threshold (default: 3 days)
- **Stale**: Installations without recent heartbeat or no heartbeat at all
- **Total**: All installations (active + stale)
- **Configuration**: Configure via environment variable or code

## Request Format Support

Both `/api/installation` and `/api/heartbeat` endpoints support JSON and form-encoded requests for backward compatibility. See [FORM_ENCODING_SUPPORT.md](./docs/FORM_ENCODING_SUPPORT.md) for detailed documentation.

## API Endpoints

### GET /api/installation-stats

Returns comprehensive statistics about active and stale installations with version and geographic distributions.

**Response:**
```json
{
  "totalInstallations": 100,
  "activeInstallations": 75,
  "staleInstallations": 25,
  "activityThresholdDays": 3,
  "cutoffDate": "2025-10-30T00:00:00.000Z",
  "activeVersionDistribution": [
    { "version": "2.1.0", "count": 50, "percentage": 66.67 },
    { "version": "2.0.5", "count": 20, "percentage": 26.67 },
    { "version": "1.9.8", "count": 5, "percentage": 6.67 }
  ],
  "activeCountryDistribution": [
    { "countryCode": "US", "count": 40 },
    { "countryCode": "CA", "count": 20 },
    { "countryCode": "GB", "count": 15 }
  ]
}
```

**Fields:**
- `totalInstallations`: Total count of all installations (active + stale)
- `activeInstallations`: Count of installations with heartbeat within threshold
- `staleInstallations`: Count of installations without recent heartbeat (calculated as total - active)
- `activityThresholdDays`: The configured activity threshold in days
- `cutoffDate`: The exact cutoff timestamp for active/stale classification
- `activeVersionDistribution`: Version breakdown for **active installations only**
- `activeCountryDistribution`: Country distribution for **active installations only**

**Key Points:**
- Version and country distributions are filtered to active installations only
- Percentages in version distribution sum to 100% of active installations
- Useful for understanding current user base composition

### GET /api/usage

Returns usage analytics including active/stale metrics, monthly active users, and country distribution.

**Response:**
```json
{
  "totalInstallations": 100,
  "activeInstallations": 75,
  "staleInstallations": 25,
  "monthlyActive": 80,
  "activityThresholdDays": 3,
  "createdAt": "Sun, 02 Nov 2025 23:48:36 GMT",
  "countryToCount": [
    { "countryCode": "US", "count": 40 },
    { "countryCode": "CA", "count": 20 }
  ],
  "iCloudDocker": { "total": 60 },
  "haBouncie": { "total": 15 }
}
```

**Fields:**
- `totalInstallations`: Total count of all installations
- `activeInstallations`: Count of installations with recent heartbeat (NEW)
- `staleInstallations`: Count of installations without recent heartbeat (NEW)
- `monthlyActive`: Unique installations with heartbeats in last 30 days
- `activityThresholdDays`: The configured activity threshold in days (NEW)
- `countryToCount`: Country distribution for **active installations only**
- `iCloudDocker`, `haBouncie`: Total installations per app (not filtered by activity)

**Important Notes:**
- `countryToCount` now includes only active installations (breaking change)
- App-specific totals (`iCloudDocker`, `haBouncie`) include all installations regardless of activity status
- `monthlyActive` may differ from `activeInstallations` due to different time windows

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
- `versionDistribution`: Array of version objects with count and percentage (**active installations only**)
- `latestVersion`: Version with highest installation count (null if no data)
- `outdatedInstallations`: Count of active installations not on latest version
- `upgradeRate`: Number of installations updated in last 7 and 30 days

**Important Note:**
- This endpoint now returns data for **active installations only** (breaking change from previous behavior)
- Percentages are calculated based on active installation count
- `outdatedInstallations` counts only active installations on older versions

**Performance:** Optimized for fast response times (<500ms)

### POST /api/installation

Creates a new installation record with automatic geographic enrichment.

**Request:**
```json
{
  "appName": "icloud-docker",
  "appVersion": "2.1.0",
  "data": "{\"optional\":\"metadata\"}"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "appName": "icloud-docker",
  "appVersion": "2.1.0",
  "ipAddress": "203.0.113.1",
  "countryCode": "US",
  "region": "California",
  "createdAt": "2025-11-03T04:10:00.000Z",
  "lastHeartbeatAt": null
}
```

**Key Points:**
- `lastHeartbeatAt` is `null` initially (installation is stale until first heartbeat)
- Geographic data (`countryCode`, `region`) is automatically captured from Cloudflare's request metadata
- Installation is considered "stale" until it sends its first heartbeat

### POST /api/heartbeat

Records a heartbeat for an installation, updating its activity status.

**Request:**
```json
{
  "installationId": "550e8400-e29b-41d4-a716-446655440000",
  "data": "{\"optional\":\"metadata\"}"
}
```

**Response:**
```json
{
  "id": "heartbeat-550e8400-e29b-41d4-a716-446655440000",
  "installationId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-11-03T04:10:00.000Z"
}
```

**Behavior:**
- Updates `lastHeartbeatAt` timestamp on the Installation record
- Creates a Heartbeat record for historical tracking
- Only allows one heartbeat per installation per day (subsequent heartbeats same day return existing record)
- Transitions stale installations to active status if heartbeat is within threshold
- Returns 400 if installation doesn't exist

**Activity Impact:**
If the installation was stale before this heartbeat:
- `lastHeartbeatAt` is updated to current timestamp
- Installation immediately becomes "active" (if within threshold)
- Next API calls will include this installation in active counts

## Geographic Data Enrichment

Installation records are **automatically enriched with geographic data** (country code and region) using Cloudflare's built-in request metadata available on `request.cf`. This data is captured immediately when installations are created, with no external API calls or delays.

**Benefits:**
- ✅ Immediate geographic data availability (no waiting for background jobs)
- ✅ Zero external dependencies (no rate limits or API failures)
- ✅ Free and reliable (provided automatically by Cloudflare on all requests)
- ✅ Better UX (maps and analytics populate in real-time)

## Configuration

### Activity Threshold Configuration

The activity threshold determines when installations are considered "active" vs "stale". This is configured via the `ACTIVITY_THRESHOLD_DAYS` environment variable.

**Default:** 3 days

**Setting in `wrangler.toml`:**

```toml
# Global configuration (applies to all environments)
[vars]
ACTIVITY_THRESHOLD_DAYS = "7"  # Consider installations active for 7 days
```

**Environment-specific configuration:**

```toml
# Production environment
[env.production.vars]
ACTIVITY_THRESHOLD_DAYS = "5"  # 5 days for production

# Staging environment  
[env.staging.vars]
ACTIVITY_THRESHOLD_DAYS = "3"  # 3 days for staging (default)
```

**How it works:**
- Installations with `lastHeartbeatAt` >= (now - threshold) are "active"
- Installations with `lastHeartbeatAt` < (now - threshold) are "stale"
- Installations with `lastHeartbeatAt = null` are "stale"

**Choosing a threshold:**
- **3 days** (default): Good for daily-use applications
- **7 days**: Better for weekly-use applications
- **1 day**: Strict active user definition
- **14 days**: Very lenient, includes occasional users

**Example:**
With `ACTIVITY_THRESHOLD_DAYS = "3"`:
- Installation last heartbeat: 2 days ago → **Active**
- Installation last heartbeat: 4 days ago → **Stale**
- Installation never sent heartbeat → **Stale**

### Other Configuration Options

**Database Logging:**
```toml
[vars]
DRIZZLE_LOG = "false"  # Enable SQL query logging (set to "true" for debugging)
```

**Test Routes (Development Only):**
```toml
[env.dev.vars]
ENABLE_TEST_ROUTES = "1"  # Enable /__test/* endpoints for testing
```

**Note:** Test routes are automatically disabled in production for security.

## Testing

Tests use **Bun's native test runner** with an in-memory SQLite database. The test environment is automatically configured via global setup in `tests/setup.ts`.

### Running Tests

```bash
# Run all tests (minimal output, shows only failures)
bun test

# Run with verbose output (shows all tests)
bun test:verbose

# Run unit tests only (excludes integration tests)
bun test:unit

# Run integration tests only
bun test:integration

# Generate code coverage report (text format)
bun test:coverage

# Generate HTML coverage report and open in browser
bun test:coverage:html
```

### Test Architecture

- **Global Setup** (`tests/setup.ts`):
  - Creates in-memory SQLite database (`:memory:`)
  - Initializes schema from `schema.sql`
  - Starts HTTP server on random available port
  - Provides global variables: `server`, `sqlite`, `mockD1`, `testPort`

- **Test Utilities** (`tests/utils.ts`):
  - `getBase()` - Get test server base URL
  - `resetDb()` - Clear all tables between tests
  - `d1Exec()` - Execute SQL statements
  - `d1QueryOne()` - Query single row
  - `waitForCount()` - Poll database for expected row count

- **Test Configuration** (`bunfig.toml`):
  - Preloads `tests/setup.ts` before running tests
  - Ensures consistent environment across all test files
  - Automatically sets `NODE_ENV=test` to suppress logs

### Test Coverage

Current coverage (as of latest run):
- **Overall**: ~82% line coverage
- **Routes**: 86-95% coverage on all API endpoints
- **Utilities**: 100% coverage on critical validation and version utils

Uncovered areas:
- `src/index.ts`: Main app setup and error handlers (33% - tested indirectly via E2E)
- `src/utils/logger.ts`: Logger formatting (52% - suppressed in tests)
- `src/utils/errors.ts`: Error constructors (57% - some error types rarely used)

### Test Categories

1. **Unit Tests** (`tests/*.test.ts`):
   - API endpoint behavior
   - Request validation
   - Data transformations
   - Error handling

2. **Integration Tests** (`tests/integration/`):
   - Full request/response cycles
   - Database state verification
   - Cross-endpoint interactions

### Covered Functionality

- `GET /api` – Health check
- `POST /api/installation` – Installation creation with:
  - JSON and form-encoded requests
  - Client-provided geo data
  - Field name normalization (camelCase/snake_case)
  - Validation errors
- `POST /api/heartbeat` – Heartbeat recording with:
  - One-per-day deduplication
  - JSON data field support
  - Invalid installation detection
- `GET /api/usage` – Usage analytics aggregation
- `GET /api/version-analytics` – Version distribution and upgrade tracking
- `GET /api/installation-stats` – Active/stale installation metrics
- `GET /api/heartbeat-analytics` – User engagement metrics
- `GET /api/recent-installations` – Recent installation listing with filtering
- `GET /api/new-installations` – New user analytics and trends

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
- **Schema Management**: Use Drizzle migrations only (`drizzle/` folder).
- To add new tables/columns:
  1. Update `src/db/schema.ts`
  2. Run `npm run db:generate` to create migration
  3. Apply with `npm run db:deploy:local` for local or `npm run db:deploy` for production
  4. Migrations are automatically applied during CI/CD deployment
