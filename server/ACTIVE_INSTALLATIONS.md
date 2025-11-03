# Active Installations Tracking

This document describes the active installations tracking feature that distinguishes between active and stale installations.

## Overview

The system now tracks the last heartbeat timestamp for each installation and uses this to determine which installations are "active" vs "stale". This allows for more accurate analytics that reflect current usage rather than historical totals.

## Database Changes

### New Field: `lastHeartbeatAt`

A new field has been added to the `Installation` table:
- **Field Name**: `last_heartbeat_at`
- **Type**: TEXT (ISO 8601 timestamp)
- **Nullable**: Yes (null for installations that have never sent a heartbeat)
- **Indexed**: Yes (for efficient querying)

### Migration

The database migration `0002_charming_inhumans.sql` adds:
1. The `last_heartbeat_at` column to the Installation table
2. An index on this column for query performance

To apply the migration:
```bash
# Local development
npm run db:deploy:local

# Production
npm run db:deploy
```

## Heartbeat Endpoint Changes

The `/api/heartbeat` endpoint now updates the `lastHeartbeatAt` field on every heartbeat:
- When a heartbeat is received, `lastHeartbeatAt` is set to the current timestamp
- This happens even for duplicate heartbeats (same day)
- The timestamp is updated on the Installation record, not just the Heartbeat record

## Activity Threshold

The system uses a configurable activity threshold to determine if an installation is "active":

### Default Threshold
- **Default**: 3 days
- An installation is considered active if it has sent a heartbeat within the last 3 days

### Configuration
Set the `ACTIVITY_THRESHOLD_DAYS` environment variable to customize the threshold:

In `wrangler.toml`:
```toml
[vars]
ACTIVITY_THRESHOLD_DAYS = "7"  # 7 days instead of default 3
```

Or in environment-specific configuration:
```toml
[env.production.vars]
ACTIVITY_THRESHOLD_DAYS = "5"  # 5 days for production
```

## API Endpoints

### 1. Installation Stats Endpoint

**URL**: `/api/installation-stats`

**Method**: GET

