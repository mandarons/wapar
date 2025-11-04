#!/bin/bash
# Script to fix migration state by marking existing migrations as applied
# This is needed when the database was created from schema.sql instead of migrations

set -e

echo "=================================================="
echo "Fixing migration state in production database"
echo "=================================================="
echo ""

cd "$(dirname "$0")/.."

echo "This script will mark migrations 0000 and 0001 as already applied."
echo "Then it will apply migration 0002 which adds the last_heartbeat_at column."
echo ""

# Check current database structure
echo "Checking current database structure..."
bunx wrangler d1 execute wapar-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "Checking if d1_migrations table exists..."
bunx wrangler d1 execute wapar-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations';"

echo ""
echo "Manually marking migrations 0000 and 0001 as applied..."

# Mark first two migrations as applied
bunx wrangler d1 execute wapar-db --remote --command="
CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0000_ambiguous_callisto.sql');
INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_add_previousid_index.sql');
"

echo ""
echo "Checking migration status..."
bunx wrangler d1 migrations list wapar-db --remote

echo ""
echo "Now applying remaining migration (0002)..."
bunx wrangler d1 migrations apply wapar-db --remote

echo ""
echo "✅ Migration state fixed!"
echo ""
echo "Verifying the last_heartbeat_at column exists..."
bunx wrangler d1 execute wapar-db --remote --command="PRAGMA table_info(Installation);"

echo ""
echo "=================================================="
echo "✅ Fix complete!"
echo "=================================================="
