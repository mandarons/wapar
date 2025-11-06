# Running WAPAR Server Locally with SQLite

This guide explains how to run the WAPAR server locally using SQLite instead of Cloudflare D1.

## Quick Start

From the `server/` directory, simply run:

```bash
./run.sh
```

This script will:
1. Install all dependencies
2. Create a local SQLite database (`local.db`)
3. Apply all migrations
4. Start the Hono server on `http://localhost:8787`

## Production-Ready SQLite Configuration

The local SQLite setup includes production-grade optimizations:

### WAL Mode (Write-Ahead Logging)
- **Enabled by default** for better concurrency
- Allows simultaneous reads and writes
- Significantly improves performance in web applications
- Automatic checkpoint management every 30 seconds
- Graceful shutdown performs final checkpoint and optimization

### Performance Optimizations
- **Cache Size**: 64MB for better read performance
- **Memory-mapped I/O**: 256MB for faster file operations
- **Page Size**: 4KB optimized for modern systems
- **Temp Store**: Memory-based for faster temporary operations
- **Synchronous Mode**: NORMAL (balanced durability/performance in WAL mode)

### Reliability Features
- **Foreign Key Constraints**: Enabled for data integrity
- **Busy Timeout**: 5 seconds for handling concurrent access
- **Automatic WAL Checkpoints**: Prevents WAL file from growing unbounded
- **Graceful Shutdown**: Ensures data integrity on exit

## Manual Setup

If you prefer to run the steps manually:

### 1. Install Dependencies

```bash
bun install
```

### 2. Apply Migrations

```bash
bun x drizzle-kit push --config=drizzle.config.local.ts
```

### 3. Start the Server

```bash
bun run dev:local
```

## Architecture

The local setup uses:

- **@hono/node-server**: Hono adapter for Node.js runtime  
- **bun:sqlite**: Bun's native, high-performance SQLite implementation
- **Mock D1 Database**: A compatibility layer that wraps bun:sqlite to match the Cloudflare D1 API

### Files

- `src/local.ts`: Local server entry point that creates a mock D1Database wrapper around Bun's SQLite
- `drizzle.config.local.ts`: Drizzle configuration for local SQLite
- `run.sh`: Convenience script to set up and start the server
- `local.db`: SQLite database file (created automatically)

## Differences from Production

| Feature | Production (Cloudflare Workers) | Local (Node.js + Bun SQLite) |
|---------|--------------------------------|------------------------------|
| Runtime | Cloudflare Workers | Node.js (via @hono/node-server) |
| Database | Cloudflare D1 | Bun's native SQLite |
| Server | Cloudflare's edge network | Hono with @hono/node-server |
| Port | Managed by Cloudflare | 8787 (configurable) |
| Performance | Edge computing | Native SQLite (extremely fast) |

## Available Scripts

```bash
# Start local development server
bun run dev:local

# Apply migrations to local database
bun run db:push:local

# Start Cloudflare Workers development (with wrangler)
bun run dev

# Deploy to Cloudflare Workers
bun run deploy
```

## Testing

The local server runs on the same port (8787) as the wrangler dev server, making it easy to test your application before deploying to Cloudflare Workers.

Access the API at:
- Health check: http://localhost:8787/api
- Installation: http://localhost:8787/api/installation
- Heartbeat: http://localhost:8787/api/heartbeat
- Usage: http://localhost:8787/api/usage

## Database Management

The local SQLite database is stored at `./local.db`. You can:

- **View the database**: Use any SQLite browser like [DB Browser for SQLite](https://sqlitebrowser.org/)
- **Reset the database**: Delete `local.db` (and `local.db-wal`, `local.db-shm`) and run `./run.sh` again
- **Backup the database**: 
  ```bash
  # Perform checkpoint first to consolidate WAL changes
  sqlite3 local.db "PRAGMA wal_checkpoint(TRUNCATE);"
  # Then copy the database
  cp local.db local.db.backup
  ```

### WAL Files

When WAL mode is enabled, you'll see additional files:
- `local.db` - Main database file
- `local.db-wal` - Write-Ahead Log file (temporary changes)
- `local.db-shm` - Shared memory file (for coordination)

These files are automatically managed and should not be deleted while the server is running.

## Troubleshooting

### Migration Errors

If you get migration errors, try:

```bash
# Delete the local database and start fresh
rm local.db local.db-wal local.db-shm
./run.sh
```

### WAL File Growing Large

The server automatically checkpoints the WAL file when it exceeds 10MB. If you notice the WAL file growing excessively:

```bash
# Manually trigger a checkpoint
sqlite3 local.db "PRAGMA wal_checkpoint(RESTART);"
```

Or adjust the checkpoint threshold in `src/local.ts`:

```typescript
// Change this value (currently 10MB)
if (stats.size > 10 * 1024 * 1024) {
```

### Database Locked Errors

If you see "database is locked" errors:
- The busy timeout is set to 5 seconds by default
- Multiple processes accessing the same database can cause locks
- Close other SQLite connections to the database
- WAL mode generally handles concurrent access well

### Port Already in Use

If port 8787 is already in use, you can change it in `src/local.ts`:

```typescript
const port = 8787;  // Change this to your desired port
```

### Dependencies Not Found

Make sure all dependencies are installed:

```bash
bun install
```

### Changing SQLite Configuration

To modify SQLite settings, edit the pragma statements in `src/local.ts`:

```typescript
// Example: Increase cache size to 128MB
sqlite.pragma('cache_size = -128000');

// Example: Use FULL synchronous mode for maximum durability
sqlite.pragma('synchronous = FULL');
```

## Contributing

When developing locally, remember that:
- The local setup uses SQLite, which has some differences from D1
- Always test in a Cloudflare Workers environment before deploying
- Use `bun run dev` (wrangler) for testing Worker-specific features
