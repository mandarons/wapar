# Migrate `server/` to Cloudflare Workers + D1 (Free-Tier Friendly)

This document is a step-by-step plan to refactor the existing NestJS + Fastify + Sequelize (Postgres) backend under `server/` into a Cloudflare Workers application backed by Cloudflare D1 (SQLite) and Cron Triggers.

The goal is to keep functionality equivalent:
- Record installations and heartbeats.
- Serve aggregated usage stats.
- Enrich installation records with geo data via a scheduled job.

And to make it Cloudflare-native so it can run on the free tier.


## 1) Understand Current State

- Code paths
  - `server/src/main.ts` starts a Fastify server and binds to a port.
  - `server/src/installations/*` handles installation creation/storage (Sequelize model `Installation`).
  - `server/src/heartbeats/*` handles heartbeat creation/storage (Sequelize model `Heartbeat`).
  - `server/src/usage/*` aggregates stats via model queries.
  - `server/src/tasks/tasks.service.ts` runs an interval job to enrich IP geo data with `ip-api.com`.
  - `server/src/db/db.module.ts` configures Sequelize for Postgres using config in `server/src/config/config.yaml`.
- Tech: NestJS, Fastify, Sequelize (Postgres), `class-validator` DTOs, `@nestjs/schedule`.


## 2) Cloudflare Constraints and Strategy

- Cloudflare Workers do not host a Node HTTP server; they handle requests via handlers (fetch events). No `app.listen`.
- No raw TCP sockets; typical Node Postgres drivers (pg/Sequelize) won’t work. Use D1 (SQLite) or a Workers-compatible Postgres over HTTP.
- Cron Triggers replace `@Interval` jobs.
- Use native `fetch`, and lightweight frameworks like Hono/itty-router, or pure Worker handlers.
- Validation: prefer runtime schema validation libraries (e.g., Zod/Valibot) instead of `class-validator`.

Plan:
- Replace NestJS/Fastify with Hono (or bare Workers handlers) for routing.
- Replace Sequelize/Postgres with D1 and a thin query builder (Drizzle ORM for D1 or Kysely D1 dialect), or raw SQL.
- Recreate scheduled task using Cloudflare Cron Trigger.


## 3) New Project Structure (Workers)

- Location: keep within `server/` but as a new Workers app directory to avoid disrupting existing code during migration.

Suggested structure:
```
server/
  workers-app/
    src/
      routes/
        installation.ts
        heartbeat.ts
        usage.ts
      jobs/
        enrich-ip.ts
      db/
        schema.ts           # Drizzle/Kysely or raw SQL strings
        client.ts           # D1 bindings
      utils/
        validation.ts       # Zod schemas
        responses.ts
      index.ts              # Hono app/bootstrap
    package.json
    wrangler.toml
    README.md
```

You may also place this at repo root if preferred, but co-locating under `server/` keeps history close.


## 4) Data Model Mapping (Postgres → D1/SQLite)

Existing tables:
- `Installation` columns (snake_case in DB):
  - id (UUID), app_name (TEXT), app_version (TEXT), ip_address (TEXT/INET), previous_id (UUID, nullable), data (JSONB), country_code (TEXT), region (TEXT)
- `Heartbeat` columns (snake_case in DB):
  - id (UUID), installation_id (UUID), data (JSONB), created_at, updated_at

D1/SQLite considerations:
- Use TEXT for UUIDs.
- JSON supported via TEXT column storing JSON string or `json` convenience in ORM; with raw SQL, store TEXT and parse/stringify in app.
- Add indexes for lookups and distinct counts.

Example D1 schema (SQL):
```sql
-- Installation
CREATE TABLE IF NOT EXISTS Installation (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  app_version TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  previous_id TEXT,
  data TEXT, -- JSON string
  country_code TEXT,
  region TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name);
CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code);

-- Heartbeat
CREATE TABLE IF NOT EXISTS Heartbeat (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (installation_id) REFERENCES Installation(id)
);
CREATE INDEX IF NOT EXISTS idx_heartbeat_installation_id ON Heartbeat(installation_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_created_at ON Heartbeat(created_at);
```

Notes:
- Use app-generated UUIDs (e.g., `crypto.randomUUID()`) in Workers instead of DB defaults.
- `created_at`/`updated_at` use ISO strings (UTC). Adjust queries accordingly.


## 5) Route Mapping (Nest → Workers)

