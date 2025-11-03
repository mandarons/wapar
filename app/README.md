# WAPAR Dashboard - SvelteKit Frontend

A modern, accessible dashboard for visualizing application installation analytics, engagement metrics, and geographic distribution.

## Features

### Active Installation Tracking

The dashboard prominently displays three key metrics with clear visual hierarchy:

1. **Active Installations** (Primary Metric)
   - Installations with heartbeat within configured threshold (default: 3 days)
   - Displayed with primary emphasis (larger, highlighted)
   - Subtitle: "Heartbeat within last X days"
   - Represents current active user base

2. **Total Installations**
   - All-time installation count (active + stale)
   - Secondary visual style
   - Subtitle: "All time" or "Since [date]"
   - Historical reference metric

3. **Stale Installations**
   - Installations without recent heartbeat
   - Warning visual style if >25% of total
   - Subtitle: "No heartbeat in X+ days"
   - Indicates potential churn or retention issues

**Visual Indicators:**
- Stale percentage >25% shows warning styling
- Tooltips explain each metric's meaning
- Metrics update in real-time when data refreshes

### Dashboard Tabs

**Overview Tab**
- Active/stale/total installation counts
- Summary statistics and recent growth
- Quick insights and trend descriptions

**Distribution Tab**
- Market share comparison between supported integrations (iCloud Docker, HA Bouncie)
- Interactive pie/doughnut/bar charts
- Export chart functionality

**Geography Tab**
- Interactive world map showing **active installations only**
- Top 10 countries by active installation count
- Country details modal with ranking and percentages
- Accessible data table toggle for screen readers

**Versions Tab**
- Version distribution for **active installations only**
- Latest version identification
- Outdated installation counts
- Upgrade rate metrics (7-day and 30-day)

**Active Usage Tab** (Heartbeat Analytics)
- DAU/WAU/MAU metrics
- Engagement levels breakdown
- Timeline visualization
- Churn risk indicators

**Recent Installs Tab**
- Latest installation activity feed
- 24-hour and 7-day installation counts

**Insights Tab**
- Supplementary geographic analysis
- Proportional estimates and trends

### Accessibility Features

- **WCAG AA Compliant**: All UI meets accessibility standards
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Focus Indicators**: Visible focus states on all focusable elements
- **Color Contrast**: AA-compliant color ratios throughout
- **Alternative Data Views**: Data table toggle for map visualization

## Project Structure

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

### Prerequisites

