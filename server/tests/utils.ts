import { Database } from 'bun:sqlite';

function getRunnerUA(): string {
  return process.env.npm_config_user_agent || '';
}

// Access global test environment variables
function getTestPort(): number {
  return (globalThis as any).__testPort;
}

function getTestSqlite(): Database {
  return (globalThis as any).__testSqlite;
}

export function getBase(): string {
  const testPort = getTestPort();
  if (!testPort) {
    throw new Error('Test server not started');
  }
  return `http://127.0.0.1:${testPort}`;
}

async function initializeTestDatabase() {
  // Apply migrations using drizzle schema
  const { execSync } = require('child_process');
  try {
    execSync('bun x drizzle-kit push --config=drizzle.config.local.ts', {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Failed to apply migrations:', error);
    throw error;
  }
}

export async function resetDb() {
  // Reset database by deleting all data
  const sqlite = getTestSqlite();
  if (!sqlite) return;
  
  try {
    sqlite.exec('DELETE FROM Heartbeat');
    sqlite.exec('DELETE FROM Installation');
  } catch (error) {
    console.error('Failed to reset database:', error);
  }
}

export async function d1Exec(sql: string, params: any[] = []): Promise<void> {
  const sqlite = getTestSqlite();
  if (!sqlite) {
    throw new Error('Database not initialized');
  }
  
  try {
    if (params.length > 0) {
      const stmt = sqlite.query(sql);
      stmt.run(...params);
    } else {
      sqlite.exec(sql);
    }
  } catch (error) {
    console.error('d1Exec failed:', error);
    throw error;
  }
}

export async function d1QueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const sqlite = getTestSqlite();
  if (!sqlite) {
    throw new Error('Database not initialized');
  }
  
  try {
    const stmt = sqlite.query(sql);
    const result = params.length > 0 ? stmt.get(...params) : stmt.get();
    return result as T | null;
  } catch (error) {
    console.error('d1QueryOne failed:', error);
    throw error;
  }
}

// Alias for compatibility with installation tests
export const queryOne = d1QueryOne;

// Overloaded function signatures for waitForCount
export async function waitForCount(sqlCountQuery: string, expected: number, timeoutMs?: number, intervalMs?: number): Promise<void>;
export async function waitForCount(sqlCountQuery: string, params: unknown[], expected: number, timeoutMs?: number, intervalMs?: number): Promise<void>;
export async function waitForCount(sqlCountQuery: string, paramsOrExpected: unknown[] | number, expectedOrTimeout?: number, timeoutMsOrInterval?: number, intervalMs?: number): Promise<void> {
  let queryParams: unknown[];
  let expected: number;
  let timeout: number;
  let interval: number;
  
  if (typeof paramsOrExpected === 'number') {
    // First signature: waitForCount(query, expected, timeout?, interval?)
    queryParams = [];
    expected = paramsOrExpected;
    timeout = expectedOrTimeout ?? 12000;
    interval = timeoutMsOrInterval ?? 200;
  } else {
    // Second signature: waitForCount(query, params, expected, timeout?, interval?)
    queryParams = paramsOrExpected;
    expected = expectedOrTimeout as number;
    timeout = timeoutMsOrInterval ?? 12000;
    interval = intervalMs ?? 200;
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