Global prefix `/api` remains.

- `POST /api/installation`
  - Body: `{ appName, appVersion, previousId? }`
  - Server derives `ipAddress` from `CF-Connecting-IP` or request headers.
  - Returns `{ id }`.

- `POST /api/heartbeat`
  - Body: `{ installationId, data? }`
  - Enforce one heartbeat per day per installation. Implement by querying for any heartbeat between local day bounds or simply UTC date bounds.
  - Returns `{ id: installationId }`.

- `GET /api/usage`
  - Returns usage aggregates similar to Nest implementation:
    - `totalInstallations`
    - `monthlyActive` (distinct `installation_id` in last 30 days)
    - `countryToCount` aggregation
    - App-specific counts (`icloud-drive-docker`, `ha-bouncie`)
    - `createdAt`

- `GET /api` → `All good.`


## 6) Choosing the Worker Framework

You can implement routes using:
- Hono (recommended for ergonomics and middleware): https://hono.dev
- Native Workers `fetch` handler (most minimal)

Example using Hono (TypeScript):
```ts
// server/workers-app/src/index.ts
import { Hono } from 'hono';
import { installationRoutes } from './routes/installation';
import { heartbeatRoutes } from './routes/heartbeat';
import { usageRoutes } from './routes/usage';

const app = new Hono();

app.get('/api', (c) => c.text('All good.'));
app.route('/api/installation', installationRoutes);
app.route('/api/heartbeat', heartbeatRoutes);
app.route('/api/usage', usageRoutes);

export default app;
```


## 7) D1 Binding and DB Client

- Bind a D1 database in `wrangler.toml` and expose it as an environment binding (e.g., `DB`).
- Access with Drizzle/Kysely or raw `c.env.DB.prepare(...).bind(...).all()` APIs.

Minimal raw D1 usage example:
```ts
// server/workers-app/src/db/client.ts
export type Env = { DB: D1Database };

export async function queryOne<T>(env: Env, sql: string, ...params: unknown[]): Promise<T | null> {
  const res = await env.DB.prepare(sql).bind(...params).first<T>();
  return (res as T) ?? null;
}

export async function queryAll<T>(env: Env, sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await env.DB.prepare(sql).bind(...params).all<T>();
  return (res?.results as T[]) ?? [];
}

export async function execute(env: Env, sql: string, ...params: unknown[]): Promise<void> {
  await env.DB.prepare(sql).bind(...params).run();
}
```


## 8) Validation Strategy (replace class-validator)

Use Zod schemas to validate and parse request bodies.

```ts
// server/workers-app/src/utils/validation.ts
import { z } from 'zod';

export const InstallationSchema = z.object({
  appName: z.string().min(5),
  appVersion: z.string().min(5),
  previousId: z.string().min(10).optional(),
});

export const HeartbeatSchema = z.object({
  installationId: z.string().min(10),
  data: z.record(z.any()).optional(),
});
```


## 9) Route Implementations (examples)

Installation creation:
```ts
// server/workers-app/src/routes/installation.ts
import { Hono } from 'hono';
import { InstallationSchema } from '../utils/validation';
import { execute } from '../db/client';

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationRoutes.post('/', async (c) => {
  const json = await c.req.json();
  const body = InstallationSchema.parse(json);

  const id = crypto.randomUUID();
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0';
  const now = new Date().toISOString();

  await execute(
    c.env,
    `INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.appName,
    body.appVersion,
    ipAddress,
    body.previousId ?? null,
    null,
    now,
    now,
  );

  return c.json({ id });
});
```

Heartbeat creation (one per day):
```ts
// server/workers-app/src/routes/heartbeat.ts
import { Hono } from 'hono';
import { HeartbeatSchema } from '../utils/validation';
import { queryOne, execute } from '../db/client';

export const heartbeatRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

