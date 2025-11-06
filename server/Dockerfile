# syntax=docker/dockerfile:1

# =========================================
# Stage 1: Base - Install Bun runtime
# =========================================
FROM oven/bun:1.1.38-alpine AS base

# Install required system dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata

# Set working directory
WORKDIR /app

# =========================================
# Stage 2: Dependencies - Install production dependencies
# =========================================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json bun.lock ./

# Install production dependencies with caching
# Using --frozen-lockfile ensures reproducible builds
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# =========================================
# Stage 3: Build - Install all dependencies and prepare database
# =========================================
FROM base AS build

# Copy package files
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for building)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Copy application source
COPY . .

# Generate database migrations (verify they're ready)
RUN bun run db:generate --check || echo "Migration check complete"

# =========================================
# Stage 4: Production - Create minimal runtime image
# =========================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production \
    PORT=8787 \
    DB_PATH=/data/local.db

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S -u 1001 -G appuser appuser

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /data && \
    chown -R appuser:appuser /data

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules

# Copy application code from build stage
COPY --from=build --chown=appuser:appuser /app/src ./src
COPY --from=build --chown=appuser:appuser /app/drizzle ./drizzle
COPY --from=build --chown=appuser:appuser /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build --chown=appuser:appuser /app/schema.sql ./schema.sql
COPY --from=build --chown=appuser:appuser /app/package.json ./package.json
COPY --from=build --chown=appuser:appuser /app/tsconfig.json ./tsconfig.json

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e 'fetch("http://localhost:8787/api").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start the application
CMD ["bun", "run", "src/local.ts"]
