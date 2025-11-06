# Local Development Guide

Complete guide for running the WAPAR server locally with SQLite.

## Quick Start

### Using Docker (Recommended for Production)

See [../DOCKER.md](../DOCKER.md) for production Docker deployment.

### Using Bun Locally

From the `server/` directory:

```bash
./run.sh
```

This script will:
1. Install all dependencies with Bun
2. Create a local SQLite database (`local.db`)
3. Apply all migrations
4. Start the Hono server on `http://localhost:8787`

## Manual Setup

If you prefer to run the steps manually:

```bash
# 1. Install dependencies
bun install

# 2. Apply migrations
bun run db:push

# 3. Start the server
bun run dev
```

## Architecture

### Technology Stack

- **Runtime**: Bun (native, high-performance JavaScript runtime)
- **Framework**: Hono v4.10.4 (lightweight web framework)
- **Database**: SQLite via `bun:sqlite` (Bun's native SQLite implementation)
- **ORM**: Drizzle ORM (type-safe database toolkit)

### Database Mock Layer

The local setup uses a compatibility layer to match the Cloudflare D1 API:

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
│   • Zero dependencies               │
│   • Extremely fast                  │
│   • WAL mode enabled                │
│   • Production-optimized            │
└─────────────────────────────────────┘
```

### Key Files

- `src/index.ts` - Main application entry point
- `src/types/database.ts` - D1Database interface definitions
- `drizzle.config.ts` - Drizzle ORM configuration
- `bunfig.toml` - Bun test configuration with preload
- `tests/setup.ts` - Global test setup with in-memory SQLite
- `run.sh` - Convenience startup script
- `local.db` - SQLite database file (auto-created)

## Production-Ready SQLite Configuration

The local SQLite setup includes production-grade optimizations using `bun:sqlite`.

### WAL Mode (Write-Ahead Logging)

- **Enabled by default** for better concurrency
- Allows simultaneous reads and writes
- Significantly improves performance in web applications
- Automatic checkpoint management every 30 seconds
- Graceful shutdown performs final checkpoint and optimization

### Performance Optimizations

```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;        -- Balanced durability/performance
PRAGMA cache_size = -64000;         -- 64MB cache
PRAGMA mmap_size = 268435456;       -- 256MB memory-mapped I/O
PRAGMA temp_store = MEMORY;         -- Memory-based temp tables
PRAGMA page_size = 4096;            -- 4KB pages for modern systems
```

### Reliability Features

```sql
PRAGMA foreign_keys = ON;           -- Enforce referential integrity
PRAGMA busy_timeout = 5000;         -- 5 second timeout for concurrent access
```

### Automatic Maintenance

- **WAL Checkpointing**: Monitors WAL file size every 30 seconds
- **Checkpoint Threshold**: Triggered when WAL exceeds 10MB
- **Shutdown Optimization**: Runs `PRAGMA optimize` on graceful exit
- **Final Checkpoint**: TRUNCATE mode ensures clean shutdown

## Available Commands

### Development
```bash
bun run dev          # Start development server with hot reload
bun run start        # Start production server
```

### Database Management
```bash
bun run db:push      # Apply schema changes to database
bun run db:generate  # Generate migration files
bun run db:migrate   # Apply migrations
```

### Testing
```bash
bun test                   # Run all tests (minimal output)
bun test:verbose           # Run with full output
bun test:unit              # Unit tests only
bun test:integration       # Integration tests only
bun test --coverage        # Generate coverage report
```

## API Endpoints

Once running on `http://localhost:8787`:

### Core Endpoints
- `GET /api` - Health check
- `POST /api/installation` - Register new installation
- `POST /api/heartbeat` - Record installation heartbeat

### Analytics Endpoints
- `GET /api/usage` - Usage analytics
- `GET /api/installation-stats` - Installation statistics
- `GET /api/version-analytics` - Version distribution
- `GET /api/heartbeat-analytics` - Heartbeat analytics
- `GET /api/recent-installations` - Recent installations
- `GET /api/new-installations` - New installation analytics

## Database Management

### Viewing the Database

The local SQLite database is stored at `./local.db`. You can inspect it with:

- **DB Browser for SQLite**: https://sqlitebrowser.org/
- **SQLite CLI**: `sqlite3 local.db`
- **VS Code Extensions**: SQLite Viewer, SQLite

### WAL Files

When WAL mode is enabled, you'll see additional files:
- `local.db` - Main database file
- `local.db-wal` - Write-Ahead Log file (temporary changes)
- `local.db-shm` - Shared memory file (for coordination)

These files are automatically managed. Don't delete them while the server is running.

### Resetting the Database

```bash
# Stop the server first (Ctrl+C)
rm local.db local.db-wal local.db-shm
./run.sh
```

### Backup the Database

```bash
# Perform checkpoint first to consolidate WAL changes
sqlite3 local.db "PRAGMA wal_checkpoint(TRUNCATE);"
# Then copy the database
cp local.db local.db.backup
```

## Testing

### Unit and Integration Tests

The test suite uses Bun's native test runner with in-memory SQLite for fast, isolated tests.

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test tests/installation.test.ts

# Run E2E tests
bun test tests/e2e/
```

### Test Infrastructure

- **Test Runner**: Bun v1.3.1 native test runner
- **Database**: In-memory SQLite for fast, isolated tests
- **Global Setup**: `tests/setup.ts` (preloaded via `bunfig.toml`)
- **Test Utilities**: `tests/utils.ts` (resetDb, d1Exec, waitForCount, getBase)

See [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) for detailed coverage information.

## Troubleshooting

### Migration Errors

If you get migration errors, try:

```bash
# Delete the local database and start fresh
rm local.db local.db-wal local.db-shm
./run.sh
```

### WAL File Growing Large

The server automatically checkpoints the WAL file when it exceeds 10MB. To manually trigger:

```bash
sqlite3 local.db "PRAGMA wal_checkpoint(RESTART);"
```

### Database Locked Errors

If you see "database is locked" errors:
- The busy timeout is set to 5 seconds by default
- Close other SQLite connections to the database
- WAL mode generally handles concurrent access well
- Multiple server instances on the same database can cause locks

### Port Already in Use

If port 8787 is already in use:

```bash
# Find what's using the port
lsof -i :8787

# Kill the process or change the port in src/index.ts
```

### Dependencies Not Found

Make sure all dependencies are installed:

```bash
bun install
```

## Benefits of Local Development

1. **No Internet Required** - Develop offline without Cloudflare access
2. **Faster Iteration** - No deployment needed for testing
3. **Better Debugging** - Full Bun/Node.js debugging support
4. **Database Inspection** - Easy inspection with SQLite GUI tools
5. **No Account Needed** - Anyone can run the server locally
6. **Consistent Port** - Same port (8787) for consistency
7. **Fast Tests** - In-memory SQLite for rapid test execution

## Contributing

When developing locally:
- All database changes must have corresponding Drizzle migrations
- Run `bun test --coverage` before committing
- Update tests for new features
- Follow the TypeScript strict mode guidelines
- Use the Logger utility for all logging operations

See [../CONTRIBUTING.md](../../CONTRIBUTING.md) for full contribution guidelines.

## Related Documentation

- [Test Coverage Report](./TEST_COVERAGE_REPORT.md) - Detailed test coverage metrics
- [Active Installations](./ACTIVE_INSTALLATIONS.md) - Active installation tracking feature
- [Form Encoding Support](./FORM_ENCODING_SUPPORT.md) - API request format documentation
- [Main README](../README.md) - Quick start and API overview