heartbeatRoutes.post('/', async (c) => {
  const json = await c.req.json();
  const body = HeartbeatSchema.parse(json);

  // Verify installation exists
  const installation = await queryOne<{ id: string }>(
    c.env,
    'SELECT id FROM Installation WHERE id = ? LIMIT 1',
    body.installationId,
  );
  if (!installation) return c.json({ message: 'Installation not found.' }, 404);

  // Check if a heartbeat exists for today (UTC)
  const start = new Date(); start.setUTCHours(0,0,0,0);
  const end = new Date(); end.setUTCHours(23,59,59,999);

  const existing = await queryOne<{ id: string }>(
    c.env,
    'SELECT id FROM Heartbeat WHERE installation_id = ? AND created_at BETWEEN ? AND ? LIMIT 1',
    body.installationId,
    start.toISOString(),
    end.toISOString(),
  );

  if (!existing) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await execute(
      c.env,
      'INSERT INTO Heartbeat (id, installation_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id,
      body.installationId,
      body.data ? JSON.stringify(body.data) : null,
      now,
      now,
    );
  }
  return c.json({ id: body.installationId });
});
```

Usage aggregation:
```ts
// server/workers-app/src/routes/usage.ts
import { Hono } from 'hono';
import { queryOne, queryAll } from '../db/client';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  const now = new Date().toUTCString();

  const totalInstallations = await queryOne<{ count: number }>(
    c.env,
    'SELECT COUNT(1) as count FROM Installation',
  );

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthlyActive = await queryOne<{ count: number }>(
    c.env,
    'SELECT COUNT(DISTINCT installation_id) as count FROM Heartbeat WHERE created_at >= ?',
    since,
  );

  const countryToCount = await queryAll<{ country_code: string; count: number }>(
    c.env,
    'SELECT country_code, COUNT(1) as count FROM Installation WHERE country_code IS NOT NULL GROUP BY country_code ORDER BY count DESC',
  );

  const countByApp = async (name: string) =>
    (await queryOne<{ count: number }>(c.env, 'SELECT COUNT(1) as count FROM Installation WHERE app_name = ?', name))?.count ?? 0;

  return c.json({
    totalInstallations: totalInstallations?.count ?? 0,
    monthlyActive: monthlyActive?.count ?? 0,
    createdAt: now,
    countryToCount: countryToCount.map((r) => ({ countryCode: r.country_code, count: Number(r.count) })),
    iCloudDocker: { total: await countByApp('icloud-drive-docker') },
    haBouncie: { total: await countByApp('ha-bouncie') },
  });
});
```


## 10) Scheduled Job (Cron Trigger): IP Geo Enrichment

Replace `@Interval` with a Cron Trigger Worker that runs hourly.

- Get up to N installations missing `country_code`.
- POST their IPs to `http://ip-api.com/batch?fields=countryCode,region,query`.
- Update rows with `country_code` and `region`.

Example job handler:
```ts
// server/workers-app/src/jobs/enrich-ip.ts
import { queryAll, execute } from '../db/client';

export default <ExportedHandler<{ Bindings: { DB: D1Database } }>>{
  scheduled: async (event, env, ctx) => {
    const missing = await queryAll<{ id: string; ip_address: string }>(
      env,
      'SELECT id, ip_address FROM Installation WHERE country_code IS NULL LIMIT 100'
    );
    if (missing.length === 0) return;

    const ips = [...new Set(missing.map((m) => m.ip_address).filter(Boolean))];
    if (ips.length === 0) return;

    const res = await fetch('http://ip-api.com/batch?fields=countryCode,region,query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips),
    });
    const data = await res.json() as Array<{ query: string; countryCode: string; region: string }>; 

    const map = new Map(data.map((d) => [d.query, { countryCode: d.countryCode, region: d.region }]));

    for (const row of missing) {
      const info = map.get(row.ip_address);
      if (!info) continue;
      await execute(
        env,
        'UPDATE Installation SET country_code = ?, region = ?, updated_at = ? WHERE id = ?',
        info.countryCode,
        info.region,
        new Date().toISOString(),
        row.id,
      );
    }
  }
}
```


## 11) Configuration: `wrangler.toml`

Add a Workers config with HTTP routes and a Cron Trigger. Example:
```toml
# server/workers-app/wrangler.toml
name = "wapar-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

routes = [
  { pattern = "example.com/api*", zone_id = "<your-zone-id>" }
]

# Bind D1
[[d1_databases]]
binding = "DB"
database_name = "wapar-db"
database_id = "<populated by wrangler after creation>"

# Cron Trigger: run hourly
[triggers]
crons = ["0 * * * *"]

# Dev options
[dev]
port = 8787

# If using Hono with JSX or other build steps, configure build if needed
# [build]
# command = "npm run build"
```

Create the D1 database:
```
cd server/workers-app
wrangler d1 create wapar-db
wrangler d1 execute wapar-db --file=./schema.sql
```


## 12) `package.json` for Workers app

