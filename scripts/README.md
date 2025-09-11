# WAPAR Database Migration Script

This script migrates data from the PostgreSQL database (server/) to the Cloudflare D1 database (workers-app/).

## Prerequisites

1. **PostgreSQL Database**: Ensure your PostgreSQL database is running and accessible
2. **Cloudflare Workers**: Ensure you have wrangler CLI installed and configured
3. **Node.js**: Node.js 16+ with npm/yarn
4. **Dependencies**: Install required dependencies

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Set up environment variables (optional):
```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=wapardev
export POSTGRES_USER=waparuser
export POSTGRES_PASSWORD=wapar-user
```

## Usage

### Basic Migration

```bash
cd scripts
npm run migrate
```

### Environment Variables

The script uses the following environment variables with defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `wapardev` | PostgreSQL database name |
| `POSTGRES_USER` | `waparuser` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `wapar-user` | PostgreSQL password |

### Direct Execution

You can also run the script directly:

```bash
ts-node migrate-to-d1.ts
```

## What the Script Does

1. **Connects to PostgreSQL**: Establishes connection to the source database
2. **Extracts Data**: Retrieves all non-deleted records from:
   - `Installation` table
   - `Heartbeat` table
3. **Transforms Data**: Converts PostgreSQL data types to D1-compatible formats:
   - UUID fields remain as text
   - JSONB fields are converted to JSON strings
   - INET fields are converted to text
   - Timestamps are formatted for SQLite
4. **Generates SQL**: Creates INSERT statements for D1 database
5. **Populates D1**: Executes the migration using `wrangler d1 execute`
6. **Verifies Migration**: Counts records to ensure successful migration

## Data Transformation

### Installation Table Mapping

| PostgreSQL | D1 (SQLite) | Notes |
|------------|-------------|-------|
| `id` (UUID) | `id` (TEXT) | Primary key |
| `app_name` (VARCHAR) | `app_name` (TEXT) | Application name |
| `app_version` (VARCHAR) | `app_version` (TEXT) | Application version |
| `ip_address` (INET) | `ip_address` (TEXT) | IP address as text |
| `previous_id` (UUID) | `previous_id` (TEXT) | Previous installation ID |
| `data` (JSONB) | `data` (TEXT) | JSON data as string |
| `country_code` (VARCHAR) | `country_code` (TEXT) | Country code |
| `region` (VARCHAR) | `region` (TEXT) | Region name |
| `created_at` (TIMESTAMP) | `created_at` (TEXT) | ISO datetime string |
| `updated_at` (TIMESTAMP) | `updated_at` (TEXT) | ISO datetime string |

### Heartbeat Table Mapping

| PostgreSQL | D1 (SQLite) | Notes |
|------------|-------------|-------|
| `id` (UUID) | `id` (TEXT) | Primary key |
| `installation_id` (UUID) | `installation_id` (TEXT) | Foreign key to Installation |
| `data` (JSONB) | `data` (TEXT) | JSON data as string |
| `created_at` (TIMESTAMP) | `created_at` (TEXT) | ISO datetime string |
| `updated_at` (TIMESTAMP) | `updated_at` (TEXT) | ISO datetime string |

## Important Notes

1. **Soft Deletes**: Only migrates records where `deleted_at IS NULL`
2. **Local D1**: Uses `--local` flag for wrangler commands (local development)
3. **Data Integrity**: Maintains referential integrity between installations and heartbeats
4. **Cleanup**: Automatically removes temporary SQL files after execution
5. **Error Handling**: Comprehensive error handling with descriptive messages

## Troubleshooting

### PostgreSQL Connection Issues

- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check credentials and database existence
- Ensure network connectivity

### Wrangler Issues

- Verify wrangler is installed: `npx wrangler --version`
- Check D1 database configuration in `workers-app/wrangler.toml`
- Ensure you're authenticated: `npx wrangler auth login`

### Migration Verification

The script automatically verifies the migration by counting records. If counts don't match:

1. Check for errors in the migration log
2. Verify D1 database schema matches expectations
3. Check for data transformation issues

## Production Deployment

For production deployment, modify the wrangler command in the script:

```typescript
// Remove --local flag for production
const command = `npx wrangler d1 execute wapar-db --file=migration-data.sql`;
```

## Security Considerations

- Store database credentials securely (use environment variables)
- Review generated SQL before execution in production
- Test migration on a copy of production data first
- Backup existing D1 data before migration

## Support

For issues or questions, refer to:
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
