# ADR 0004 — Heartbeat Telemetry Data Aggregation

**Status:** Accepted

## Context

Clients (iCloud Docker) already send rich sync-health telemetry in the heartbeat `data` JSON field: `sync_duration`, `has_drive_activity`, `has_photos_activity`, `has_errors`, and nested `drive`/`photos` counters. This data is stored in the `Heartbeat.data` TEXT column but never read by any analytics endpoint or dashboard. The most valuable operational intelligence — is iCloud sync healthy? do many installs error? — is effectively discarded.

`TODO.md` item 5 left this as an open decision with two options: (a) per-heartbeat detail (too granular, PII risk) or (b) aggregated counters (chosen here).

## Decision

Aggregate `Heartbeat.data` telemetry at request time over bounded 7-day and 30-day windows and expose it as additive fields on the existing `GET /api/heartbeat-analytics` endpoint.

**New response fields** (additive, non-breaking):

```json
{
  "syncHealth": {
    "last7d": {
      "installationsReporting": 180,
      "avgSyncDurationSec": 42.3,
      "errorRate": 0.05,
      "driveActiveCount": 150,
      "photosActiveCount": 120
    },
    "last30d": {
      "installationsReporting": 350,
      "avgSyncDurationSec": 38.7,
      "errorRate": 0.03,
      "driveActiveCount": 300,
      "photosActiveCount": 250
    }
  }
}
```

**Aggregation rules:**

- `installationsReporting`: distinct installations with non-null `Heartbeat.data` in the window.
- `avgSyncDurationSec`: average of `data.sync_duration` (parsed from JSON in application code) across heartbeats in the window; null/missing values skipped.
- `errorRate`: fraction of heartbeats where `data.has_errors === true` out of all heartbeats with data in the window.
- `driveActiveCount`: distinct installations where any heartbeat in the window has `data.has_drive_activity === true`.
- `photosActiveCount`: distinct installations where any heartbeat in the window has `data.has_photos_activity === true`.

**Implementation approach:**

- Query heartbeats in the bounded window using `idx_heartbeat_created_at` (indexed).
- Parse `data` JSON in application code (SQLite JSON functions are limited).
- Never read `data` for non-reporting clients (data null) — safe defaults (zero counts, null averages).

## Consequences

- **Pros:** single endpoint, additive fields (no breaking change), operational intelligence surfaced, bounded query window keeps performance acceptable.
- **Cons:** JSON parsing in application code adds CPU overhead; mitigated by bounded windows (7d/30d) and indexed query.