Example minimal dependencies:
```json
{
  "name": "workers-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "migrate:apply": "wrangler d1 execute wapar-db --file=./schema.sql"
  },
  "dependencies": {
    "hono": "^4.5.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "wrangler": "^3.77.0",
    "@cloudflare/workers-types": "^4.20241218.0",
    "typescript": "^5.4.0"
  }
}
```

Add `tsconfig.json` with `"lib": ["ES2023", "WebWorker"]` to get `fetch`, `crypto` types.


## 13) Data Migration (optional, if you need to carry over existing Postgres data)

- Export from Postgres as CSV/JSON for `Installation` and `Heartbeat`.
- Transform to D1 schema (ensure ISO datetime strings, stringify JSON fields, UUIDs as TEXT).
- Import using `wrangler d1 execute` and batched inserts.

Example CSV import approach:
1. Export CSV from Postgres:
   ```sql
   \COPY Installation(id, app_name, app_version, ip_address, previous_id, data, country_code, region, created_at, updated_at)
     TO 'installation.csv' CSV HEADER;
   \COPY Heartbeat(id, installation_id, data, created_at, updated_at)
     TO 'heartbeat.csv' CSV HEADER;
   ```
2. Write a small Node script (run locally) to read CSV and generate batched `INSERT` statements for D1.
3. Apply to D1:
   ```bash
   wrangler d1 execute wapar-db --file=./inserts_installation.sql
   wrangler d1 execute wapar-db --file=./inserts_heartbeat.sql
   ```

Note: For large datasets, chunk in batches of 500–1,000 rows per transaction.


## 14) Environment, Secrets, and CORS

- Env bindings: D1 (`DB`). If you add external APIs with secrets, store via `wrangler secret put <NAME>`.
- CORS: Add CORS middleware in Hono if the client is browser-based.

```ts
import { cors } from 'hono/cors';
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET','POST','OPTIONS'] }));
```


## 15) Testing and Observability

- Unit-test handlers with Miniflare or `wrangler dev` mocks.
- Add simple logging via `console.log` (available in Workers) and inspect in Cloudflare dashboard logs.
- Consider rate limiting through Cloudflare settings if endpoints are public.


## 16) Rollout Plan

1. Scaffold workers app under `server/workers-app/`.
2. Define D1 schema (`schema.sql`) and create DB via Wrangler.
3. Implement `/api`, `/api/installation`, `/api/heartbeat`, `/api/usage` routes.
4. Implement `enrich-ip` Cron Trigger job.
5. Add validation (Zod), CORS, and 404 handler.
6. Local verify with `wrangler dev`.
7. If migrating data, export from Postgres and import into D1.
8. Deploy to Cloudflare (`wrangler deploy`).
9. Wire DNS/Routes or use Workers Dev URL for testing.
10. Smoke test endpoints; compare outputs with the Nest backend.
11. Switch traffic or clients to use the Workers URL.


## 17) Parity Checklist

- Installation creation returns `{ id }`.
- Heartbeat POST enforces one-per-day and returns `{ id: installationId }` either way.
- Usage matches:
  - total installations
  - monthly active (distinct installation_id within 30 days)
  - country distribution
  - per-app counts
- Cron job populates `country_code` and `region` for missing rows.
- Timezones handled consistently (use UTC in D1).


## 18) Known Differences and Caveats

- No automatic `uuid_generate_v4()` in D1 — generate IDs in code using `crypto.randomUUID()`.
- SQLite datetime storage: use ISO strings; ensure queries use ISO comparisons.
- JSON fields become TEXT (stringified) unless using an ORM abstraction with JSON helpers.
- Long-running tasks are limited by Workers CPU time; the Cron job should operate in small batches (<=100 rows) like current logic.
- If future scale exceeds D1 limits, consider Workers-compatible Postgres (e.g., Neon HTTP driver) and adjust queries accordingly.


## 19) Decommission Plan

- Run both backends in parallel during migration (dual-write optional if clients can be updated gradually).
- After confidence, disable Postgres sync and scheduled task in NestJS.
- Archive the old `server/` Nest app or keep it for local dev.


## 20) Next Actions

- Create `server/workers-app/` scaffold (I can generate files on request).
- Decide on ORM approach (raw D1, Drizzle, or Kysely). Raw D1 keeps deps minimal.
- Confirm routing/DNS strategy (Workers Dev vs custom domain route).
- Proceed to implementation phase.