- **Bun** (not npm/yarn/pnpm) - [Installation Guide](https://bun.sh/docs/installation)
- Node.js 20+

### Setup

Once you've created a project and installed dependencies with `bun install`, start a development server:

```bash
bun dev

# or start the server and open the app in a new browser tab
bun dev -- --open
```

### Environment Variables

**Optional:**
- `PUBLIC_API_URL`: Override the API base URL (defaults to production: `https://wapar-api.mandarons.com`)

**Example `.env` file for local development:**
```env
PUBLIC_API_URL=http://localhost:8787
```

This allows the frontend to connect to a local backend instance during development.

## Data Flow

### Server-Side Data Loading

The dashboard uses SvelteKit's `+page.server.ts` to fetch data from multiple sources:

1. **Primary WAPAR API** (`/api/usage`)
   - Active/stale/total installation metrics
   - Monthly active users
   - Country distribution (active installations only)
   - Activity threshold configuration

2. **Version Analytics** (`/api/version-analytics`)
   - Version distribution (active installations only)
   - Latest version identification
   - Outdated installation counts
   - Upgrade rates

3. **Recent Installations** (`/api/recent-installations`)
   - Latest installation records
   - 24-hour and 7-day counts

4. **Heartbeat Analytics** (`/api/heartbeat-analytics`)
   - DAU/WAU/MAU metrics
   - Engagement level breakdown
   - Churn risk analysis

5. **External Home Assistant Analytics**
   - HA Bouncie installation counts
   - Used for distribution comparison

### Active/Stale Metric Handling

The frontend gracefully handles both new and legacy API responses.

**From `src/routes/+page.server.ts`:**

```typescript
// Ensure we have required fields with defaults if API didn't provide them
if (typeof data.activeInstallations === 'undefined' || 
    typeof data.staleInstallations === 'undefined') {
  console.warn('activeInstallations or staleInstallations missing from API response');
  // Estimate: Assume 10% of installations are stale if not provided
  const estimatedStale = Math.round(data.totalInstallations * 0.1);
  data.activeInstallations = data.totalInstallations - estimatedStale;
  data.staleInstallations = estimatedStale;
}
if (typeof data.activityThresholdDays === 'undefined') {
  data.activityThresholdDays = 3; // Default threshold
}
```

### Utility Functions

**`buildOverviewMetrics`** (`lib/utils/overview.ts`)
- Formats active/stale/total metrics for display
- Generates subtitles with threshold information
- Handles primary metric emphasis

**`describeUpdate`** (`lib/utils/overview.ts`)
- Creates human-readable summary of current state
- Includes active count, total count, and country coverage
- Formats recent installation growth

## Key Components

### Overview Metrics Display

Located in `+page.svelte`, the overview metrics are built using the `buildOverviewMetrics` utility:

```typescript
$: overviewMetrics = buildOverviewMetrics({
  totalInstallations: data.totalInstallations,
  activeInstallations: data.activeInstallations,
  staleInstallations: data.staleInstallations,
  iCloudDockerTotal: data.iCloudDocker.total,
  haBouncieTotal: data.haBouncie.total,
  activityThresholdDays: data.activityThresholdDays,
  createdAt: data.createdAt
});
```

Each metric includes:
- Label (e.g., "Active installations")
- Formatted value (e.g., "750")
- Test ID for automated testing
- Optional subtitle explaining the metric
- Primary flag for visual emphasis

### Stale Installation Warning

The dashboard shows a visual warning when stale installations exceed 25%:

```typescript
$: stalePercentage = data.totalInstallations > 0 
  ? (data.staleInstallations / data.totalInstallations) * 100 
  : 0;
$: isHighStale = stalePercentage > 25;
```

This helps identify potential user retention issues.

## Building

To create a production version of your app:

```bash
bun run build
```

You can preview the production build with `bun run preview`.

**Deployment:**
The app is configured for Cloudflare Pages deployment using the `@sveltejs/adapter-cloudflare` adapter.

## Testing

### Unit Tests

```bash
bun test        # Run all tests
bun test:unit   # Unit tests only
```

Unit tests verify:
- Utility functions (`buildOverviewMetrics`, `describeUpdate`, etc.)
- Data transformations
- Metric calculations

### End-to-End Tests

```bash
bun test:e2e
```

E2E tests validate:
- Active/stale/total metrics display correctly
- Tab navigation and accessibility
- Map rendering and interactions
- Data refresh functionality

**Important:** E2E tests check for the presence of active/stale/total metrics:
```typescript
// Test verifies all three metrics are present
await expect(page.getByTestId('active-installations')).toBeVisible();
await expect(page.getByTestId('total-installations')).toBeVisible();
await expect(page.getByTestId('stale-installations')).toBeVisible();
```

## Linting and Type Checking

```bash
bun run lint    # ESLint + Prettier
bun run check   # TypeScript + Svelte type checking
bun run format  # Auto-fix formatting
```

## Design System

The dashboard follows the WAPAR design system documented in `/docs/UX_GUIDELINES.md`:

- **Color Tokens**: Defined in `tailwind.config.ts`
- **Typography**: Consistent heading and body text styles
- **Spacing**: Standardized spacing scale
- **Components**: Reusable UI components in `lib/components/`

**Key Design Principles:**
- Accessibility first (WCAG AA compliance)
- Consistent visual hierarchy
- Clear data visualization
- Mobile responsive

## Active Installation Display Examples

### Metric Card Structure

```svelte
<div class="metric-card" data-testid="active-installations">
  <div class="metric-label">Active installations</div>
  <div class="metric-value">750</div>
  <div class="metric-subtitle">Heartbeat within last 3 days</div>
</div>
```

### Tab Descriptions

Each tab includes a description that clarifies active installation filtering:

- **Overview**: "Active, total, and stale installation counts with summary statistics."
- **Geography**: "Regional coverage, top countries, and world map (active installations only)."
- **Versions**: "Release adoption, outdated installs, and upgrade rate (active installations only)."

This ensures users understand which metrics are filtered to active installations.

## Contributing

Please follow the guidelines in `/CONTRIBUTING.md`:

1. Use Bun (not npm/yarn/pnpm)
2. Follow design tokens from `tailwind.config.ts`
3. Add tests for new features
4. Ensure accessibility compliance
5. Update documentation

See [UX Guidelines](../docs/UX_GUIDELINES.md) for detailed design standards.

## Related Documentation

- [Backend API Documentation](../server/README.md)
- [Active Installations Technical Spec](../server/ACTIVE_INSTALLATIONS.md)
- [UX Guidelines](../docs/UX_GUIDELINES.md)
- [Main Project README](../README.md)