**Description**: Returns comprehensive statistics about active and stale installations.

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
    },
    {
      "version": "1.9.0",
      "count": 25,
      "percentage": 33.33
    }
  ],
  "activeCountryDistribution": [
    {
      "countryCode": "US",
      "count": 40
    },
    {
      "countryCode": "CA",
      "count": 20
    }
  ]
}
```

**Fields**:
- `totalInstallations`: Total count of all installations (active + stale)
- `activeInstallations`: Count of installations with a heartbeat within the threshold
- `staleInstallations`: Count of installations without a recent heartbeat (total - active)
- `activityThresholdDays`: The configured activity threshold in days
- `cutoffDate`: The calculated cutoff date for active installations
- `activeVersionDistribution`: Version breakdown for active installations only
- `activeCountryDistribution`: Country distribution for active installations only

### 2. Updated Usage Endpoint

**URL**: `/api/usage`

**Method**: GET

**Description**: Returns usage analytics now including active installation metrics.

**Response** (new fields highlighted):
```json
{
  "totalInstallations": 100,
  "activeInstallations": 75,        // NEW
  "staleInstallations": 25,         // NEW
  "monthlyActive": 80,
  "activityThresholdDays": 3,       // NEW
  "createdAt": "Sun, 02 Nov 2025 23:48:36 GMT",
  "countryToCount": [                // NOW FILTERED TO ACTIVE ONLY
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

**Changes**:
- Added `activeInstallations` field
- Added `staleInstallations` field  
- Added `activityThresholdDays` field
- `countryToCount` now only includes active installations

### 3. Updated Version Analytics Endpoint

**URL**: `/api/version-analytics`

**Method**: GET

**Description**: Returns version distribution analytics now filtered to active installations only.

**Response**:
```json
{
  "versionDistribution": [  // NOW ACTIVE ONLY
    {
      "version": "2.0.0",
      "count": 50,
      "percentage": 66.67
    }
  ],
  "latestVersion": "2.0.0",
  "outdatedInstallations": 25,
  "upgradeRate": {
    "last7Days": 10,
    "last30Days": 45
  }
}
```

**Changes**:
- `versionDistribution` now only includes active installations
- All percentages are calculated based on active installations only

## Definitions

### Active Installation
An installation is considered "active" if:
1. It has a non-null `lastHeartbeatAt` timestamp, AND
2. The `lastHeartbeatAt` is within the activity threshold (default: 3 days)

**Example**: An installation that sent a heartbeat 2 days ago (with default 3-day threshold) is **active**.

**SQL Logic**:
```sql
WHERE last_heartbeat_at IS NOT NULL 
  AND last_heartbeat_at >= datetime('now', '-3 days')
```

### Stale Installation
An installation is considered "stale" if:
1. It has never sent a heartbeat (`lastHeartbeatAt` is null), OR
2. The `lastHeartbeatAt` is older than the activity threshold

**Examples**:
- Installation created but never sent a heartbeat: **stale**
- Installation last heartbeat was 5 days ago (with default 3-day threshold): **stale**
- Installation last heartbeat was 2 days ago (with 1-day threshold configured): **stale**

**Calculation**: `staleInstallations = totalInstallations - activeInstallations`

### Total Installations
The count of all installations ever created (active + stale), unchanged from before.

**Example**: If you have 100 total installations, 75 active, then 25 are stale (100 - 75 = 25).

## Migration Considerations

### Backfill Strategy
Existing installations will have `lastHeartbeatAt = null` initially:
- They will be considered "stale" until they send their next heartbeat
- When they send a heartbeat, `lastHeartbeatAt` will be set and they'll become "active"
- This means initial metrics will show most installations as stale

### Gradual Transition
- As existing installations send heartbeats, they'll transition from stale to active
- After one activity threshold period (default 3 days), all active installations should have `lastHeartbeatAt` set
- Truly inactive installations will remain stale

## Testing

All tests have been updated to account for the active installation filtering:
- Tests that create installations now send heartbeats to make them active
- New tests verify active/stale/total counting logic
- Tests verify version and country distribution filtering

Run tests with:
```bash
npm test
```

## Deployment

1. Apply the database migration before deploying code changes
2. Update environment variables if custom threshold is desired
3. Deploy the worker with updated code

```bash
# Apply migration
npm run db:deploy

# Deploy worker
npm run deploy
```

## Backward Compatibility

### Breaking Changes
- **Version Analytics**: Now returns only active installations instead of all installations
- **Usage Endpoint - Country Distribution**: Now returns only active installations
- **Usage Endpoint - Response Schema**: Added new fields (`activeInstallations`, `staleInstallations`, `activityThresholdDays`)

### Non-Breaking Changes
- **Installation Stats Endpoint**: New endpoint, no backward compatibility concerns
- **Heartbeat Endpoint**: Behavior is backward compatible, just adds database update

### Frontend Impact
Frontends consuming these endpoints should:
1. Handle the new fields in the usage endpoint response
2. Understand that version analytics now reflects active installations only
3. Consider using the new installation-stats endpoint for comprehensive metrics

## Practical Examples

### Example 1: Querying Active Installations

To fetch comprehensive active/stale statistics:

```bash
curl https://wapar-api.mandarons.com/api/installation-stats
```

**Response**:
```json
{
  "totalInstallations": 1000,
  "activeInstallations": 750,
  "staleInstallations": 250,
  "activityThresholdDays": 3,
  "cutoffDate": "2025-10-30T00:00:00.000Z",
  "activeVersionDistribution": [
    { "version": "2.1.0", "count": 450, "percentage": 60.0 },
    { "version": "2.0.5", "count": 200, "percentage": 26.67 },
    { "version": "1.9.8", "count": 100, "percentage": 13.33 }
  ],
  "activeCountryDistribution": [
    { "countryCode": "US", "count": 300 },
    { "countryCode": "CA", "count": 150 },
    { "countryCode": "GB", "count": 100 }
  ]
}
```

**Key Insights**:
- 75% of installations are active (750/1000)
- 25% are stale (250/1000)
- Version 2.1.0 is used by 60% of active installations
- Active installations are distributed across at least 3 countries

### Example 2: Configuring Custom Activity Threshold

If you want to consider installations active for 7 days instead of 3:

**In `wrangler.toml`**:
```toml
[vars]
ACTIVITY_THRESHOLD_DAYS = "7"
```

**After deployment**, the API will return:
```json
{
  "activityThresholdDays": 7,
  "cutoffDate": "2025-10-27T00:00:00.000Z"
}
```

This increases the active installation count since more installations fall within the 7-day window.

### Example 3: Transitioning Stale to Active

**Scenario**: An installation hasn't sent a heartbeat in 5 days (currently stale).

**Action**: The application sends a heartbeat:
```bash
curl -X POST https://wapar-api.mandarons.com/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"installationId": "550e8400-e29b-41d4-a716-446655440000"}'
```

**Result**:
- `lastHeartbeatAt` is updated to current timestamp
- Installation immediately transitions from stale to active
- Next `/api/installation-stats` call will reflect this in `activeInstallations` count

### Example 4: Dashboard Metrics Interpretation

On the WAPAR dashboard, you'll see three primary metrics:

**Active Installations: 750**
- Subtitle: "Heartbeat within last 3 days"
- These installations are currently in use

**Total Installations: 1,000**
- Subtitle: "All time"
- Total number of installations ever created

**Stale Installations: 250**
- Subtitle: "No heartbeat in 3+ days"
- Installations that may be uninstalled or inactive

**Stale Percentage**: 25% (250/1000)
- If >25%, dashboard shows warning indicator
- Suggests potential user churn or retention issues

### Example 5: Version Analytics with Active Filtering

When analyzing version distribution:

```bash
curl https://wapar-api.mandarons.com/api/version-analytics
```

**Response**:
```json
{
  "versionDistribution": [
    { "version": "2.1.0", "count": 450, "percentage": 60.0 },
    { "version": "2.0.5", "count": 200, "percentage": 26.67 },
    { "version": "1.9.8", "count": 100, "percentage": 13.33 }
  ],
  "latestVersion": "2.1.0",
  "outdatedInstallations": 300,
  "upgradeRate": {
    "last7Days": 25,
    "last30Days": 120
  }
}
```

**Key Points**:
- All counts and percentages reflect **active installations only** (750 total)
- `outdatedInstallations` (300) are active installations not on latest version
- Percentages sum to 100% across active installations
- Upgrade rates track version changes among active users

### Example 6: Geographic Distribution Query

Query active installations by country:

```bash
curl https://wapar-api.mandarons.com/api/usage
```

**Response excerpt**:
```json
{
  "countryToCount": [
    { "countryCode": "US", "count": 300 },
    { "countryCode": "CA", "count": 150 },
    { "countryCode": "GB", "count": 100 },
    { "countryCode": "DE", "count": 80 }
  ]
}
```

**Note**: `countryToCount` includes **only active installations**. The world map on the dashboard also shows active installations only, ensuring accurate representation of current global reach.

## Summary

The active/stale installation tracking provides:
1. **Better Analytics**: Focus on current users vs historical totals
2. **Churn Visibility**: Identify retention issues through stale percentage
3. **Accurate Distribution**: Version and geographic data reflects active users
4. **Configurable Threshold**: Adjust activity window to match your use case
5. **Real-time Updates**: Heartbeats immediately transition stale to active

This feature enables data-driven decisions about user engagement, version adoption, and geographic expansion.
