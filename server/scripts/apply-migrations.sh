#!/bin/bash
# Script to apply pending migrations to production D1 database
# This fixes the missing last_heartbeat_at column error

set -e

echo "=================================================="
echo "Applying pending migrations to production database"
echo "=================================================="
echo ""

cd "$(dirname "$0")/.."

echo "Checking pending migrations..."
bunx wrangler d1 migrations list wapar-db --remote

echo ""
echo "Applying migrations..."
bunx wrangler d1 migrations apply wapar-db --remote

echo ""
echo "✅ Migrations applied successfully!"
echo ""
echo "Verifying the fix..."
bunx wrangler d1 execute wapar-db --remote --command="SELECT sql FROM sqlite_master WHERE name='Installation' AND type='table';"

echo ""
echo "=================================================="
echo "✅ Fix complete! The last_heartbeat_at column should now exist."
echo "=================================================="
