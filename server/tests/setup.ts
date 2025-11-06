import { beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import app from '../src/index';

// Set test environment
process.env.NODE_ENV = 'test';

let server: any;
let sqlite: Database;
let mockD1: any;
let testPort: number;

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

async function initializeTestDatabase(db: Database) {
  // Read and execute the schema SQL directly
  const fs = require('fs');
  const path = require('path');
  
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized from schema.sql');
  } else {
    // If schema.sql doesn't exist, create tables manually
    db.exec(`
      CREATE TABLE IF NOT EXISTS Installation (
        id TEXT PRIMARY KEY,
        appName TEXT NOT NULL,
        appVersion TEXT NOT NULL,
        osVersion TEXT,
        arch TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        previousId TEXT,
        data TEXT,
        ipAddress TEXT,
        countryCode TEXT,
        countryName TEXT,
        regionCode TEXT,
        regionName TEXT,
        city TEXT,
        zipCode TEXT,
        latitude TEXT,
        longitude TEXT,
        lastHeartbeatAt TEXT
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS Heartbeat (
        id TEXT PRIMARY KEY,
        installationId TEXT NOT NULL,
        data TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (installationId) REFERENCES Installation(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS installation_previousid_idx ON Installation(previousId);`);
    db.exec(`CREATE INDEX IF NOT EXISTS installation_createdat_idx ON Installation(createdAt);`);
    db.exec(`CREATE INDEX IF NOT EXISTS installation_lastheartbeatat_idx ON Installation(lastHeartbeatAt);`);
    db.exec(`CREATE INDEX IF NOT EXISTS heartbeat_installationid_idx ON Heartbeat(installationId);`);
    db.exec(`CREATE INDEX IF NOT EXISTS heartbeat_createdat_idx ON Heartbeat(createdAt);`);
    
    console.log('Database schema initialized programmatically');
  }
}

beforeAll(async () => {
  console.log('Setting up global test environment...');
  
  // Create in-memory test database
  sqlite = new Database(':memory:');
  
  // Configure SQLite for tests
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  // Create mock D1 database
  mockD1 = createMockD1(sqlite);
  
  // Initialize database schema
  await initializeTestDatabase(sqlite);
  
  // Monkey-patch app.fetch to inject DB binding
  const originalFetch = app.fetch.bind(app);
  app.fetch = async (request: Request, env?: any, ctx?: any) => {
    return originalFetch(request, { ...env, DB: mockD1 }, ctx);
  };
  
  // Use a fixed port for tests
  testPort = 8787;
  
  // Start test server using Bun.serve
  server = Bun.serve({
    port: testPort,
    fetch: app.fetch,
  });
  
  console.log(`Test server started on port ${testPort}`);
  
  // Export globals for test access
  (globalThis as any).__testServer = server;
  (globalThis as any).__testSqlite = sqlite;
  (globalThis as any).__testMockD1 = mockD1;
  (globalThis as any).__testPort = testPort;
});

afterAll(async () => {
  console.log('Tearing down global test environment...');
  
  // Close server
  if (server) {
    server.stop();
  }
  
  // Close database
  if (sqlite) {
    sqlite.close();
  }
});
