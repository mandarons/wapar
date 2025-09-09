import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked') || msg.includes('internal error')) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1))); // Exponential backoff
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function ensureTestSchema(DB: D1Database): Promise<void> {
  // Create tables/indexes if they don't exist - wrap each operation in withRetry
  await withRetry(async () => {
    await DB.prepare(`CREATE TABLE IF NOT EXISTS Installation (
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
    );`).run();
  });
  
  await withRetry(async () => {
    await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name);`).run();
  });
  
  await withRetry(async () => {
    await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code);`).run();
  });

  await withRetry(async () => {
    await DB.prepare(`CREATE TABLE IF NOT EXISTS Heartbeat (
      id TEXT PRIMARY KEY,
      installation_id TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (installation_id) REFERENCES Installation(id)
    );`).run();
  });
  
  await withRetry(async () => {
    await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_heartbeat_installation_id ON Heartbeat(installation_id);`).run();
  });
  
  await withRetry(async () => {
    await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_heartbeat_created_at ON Heartbeat(created_at);`).run();
  });
}

export async function clearTestData(env: { DB: D1Database }): Promise<void> {
  const db = getDb(env);
  
  // Delete all data from tables
  await withRetry(async () => {
    await db.delete(heartbeats);
  });
  
  await withRetry(async () => {
    await db.delete(installations);
  });
}

export async function execTestSql(DB: D1Database, sql: string, params: unknown[] = []): Promise<any> {
  return await withRetry(async () => {
    const stmt = DB.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).run();
    }
    return await stmt.run();
  });
}

export async function queryTestSql<T = any>(DB: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
  return await withRetry(async () => {
    const stmt = DB.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).first() as T | null;
    }
    return await stmt.first() as T | null;
  });
}
