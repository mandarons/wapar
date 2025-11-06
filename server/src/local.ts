import { Database } from 'bun:sqlite';
import app from './index';
import { Logger } from './utils/logger';
import type { D1Database } from './types/database';

/**
 * Local development and production server using Bun's native HTTP server.
 * 
 * Note: We use Bun.serve() instead of @hono/node-server to eliminate 
 * the Node.js adapter dependency, reducing Docker image size and improving
 * cold start performance. Bun's native server is faster and more memory-efficient.
 */

// Get database path from environment or use local default
const dbPath = process.env.DB_PATH || './local.db';

// Initialize SQLite database with production-ready settings
const sqlite = new Database(dbPath, {
  create: true,
  readwrite: true,
});

// Configure SQLite for production performance and reliability
// Enable WAL mode for better concurrency and performance
sqlite.exec('PRAGMA journal_mode = WAL;');

// Set synchronous mode to NORMAL for WAL (balance between performance and durability)
// For maximum durability, use FULL instead
sqlite.exec('PRAGMA synchronous = NORMAL;');

// Set cache size to 64MB (negative value means KB)
// Larger cache = better performance for read-heavy workloads
sqlite.exec('PRAGMA cache_size = -64000;');

// Enable foreign key constraints
sqlite.exec('PRAGMA foreign_keys = ON;');

// Set a reasonable busy timeout (5 seconds in milliseconds)
// This helps handle concurrent access gracefully
sqlite.exec('PRAGMA busy_timeout = 5000;');

// Optimize memory-mapped I/O for better performance
// 256MB memory-mapped I/O
sqlite.exec('PRAGMA mmap_size = 268435456;');

// Set temp store to memory for better performance
sqlite.exec('PRAGMA temp_store = MEMORY;');

// Optimize page size (4KB is generally good for modern systems)
// Note: This only affects new databases
sqlite.exec('PRAGMA page_size = 4096;');

Logger.info('SQLite database initialized with production settings', {
  operation: 'db.init',
  metadata: {
    path: dbPath,
    journalMode: sqlite.query('PRAGMA journal_mode;').get(),
    synchronous: sqlite.query('PRAGMA synchronous;').get(),
    cacheSize: sqlite.query('PRAGMA cache_size;').get(),
    foreignKeys: sqlite.query('PRAGMA foreign_keys;').get(),
    mmapSize: sqlite.query('PRAGMA mmap_size;').get(),
  },
});

// Create a mock D1Database object that wraps Bun's native SQLite
// This allows the existing Hono app to work with SQLite
const mockD1: D1Database = {
  prepare: (query: string) => {
    const stmt = sqlite.query(query);
    
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
    sqlite.exec(query);
    return {
      count: 0,
      duration: 0,
    };
  },
} as any;

const port = 8787;

console.log(`Starting Hono server on http://localhost:${port}`);
console.log(`Database: ${dbPath}`);

// Monkey-patch the fetch handler to inject DB binding
const originalFetch = app.fetch.bind(app);
app.fetch = async (request: Request, env?: any, ctx?: any) => {
  return originalFetch(request, { ...env, DB: mockD1 }, ctx);
};

// Use Bun's native server
const server = Bun.serve({
  fetch: app.fetch,
  port,
});

Logger.success('Server started successfully', {
  operation: 'server.start',
  metadata: {
    port: server.port,
    address: `http://localhost:${server.port}`,
    database: dbPath,
  },
});
console.log(`\n✓ Server running at http://localhost:${server.port}`);
console.log(`✓ Database: ${dbPath}`);
console.log(`✓ WAL mode enabled for better concurrency`);
console.log(`\nPress Ctrl+C to stop\n`);

// WAL checkpoint monitoring and management
// Periodically checkpoint the WAL file to prevent it from growing too large
const walCheckpointInterval = setInterval(() => {
  try {
    const fs = require('fs');
    const walPath = `${dbPath}-wal`;
    
    try {
      const stats = fs.statSync(walPath);
      const walSizeMB = stats.size / (1024 * 1024);
      
      // If WAL file exceeds 10MB, perform a checkpoint
      if (stats.size > 10 * 1024 * 1024) {
        Logger.info('WAL file size threshold exceeded, performing checkpoint', {
          operation: 'wal.checkpoint',
          metadata: { walSizeMB: walSizeMB.toFixed(2) },
        });
        
        try {
          // RESTART mode: checkpoint and reset the WAL file
          sqlite.exec('PRAGMA wal_checkpoint(RESTART);');
          Logger.success('WAL checkpoint completed', {
            operation: 'wal.checkpoint.success',
          });
        } catch (checkpointErr) {
          Logger.error('WAL checkpoint failed', {
            operation: 'wal.checkpoint.failed',
            error: checkpointErr as Error,
          });
        }
      }
    } catch (err: any) {
      // WAL file doesn't exist or can't be accessed - this is normal
      if (err.code !== 'ENOENT') {
        Logger.warning('Error checking WAL file size', {
          operation: 'wal.checkpoint.error',
          metadata: { error: err.message },
        });
      }
    }
  } catch (error) {
    Logger.error('WAL checkpoint monitoring error', {
      operation: 'wal.checkpoint.monitor',
      error: error as Error,
    });
  }
}, 30000); // Check every 30 seconds

// Graceful shutdown with proper WAL checkpoint
const gracefulShutdown = () => {
  console.log('\n\nShutting down server...');
  
  // Clear the checkpoint interval
  clearInterval(walCheckpointInterval);
  
  try {
    // Perform a final checkpoint to ensure all data is written
    console.log('Performing final WAL checkpoint...');
    sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('✓ WAL checkpoint completed');
  } catch (error) {
    console.error('⚠ WAL checkpoint failed:', error);
  }
  
  try {
    // Optimize database before closing
    console.log('Optimizing database...');
    sqlite.exec('PRAGMA optimize;');
    console.log('✓ Database optimized');
  } catch (error) {
    console.error('⚠ Database optimization failed:', error);
  }
  
  // Close the database connection
  sqlite.close();
  console.log('✓ Database closed');
  
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
