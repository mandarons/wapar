#!/bin/sh
set -e

# Database path from environment or default
DB_PATH="${DB_PATH:-/data/local.db}"

echo "🔧 Initializing WAPAR server..."
echo "📂 Database path: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "📊 Database not found, initializing..."
    
    # Create database directory if it doesn't exist
    mkdir -p "$(dirname "$DB_PATH")"
    
    echo "🔄 Applying Drizzle migrations..."
    bun run db:push
    
    echo "✅ Database initialized successfully"
else
    echo "✅ Database already exists"
    echo "🔄 Ensuring schema is up to date..."
    bun run db:push
fi

echo "🚀 Starting WAPAR server..."
exec "$@"
