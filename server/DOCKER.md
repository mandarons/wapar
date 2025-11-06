# Docker Deployment Guide

Production-ready Docker deployment for the WAPAR server using Alpine Linux, multi-stage builds, and security best practices.

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- docker-compose (optional, but recommended)

**⚠️ Note for Dev Containers**: If you're in a dev container environment without Docker, build and test on a host system with Docker installed.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

### Using Docker CLI

```bash
# Build the image
docker build -t wapar-server:latest .

# Run the container
docker run -d \
  --name wapar-server \
  -p 8787:8787 \
  -v wapar-data:/data \
  --restart unless-stopped \
  wapar-server:latest

# View logs
docker logs -f wapar-server
```

## Architecture

### Multi-Stage Build

The Dockerfile uses a 4-stage build process:

1. **base**: Install Bun runtime and system dependencies
2. **deps**: Install production dependencies (used for layer caching)
3. **build**: Install all dependencies and verify migrations
4. **production**: Runtime image with all dependencies (needed for drizzle-kit)

### Image Optimization

- **Base Image**: `oven/bun:1.1.38-alpine` (minimal Alpine Linux)
- **Runtime**: Bun's native HTTP server (no Node.js adapters needed)
- **Size**: ~120MB final image (includes drizzle-kit for migrations)
- **Layers**: Optimized caching for faster rebuilds
- **Security**: Runs as non-root user (UID 1001)

**Note**: All node_modules (including devDependencies) are included to support automatic database migrations via drizzle-kit.

### File Structure

```
/app/
├── node_modules/           # All dependencies (includes drizzle-kit)
│   ├── drizzle-kit/       # Schema migration tool
│   ├── @libsql/client/    # SQLite driver for drizzle-kit (pure JS)
│   ├── esbuild/           # Required by drizzle-kit
│   └── ...
├── src/                    # Application source
├── drizzle/                # Generated migration files
├── drizzle.config.ts       # Drizzle configuration (uses DB_PATH env var)
├── docker-entrypoint.sh    # Initialization script
├── package.json            # Package manifest
└── tsconfig.json           # TypeScript configuration

/data/
└── local.db                # SQLite database (persistent volume)
```

**Note**: All node_modules are included (not just production) to enable automatic schema synchronization. The runtime uses Bun's native SQLite (`bun:sqlite`) while drizzle-kit migrations use `@libsql/client` (pure JavaScript, no native compilation needed).

## Configuration

### Environment Variables

Configure the server via environment variables:

```bash
NODE_ENV=production           # Environment (production/development)
PORT=8787                     # Server port
DB_PATH=/data/local.db        # SQLite database path
ACTIVITY_THRESHOLD_DAYS=3     # Days to consider installation active
```

### Docker Compose Configuration

Edit `docker-compose.yml` to customize:

```yaml
environment:
  - NODE_ENV=production
  - PORT=8787
  - DB_PATH=/data/local.db
  - ACTIVITY_THRESHOLD_DAYS=3

ports:
  - "8787:8787"  # Change host port if needed

volumes:
  - wapar-data:/data  # Persistent database storage
```

### Resource Limits

Adjust resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'       # Maximum CPU cores
      memory: 512M    # Maximum memory
    reservations:
      cpus: '0.5'     # Reserved CPU cores
      memory: 256M    # Reserved memory
```

## Security Features

### Non-Root User

The container runs as user `appuser` (UID 1001) for security:

```dockerfile
RUN addgroup -g 1001 -S appuser && \
    adduser -S -u 1001 -G appuser appuser
USER appuser
```

### Filesystem Security

The container uses several security measures:

- **Non-root user**: All processes run as UID 1001
- **Writable volumes**: Only `/data` (database) and `/tmp` (temporary files) are writable
- **Minimal permissions**: Application files are owned by appuser
- **No shell access**: Alpine minimal base with no unnecessary tools

**Note**: We don't use `read_only: true` for the root filesystem because SQLite requires write access to the database directory for WAL (Write-Ahead Logging) files. Instead, we restrict write access to only necessary directories.

### Minimal Dependencies

- Production dependencies only (`bun install --production`)
- No development tools or test files
- Minimal Alpine Linux base

## Database Management

### Persistent Storage

SQLite database is stored in a Docker volume:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect wapar-data

# Backup database
docker run --rm -v wapar-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/wapar-db-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore database
docker run --rm -v wapar-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/wapar-db-backup-20241106.tar.gz -C /data
```

### Database Initialization

The database is automatically initialized on first container start using **Drizzle migrations**:

1. **Check for existing database**: If `/data/local.db` exists, apply any pending schema changes
2. **Apply migrations**: Run `bun run db:push` to sync schema from `src/db/schema.ts`
3. **Start server**: Once schema is up to date, the server starts normally

