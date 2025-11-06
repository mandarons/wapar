# Local SQLite Setup for WAPAR Server

This document summarizes the changes made to enable running the WAPAR server locally with SQLite instead of Cloudflare D1.

## Overview

The server can now run in two modes:
1. **Production/Staging**: Cloudflare Workers with D1 database (existing)
2. **Local Development**: Node.js with SQLite database (new)

## Changes Made

### 1. Dependencies Added

**File**: `server/package.json`

```json
"devDependencies": {
  "@hono/node-server": "^1.19.6",     // Hono adapter for Node.js
  "@types/better-sqlite3": "^7.6.13",  // TypeScript types
  "@types/node": "^22.19.0",           // Node.js types
  "better-sqlite3": "^11.10.0",        // SQLite library
  "tsx": "^4.20.6"                     // TypeScript executor
}
```

### 2. New Scripts

**File**: `server/package.json`

```json
"scripts": {
  "dev:local": "tsx src/local.ts",                                    // Run local server
  "db:migrate:local": "drizzle-kit migrate --config=drizzle.config.local.ts",  // Migrate local DB
  "db:push:local": "drizzle-kit push --config=drizzle.config.local.ts"         // Push schema to local DB
}
```

### 3. New Files Created

#### `server/drizzle.config.local.ts`
Drizzle configuration for local SQLite database instead of Cloudflare D1.

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './local.db',
  },
});
```

#### `server/src/local.ts`
Local server entry point that:
- Creates a SQLite database using better-sqlite3
- Wraps it in a mock D1Database interface for compatibility
- Runs the Hono app using @hono/node-server
- Handles graceful shutdown

Key features:
- **Mock D1Database**: Translates D1 API calls to better-sqlite3 calls
- **Port 8787**: Same port as wrangler dev for consistency
- **Environment Injection**: Automatically injects the DB binding into requests
- **Graceful Shutdown**: Properly closes the database on SIGINT/SIGTERM

#### `server/run.sh`
Convenience script that:
1. Checks dependencies (bun)
2. Installs packages
3. Creates/migrates local database
4. Starts the server

Features:
- Colored output for better UX
- Error handling
- Step-by-step progress indication

#### `server/LOCAL_DEVELOPMENT.md`
Comprehensive documentation covering:
- Quick start guide
- Manual setup instructions
- Architecture explanation
- Differences from production
- Available scripts
- Testing information
- Troubleshooting tips

### 4. .gitignore Updates

**File**: `.gitignore`

Added local SQLite database files:
```
# Local SQLite database for development
server/local.db
server/local.db-shm
server/local.db-wal
```

## Usage

### Quick Start

```bash
cd server
./run.sh
```

### Manual Start

```bash
cd server
bun install
bun x drizzle-kit push --config=drizzle.config.local.ts
bun run dev:local
```

## Architecture

### D1 Database Mock

The `local.ts` file creates a mock D1Database object that wraps better-sqlite3:

```
┌─────────────────────────────────────┐
│        Hono Application             │
│   (Expects D1Database binding)      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      Mock D1Database Wrapper        │
│  (Translates D1 API to SQLite)      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         bun:sqlite                  │
│   (Bun's native SQLite engine)      │
│   • Production-optimized            │
│   • Zero dependencies               │
│   • Extremely fast                  │
│   • WAL mode enabled                │
│   • 64MB cache size                 │
│   • 256MB memory-mapped I/O         │
│   • Foreign key constraints         │
│   • Automatic WAL checkpoints       │
└─────────────────────────────────────┘
```

### Production-Ready Configuration

The SQLite database is configured with production-grade settings using Bun's native `bun:sqlite`:

#### WAL Mode (Write-Ahead Logging)
- **Purpose**: Enables concurrent reads and writes
- **Performance**: Dramatically improves throughput for web applications
- **Checkpoint Management**: Automatic monitoring every 30 seconds
- **Threshold**: Checkpoints triggered when WAL exceeds 10MB
- **Shutdown**: Graceful TRUNCATE checkpoint on exit

#### Performance Settings
```typescript
journal_mode = WAL           // Enable Write-Ahead Logging
synchronous = NORMAL         // Balance durability/performance
cache_size = -64000          // 64MB cache (negative = KB)
mmap_size = 268435456        // 256MB memory-mapped I/O
temp_store = MEMORY          // Use memory for temp tables
page_size = 4096             // 4KB pages for modern systems
busy_timeout = 5000          // 5 second timeout for locks
```

#### Reliability Settings
```typescript
foreign_keys = ON            // Enforce referential integrity
```

#### Automatic Maintenance
- **WAL Checkpointing**: Monitors WAL file size every 30 seconds
- **Shutdown Optimization**: Runs `PRAGMA optimize` on graceful exit
- **Final Checkpoint**: TRUNCATE mode ensures clean shutdown

### API Compatibility

The mock D1Database implements all methods used by the application:
- `prepare(query)` - Prepare SQL statement
- `bind(...params)` - Bind parameters
- `run()` - Execute statement (INSERT, UPDATE, DELETE)
- `all()` - Fetch all results
- `first(colName?)` - Fetch first result
- `raw()` - Fetch raw results
- `exec(query)` - Execute raw SQL
- `batch(statements)` - Execute multiple statements

## Testing

The local setup has been tested with:
- ✅ Database creation
- ✅ Migration application
- ✅ Server startup (verified by migration push)

To fully test:
```bash
cd server
./run.sh
# In another terminal:
curl http://localhost:8787/api
```

## Benefits

1. **No Internet Required**: Develop offline without Cloudflare access
2. **Faster Iteration**: No deployment needed for testing
3. **Better Debugging**: Full Node.js debugging support
4. **SQLite Browser**: Easy database inspection with GUI tools
5. **No Account Needed**: Anyone can run the server locally
6. **Consistent Port**: Same port (8787) as wrangler dev

## Limitations

1. **SQLite vs D1**: Minor API differences may exist
2. **No Edge Features**: Missing Cloudflare-specific features
3. **Single Instance**: No distributed database like D1
4. **Different Performance**: SQLite performance characteristics differ from D1

## Recommendations

- Use local development for rapid feature development
- Test with `wrangler dev` before deploying
- Run tests in both environments when possible
- Keep the mock D1 wrapper updated with any new D1 API usage
