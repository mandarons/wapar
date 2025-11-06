import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import type { D1Database } from '../types/database';
import { installations, heartbeats } from '../db/schema';
import type { D1Database } from '../types/database';

export const testRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

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

async function ensureSchema(DB: D1Database) {
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

// Danger: test utilities. Do not expose in production environments without protection.

testRoutes.post('/reset', async (c) => {
  try {
    // Ensure schema exists FIRST (in case this is first run)
    await ensureSchema(c.env.DB);
    
    const db = getDb(c.env);
    
    // Use Drizzle to delete all data (now that tables exist)
    await withRetry(async () => {
      await db.delete(heartbeats);
    });
    
    await withRetry(async () => {
      await db.delete(installations);
    });
    
    return c.json({ ok: true });
  } catch (err) {
    console.error('Reset error:', err);
    return c.json({ ok: false, error: String((err as Error).message || err) }, 200);
  }
});

testRoutes.post('/exec', async (c) => {
  try {
    const { sql: sqlQuery, params = [] } = await c.req.json<{ sql: string; params?: unknown[] }>();
    await withRetry(async () => {
      await c.env.DB.prepare(sqlQuery).bind(...params).run();
    });
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: String((err as Error).message || err) }, 200);
  }
});

testRoutes.post('/queryOne', async (c) => {
  try {
    const { sql: sqlQuery, params = [] } = await c.req.json<{ sql: string; params?: unknown[] }>();
    const row = await withRetry(async () => {
      return (await c.env.DB.prepare(sqlQuery).bind(...params).first()) as any;
    });
    return c.json({ ok: true, data: row ?? null });
  } catch (err) {
    return c.json({ ok: false, data: null }, 200);
  }
});
