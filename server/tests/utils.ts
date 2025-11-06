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

function getTestMockD1(): any {
  return (globalThis as any).__testMockD1;
}

export function getBase(): string {
  const testPort = getTestPort();
  if (!testPort) {
    throw new Error('Test server not started');
  }
  return `http://127.0.0.1:${testPort}`;
}

// Create mock D1 database for tests
function createMockD1(db: Database): any {
  return {
    prepare: (query: string) => {
      const stmt = db.query(query);
      
      return {
        bind: (...params: any[]) => {
          return {
            run: async () => {
              const result = stmt.run(...params);
              return {
                success: true,
                meta: {
                  duration: 0,
                  rows_read: 0,
                  rows_written: result.changes,
                },
                results: [],
              };
            },
            all: async () => {
              const results = stmt.all(...params);
              return {
                success: true,
                meta: {
                  duration: 0,
                },
                results,
              };
            },
            first: async (colName?: string) => {
              const result = stmt.get(...params);
              if (!result) return null;
              if (colName) return (result as any)[colName];
              return result;
            },
            raw: async () => {
              const results = stmt.values(...params);
              return results;
            },
          };
        },
        run: async () => {
          const result = stmt.run();
          return {
            success: true,
            meta: {
              duration: 0,
              rows_read: 0,
              rows_written: result.changes,
            },
            results: [],
          };
        },
        all: async () => {
          const results = stmt.all();
          return {
            success: true,
            meta: {
              duration: 0,
            },
            results,
          };
        },
        first: async (colName?: string) => {
          const result = stmt.get();
          if (!result) return null;
          if (colName) return (result as any)[colName];
          return result;
        },
        raw: async () => {
          const results = stmt.values();
          return results;
        },
      };
    },
    dump: async () => new ArrayBuffer(0),
    batch: async (statements: any[]) => {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    },
    exec: async (query: string) => {
      db.exec(query);
      return {
        count: 0,
        duration: 0,
      };
    },
  } as any;
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

export async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
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

export async function d1QueryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
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


