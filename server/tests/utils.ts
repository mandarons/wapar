import { beforeAll, afterAll } from 'vitest';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';

export let worker: Unstable_DevWorker;

function getRunnerUA(): string {
  return process.env.npm_config_user_agent || '';
}

export function getBase(): string {
  const anyWorker = worker as any;
  // Prefer the port when available; construct a proper http URL
  if (typeof anyWorker?.port === 'number' && anyWorker.port > 0) {
    return `http://127.0.0.1:${anyWorker.port}`;
  }
  // Fallback to address if it exists and already includes a scheme
  const addr = anyWorker?.address as string | undefined;
  if (addr) {
    if (/^https?:\/\//i.test(addr)) return addr;
    // If it's host:port, prefix http://
    if (/^[^\/]+:\d+$/.test(addr)) return `http://${addr}`;
  }
  throw new Error('Worker is not ready (no address/port)');
}

async function initializeTestDatabase() {
  // Initialize database schema by calling a simple endpoint that creates tables
  // This is only available during test runs via localhost
  const base = getBase();
  const res = await fetch(`${base}/api`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Test worker not ready: ${res.status}`);
  }
  
  // Create tables directly using SQL - this is safe since it's localhost only
  await d1Exec(`CREATE TABLE IF NOT EXISTS Installation (
    id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    app_version TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    previous_id TEXT,
    data TEXT,
    country_code TEXT,
    region TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name)`);
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_app_version ON Installation(app_version)`);
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code)`);
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_updated_at ON Installation(updated_at)`);
  
  await d1Exec(`CREATE TABLE IF NOT EXISTS Heartbeat (
    id TEXT PRIMARY KEY,
    installation_id TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (installation_id) REFERENCES Installation(id)
  )`);
  
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_heartbeat_installation_id ON Heartbeat(installation_id)`);
  await d1Exec(`CREATE INDEX IF NOT EXISTS idx_heartbeat_created_at ON Heartbeat(created_at)`);
}

export async function resetDb() {
  // Skip database reset entirely - let tests handle their own data isolation
  // This avoids any potential D1 locking or worker communication issues
  return Promise.resolve();
}

export async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  // Execute SQL directly against the test worker's D1 instance
  // This is safe because it's only accessible during localhost test runs
  const base = getBase();
  const response = await fetch(`${base}/api`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Test-SQL': 'exec'
    },
    body: JSON.stringify({ sql, params }),
  });
  
  if (!response.ok) {
    throw new Error(`d1Exec failed: ${response.status}`);
  }
}

export async function d1QueryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  // Query SQL directly against the test worker's D1 instance
  const base = getBase();
  const response = await fetch(`${base}/api`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Test-SQL': 'query'
    },
    body: JSON.stringify({ sql, params }),
  });
  
  if (!response.ok) {
    throw new Error(`d1QueryOne failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result as T | null;
}

// Alias for compatibility with installation tests
export const queryOne = d1QueryOne;

export async function waitForCount(sqlCountQuery: string, params: unknown[] | number = [], expectedOrTimeout?: number, timeoutMs = 12000, intervalMs = 200): Promise<void> {
  // Handle overloaded signatures for backward compatibility
  let expected: number;
  let timeout: number;
  let interval: number;
  let queryParams: unknown[];
  
  if (typeof params === 'number') {
    // Old signature: waitForCount(query, expected, timeout?, interval?)
    expected = params;
    timeout = typeof expectedOrTimeout === 'number' ? expectedOrTimeout : timeoutMs;
    interval = intervalMs;
    queryParams = [];
  } else {
    // New signature: waitForCount(query, params, expected, timeout?, interval?)
    queryParams = params;
    expected = expectedOrTimeout as number;
    timeout = timeoutMs;
    interval = intervalMs;
  }
  
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const row = await d1QueryOne<{ count: number }>(sqlCountQuery, queryParams);
    const count = Number(row?.count ?? 0);
    if (count === expected) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for count=${expected} for query: ${sqlCountQuery}`);
}

beforeAll(async () => {
  worker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    ip: '127.0.0.1',
    port: 0, // random available port
    experimental: { disableExperimentalWarning: true }
  });
  // Ensure the dev server is fully ready before tests run
  // @ts-ignore - ready is available on UnstableDevWorker in wrangler v4
  await (worker as any).ready;
  
  // Initialize database schema for all tests
  await initializeTestDatabase();
}, 60000); // Increase timeout for worker startup

afterAll(async () => {
  await worker?.stop();
});
