#!/bin/bash

# Setup script for staging environment
# Run this script to initialize the staging D1 database and update wrangler.toml

set -e

echo "🚀 Setting up staging environment for WAPAR"
echo ""

# Check if wrangler is available
if ! command -v bunx &> /dev/null; then
    echo "❌ Error: bun is not installed. Please install bun first."
    exit 1
fi

cd "$(dirname "$0")/../server"

echo "📦 Creating staging D1 database..."
echo ""

# Create the staging database and capture output
OUTPUT=$(bunx wrangler d1 create wapar-db-staging 2>&1)
echo "$OUTPUT"
echo ""

# Extract the database ID from the output
# The output format is:
# ✅ Successfully created DB 'wapar-db-staging'!
# 
# [[d1_databases]]
# binding = "DB" # i.e. available in your Worker on env.DB
# database_name = "wapar-db-staging"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

DATABASE_ID=$(echo "$OUTPUT" | grep -oP 'database_id = "\K[^"]+' || true)

if [ -z "$DATABASE_ID" ]; then
    echo "❌ Error: Could not extract database ID from output."
    echo "Please manually copy the database_id from the output above and update wrangler.toml"
    exit 1
fi

echo "✅ Database created with ID: $DATABASE_ID"
echo ""

# Update wrangler.toml with the actual database ID
echo "📝 Updating wrangler.toml with staging database ID..."

# Use sed to replace the placeholder
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/database_id = \"STAGING_DB_ID_PLACEHOLDER\"/database_id = \"$DATABASE_ID\"/" wrangler.toml
else
    # Linux
    sed -i "s/database_id = \"STAGING_DB_ID_PLACEHOLDER\"/database_id = \"$DATABASE_ID\"/" wrangler.toml
fi

echo "✅ wrangler.toml updated"
echo ""

# Deploy schema to staging database
echo "📊 Deploying schema to staging database..."
bunx wrangler d1 execute wapar-db-staging --remote --file=./schema.sql

echo ""
echo "✅ Staging environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Commit the updated wrangler.toml file"
echo "2. Configure GitHub secrets (see ENVIRONMENTS.md)"
echo "3. Create a pull request to test the staging deployment"
echo ""