**First Run:**
```bash
docker-compose up -d
# Output: 📊 Database not found, initializing...
#         🔄 Applying Drizzle migrations...
#         ✅ Database initialized successfully
#         🚀 Starting WAPAR server...
```

**Subsequent Runs:**
```bash
docker-compose restart
# Output: ✅ Database already exists
#         � Ensuring schema is up to date...
#         �🚀 Starting WAPAR server...
```

### Schema Management

Database schema is defined in `src/db/schema.ts` and managed via Drizzle ORM:

- **Automatic sync**: Schema changes are applied automatically on container start
- **Zero downtime**: Drizzle's push command handles migrations safely
- **Type-safe**: Schema changes are validated at compile time

**Manual migration:**
```bash
# Apply schema changes manually
docker exec -it wapar-server bun run db:push

# Generate migration files (development)
docker exec -it wapar-server bun run db:generate
```

```bash
# Verify migrations
docker exec wapar-server bun run db:generate --check

# View migration status
docker exec wapar-server ls -la drizzle/
```

## Monitoring

### Health Checks

Built-in health check verifies server responsiveness:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' wapar-server

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' wapar-server
```

Health check configuration:
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3
- **Start Period**: 5 seconds

### Logs

```bash
# View logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100

# Filter by time
docker-compose logs --since=1h
```

### Metrics

Access server metrics:

```bash
# Installation statistics
curl http://localhost:8787/api/installation-stats

# Usage analytics
curl http://localhost:8787/api/usage

# Version analytics
curl http://localhost:8787/api/version-analytics
```

## Production Deployment

### 1. Build the Image

```bash
# Build with BuildKit for better caching
DOCKER_BUILDKIT=1 docker build -t wapar-server:latest .

# Build with specific tag
docker build -t wapar-server:v1.0.0 .
```

### 2. Tag for Registry

```bash
# Tag for Docker Hub
docker tag wapar-server:latest yourusername/wapar-server:latest

# Tag for private registry
docker tag wapar-server:latest registry.example.com/wapar-server:latest
```

### 3. Push to Registry

```bash
# Push to Docker Hub
docker push yourusername/wapar-server:latest

# Push to private registry
docker push registry.example.com/wapar-server:latest
```

### 4. Deploy to Production

```bash
# Pull latest image
docker pull yourusername/wapar-server:latest

# Start with docker-compose
docker-compose up -d

# Or use orchestration (Kubernetes, Docker Swarm)
kubectl apply -f k8s-deployment.yaml
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs wapar-server

# Check container status
docker ps -a | grep wapar-server

# Inspect container
docker inspect wapar-server
```

### Database Issues

```bash
# Check database file
docker exec wapar-server ls -la /data/

# Verify database permissions
docker exec wapar-server stat /data/local.db

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Performance Issues

```bash
# Check resource usage
docker stats wapar-server

# Increase resource limits in docker-compose.yml
# See "Resource Limits" section above
```

## Development

### Local Development with Docker

```bash
# Build development image (includes test dependencies)
docker build --target build -t wapar-server:dev .

# Run with volume mount for hot-reload
docker run -it --rm \
  -p 8787:8787 \
  -v $(pwd)/src:/app/src \
  wapar-server:dev \
  bun run dev
```

### Run Tests in Container

```bash
# Build with test dependencies
docker build --target build -t wapar-server:test .

# Run tests
docker run --rm wapar-server:test bun test

# Run with coverage
docker run --rm wapar-server:test bun test --coverage
```

## Best Practices

### Image Size Optimization

✅ **Multi-stage builds**: Separate build and runtime dependencies  
✅ **Alpine Linux**: Minimal base image (~5MB vs ~100MB+ for Debian)  
✅ **Layer caching**: Dependencies before source code  
✅ **Production deps only**: `bun install --production`  
✅ **.dockerignore**: Exclude unnecessary files

### Security

✅ **Non-root user**: Runs as UID 1001  
✅ **Read-only filesystem**: Prevents tampering  
✅ **Minimal attack surface**: Only necessary packages  
✅ **Health checks**: Early detection of issues  
✅ **Resource limits**: Prevent DoS

### Reliability

✅ **Restart policy**: `unless-stopped`  
✅ **Health checks**: Automatic recovery  
✅ **Persistent volumes**: Database survives restarts  
✅ **Graceful shutdown**: Proper signal handling

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./server
          push: true
          tags: |
            yourusername/wapar-server:latest
            yourusername/wapar-server:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Support

For issues or questions:
- See [server/README.md](./README.md) for application documentation
- See [server/docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) for development setup
- Check container logs: `docker-compose logs -f`
- Verify health: `docker inspect --format='{{.State.Health.Status}}' wapar-server`
