# WAPAR - Web Application Performance Analytics and Reporting

![License](https://img.shields.io/badge/license-MIT-blue.svg)

WAPAR is a **serverless application analytics platform** that tracks installation metrics, user engagement, and geographic distribution for web applications. Built on Cloudflare Workers with D1 database, it provides real-time insights into active users, version adoption, and global reach.

## 🌟 Key Features

- **Active Installation Tracking**: Distinguish between active and stale installations based on heartbeat activity
- **Geographic Analytics**: Real-time country and region distribution using Cloudflare's built-in geo data
- **Version Analytics**: Track version adoption rates and identify outdated installations
- **Engagement Metrics**: Monitor daily, weekly, and monthly active users (DAU/WAU/MAU)
- **Interactive Dashboard**: Visualize data with maps, charts, and real-time metrics
- **Serverless Architecture**: Fully serverless on Cloudflare platform (Workers + D1 + Pages)

## 📊 Active vs Stale Installations

WAPAR introduces a sophisticated installation tracking system that differentiates between active and stale installations:

### Definitions

- **Active Installation**: An installation that has sent a heartbeat within the configured activity threshold (default: 3 days)
- **Stale Installation**: An installation that either:
  - Has never sent a heartbeat, OR
  - Has not sent a heartbeat within the activity threshold period
- **Total Installations**: All installations ever created (active + stale)

### How It Works

1. **Installation Registration**: When an application is first installed, a unique installation ID is generated
2. **Heartbeat Updates**: The application sends periodic heartbeats to indicate it's still active
3. **Activity Tracking**: Each heartbeat updates the `lastHeartbeatAt` timestamp on the installation record
4. **Active/Stale Classification**: Installations are classified based on when they last sent a heartbeat

### Default Threshold

- **Default**: 3 days
- Installations with a heartbeat within the last 3 days are considered "active"
- This threshold is configurable via the `ACTIVITY_THRESHOLD_DAYS` environment variable

### Configuration

To customize the activity threshold, set the `ACTIVITY_THRESHOLD_DAYS` environment variable in your `wrangler.toml`:

```toml
[vars]
ACTIVITY_THRESHOLD_DAYS = "7"  # 7 days instead of default 3
```

Or for specific environments:

```toml
[env.production.vars]
ACTIVITY_THRESHOLD_DAYS = "5"  # 5 days for production
```

## 🏗️ Architecture

WAPAR consists of three main components:

### 1. Backend API (`server/`)
- **Framework**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Testing**: Vitest with in-process worker testing

Key endpoints:
- `POST /api/installation` - Register new installations
- `POST /api/heartbeat` - Record heartbeat activity
- `GET /api/usage` - Get usage analytics with active/stale/total metrics
- `GET /api/installation-stats` - Comprehensive installation statistics
- `GET /api/version-analytics` - Version distribution and upgrade rates
- `GET /api/heartbeat-analytics` - User engagement metrics

### 2. Frontend Dashboard (`app/`)
- **Framework**: SvelteKit
- **Styling**: Tailwind CSS + Skeleton UI
- **Deployment**: Cloudflare Pages
- **Testing**: Vitest + Playwright

Features:
- Overview tab with active/stale/total installation counts
- Interactive world map showing geographic distribution (active installations only)
- Version analytics with adoption rates (active installations only)
- Engagement metrics and churn analysis
- Recent installations feed

### 3. Migration Scripts (`scripts/`)
- PostgreSQL to D1 migration utilities
- Data transformation and validation tools

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (required - not npm/yarn/pnpm)
- Node.js 20+
- Cloudflare account with Workers and D1 enabled

### Backend Setup

```bash
cd server

# Install dependencies
bun install

# Create D1 database and apply schema
bunx wrangler d1 execute wapar-db --file=./schema.sql

# Run locally
bun run dev

# Deploy to production
bun run deploy
```

The backend will be available at `http://localhost:8787`

### Frontend Setup

```bash
cd app

# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun build
```

The frontend will be available at `http://localhost:5173`

## 📖 API Documentation

### Installation Stats Endpoint

Returns comprehensive statistics about active and stale installations.

**Endpoint**: `GET /api/installation-stats`

**Response**:
```json
{
  "totalInstallations": 100,
  "activeInstallations": 75,
  "staleInstallations": 25,
  "activityThresholdDays": 3,
  "cutoffDate": "2025-10-30T00:00:00.000Z",
  "activeVersionDistribution": [
    {
      "version": "2.0.0",
      "count": 50,
      "percentage": 66.67
    }
  ],
  "activeCountryDistribution": [
    {
      "countryCode": "US",
      "count": 40
    }
  ]
}
```

**Key Points**:
- Version and country distributions include **only active installations**
- `staleInstallations` is calculated as `totalInstallations - activeInstallations`
- `cutoffDate` shows the exact timestamp used for active/stale classification

### Usage Endpoint

Returns usage analytics including active installation metrics.

**Endpoint**: `GET /api/usage`

**Response**:
```json
{
  "totalInstallations": 100,
  "activeInstallations": 75,
  "staleInstallations": 25,
  "monthlyActive": 80,
  "activityThresholdDays": 3,
  "createdAt": "Sun, 02 Nov 2025 23:48:36 GMT",
  "countryToCount": [
    {
      "countryCode": "US",
      "count": 40
    }
  ],
  "iCloudDocker": {
    "total": 60
  },
  "haBouncie": {
    "total": 15
  }
}
```

**Key Points**:
- `countryToCount` now includes **only active installations**
- New fields: `activeInstallations`, `staleInstallations`, `activityThresholdDays`
- `monthlyActive` shows unique installations that sent heartbeats in the last 30 days

### Heartbeat Endpoint

Updates the `lastHeartbeatAt` timestamp for an installation.

**Endpoint**: `POST /api/heartbeat`

**Request**:
```json
{
  "installationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**:
```json
{
  "id": "heartbeat-id",
  "installationId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-11-03T04:10:00.000Z"
}
```

**Behavior**:
- Updates `lastHeartbeatAt` on the Installation record
- Creates a Heartbeat record for historical tracking
- Only allows one heartbeat per installation per day
- Automatically transitions stale installations to active status

## 🎨 Dashboard Metrics

### Overview Tab

Displays three primary metrics with clear definitions:

1. **Active Installations** (Primary Metric)
   - Count of installations with heartbeat within threshold
   - Subtitle: "Heartbeat within last X days"
   - Green/primary visual emphasis

2. **Total Installations**
   - All-time installation count
   - Subtitle: "All time" or "Since [date]"
   - Secondary visual style

3. **Stale Installations**
   - Installations without recent heartbeat
   - Subtitle: "No heartbeat in X+ days"
   - Warning visual style if >25% of total

### Geographic Tab

- **World Map**: Shows active installations only
- **Country Distribution**: Top countries by active installation count
- **Filtering**: All geographic data filtered to active installations

### Versions Tab

- **Version Distribution**: Shows only active installations
- **Upgrade Rate**: Tracks version updates over time
- **Outdated Count**: Active installations not on latest version

## 🧪 Testing

### Backend Tests

```bash
cd server
bun test
```

Tests use in-process worker testing with real D1 database:
- Active/stale/total counting logic
- Heartbeat updates and `lastHeartbeatAt` tracking
- API endpoint responses and filtering
- Edge cases (null heartbeats, threshold boundaries)

### Frontend Tests

```bash
cd app
bun test        # Unit tests
bun test:e2e    # End-to-end tests
```

Tests verify:
- Active/stale metrics display correctly
- Dashboard updates with new data
- Accessibility compliance
- Geographic map rendering

## 📁 Project Structure

```
wapar/
├── server/              # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── db/          # Database schema and client
│   │   └── utils/       # Utilities (including active-installations.ts)
│   ├── tests/           # Vitest tests
│   ├── schema.sql       # D1 database schema
│   └── wrangler.toml    # Workers configuration
├── app/                 # SvelteKit frontend
│   ├── src/
│   │   ├── routes/      # Pages
│   │   ├── lib/         # Components and utilities
│   │   └── tests/       # Tests
│   └── docs/            # Feature documentation
├── scripts/             # Migration utilities
└── docs/                # Project documentation
```

## 🔧 Configuration

### Environment Variables

**Backend** (`wrangler.toml`):
- `ACTIVITY_THRESHOLD_DAYS`: Activity threshold in days (default: 3)
- `DRIZZLE_LOG`: Enable Drizzle ORM logging (default: "false")
- `ENABLE_TEST_ROUTES`: Enable test-only routes (dev only)

**Frontend** (environment):
- `PUBLIC_API_URL`: API base URL for staging environments

### Database Schema

Key tables:
- **Installation**: Stores installation records with `lastHeartbeatAt` timestamp
- **Heartbeat**: Historical record of all heartbeat events

Indexes optimized for:
- Active installation queries (`idx_installation_last_heartbeat_at`)
- Geographic distribution (`idx_installation_country_code`)
- Version analytics (`idx_installation_app_version`)

## 🔄 Migration from Legacy System

Existing installations will have `lastHeartbeatAt = null` initially:
- They are considered "stale" until they send their next heartbeat
- When they send a heartbeat, they transition to "active" status
- After one activity threshold period (default 3 days), metrics stabilize

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development workflow
- Code style guidelines
- Testing requirements
- UI/UX standards
- Accessibility requirements

Key points:
- Use **Bun** (not npm/yarn/pnpm)
- Follow design tokens from `tailwind.config.ts`
- Ensure WCAG AA accessibility compliance
- Add tests for new features
- Update documentation

## 📚 Additional Documentation

- [Backend API Documentation](./server/README.md) - Detailed API reference
- [Active Installations Technical Spec](./server/ACTIVE_INSTALLATIONS.md) - Implementation details
- [Frontend Documentation](./app/README.md) - SvelteKit app guide
- [UX Guidelines](./docs/UX_GUIDELINES.md) - Design system and accessibility
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/) and [D1](https://developers.cloudflare.com/d1/)
- UI powered by [SvelteKit](https://kit.svelte.dev/) and [Skeleton UI](https://www.skeleton.dev/)
- Geographic visualization using [svgmap](https://github.com/StephanWagner/svgMap)

---

**Note**: This project tracks installations for iCloud Docker and HA Bouncie integrations, with real-time geographic data provided by Cloudflare's request metadata.
