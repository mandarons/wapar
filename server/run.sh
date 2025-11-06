#!/bin/bash

# run.sh - Script to run the WAPAR server locally with SQLite
# This script sets up a local SQLite database and starts the Hono server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WAPAR Local Server Setup & Run      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: This script must be run from the server/ directory${NC}"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Error: bun is not installed${NC}"
    echo -e "Please install bun from https://bun.sh/"
    exit 1
fi

echo -e "${YELLOW}⚙  Step 1: Installing dependencies...${NC}"
bun install

echo -e "\n${YELLOW}⚙  Step 2: Checking for local database...${NC}"
if [ ! -f "local.db" ]; then
    echo -e "${BLUE}→ Creating new local.db database${NC}"
else
    echo -e "${GREEN}✓ Database file local.db already exists${NC}"
fi

echo -e "\n${YELLOW}⚙  Step 3: Applying database migrations...${NC}"
# Apply migrations using drizzle-kit
if ! bun run db:push; then
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Migrations applied successfully${NC}"

echo -e "\n${YELLOW}⚙  Step 4: Starting local server...${NC}"
echo -e "${BLUE}→ Server will run on http://localhost:8787${NC}"
echo -e "${BLUE}→ Database: ./local.db${NC}"
echo -e "${BLUE}→ Using Bun's native SQLite (production-optimized)${NC}\n"

# Start the server using bun run
bun run dev:local
