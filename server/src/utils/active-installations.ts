/**
 * Utility functions for active installations tracking
 * 
 * This module provides utilities to distinguish between "active" and "stale" installations
 * based on when they last sent a heartbeat. An installation is considered active if it has
 * sent a heartbeat within the configured activity threshold (default: 3 days).
 * 
 * @module active-installations
 */

import { and, gte, isNotNull, lt, or, isNull } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * Get activity threshold in days from environment variable
 * 
 * The activity threshold determines how recent a heartbeat must be for an installation
 * to be considered "active". Installations with heartbeats older than this threshold
 * are considered "stale".
 * 
 * @param env Environment object that may contain ACTIVITY_THRESHOLD_DAYS
 * @returns Activity threshold in days (default: 3)
 * 
 * @example
 * // With environment variable set to "7"
 * const threshold = getActivityThresholdDays(env); // Returns 7
 * 
 * @example
 * // Without environment variable (uses default)
 * const threshold = getActivityThresholdDays(env); // Returns 3
 */
export function getActivityThresholdDays(env: any): number {
  const envValue = env?.ACTIVITY_THRESHOLD_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    // Validate that the parsed value is a positive number
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 3; // Default to 3 days if not configured or invalid
}

/**
 * Calculate the cutoff date for active installations
 * 
 * Calculates the timestamp that represents the boundary between active and stale
 * installations. Installations with lastHeartbeatAt >= cutoffDate are active.
 * 
 * @param thresholdDays Number of days for activity threshold
 * @returns ISO string cutoff date
 * 
 * @example
 * // For a 3-day threshold
 * const cutoff = getActivityCutoffDate(3);
 * // Returns ISO string like "2025-10-30T04:10:00.000Z"
 * // (3 days before current time)
 */
export function getActivityCutoffDate(thresholdDays: number): string {
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

/**
 * Create a SQL condition for filtering active installations
 * 
 * Generates a SQL WHERE clause that filters for active installations.
 * An installation is active if:
 * 1. lastHeartbeatAt is NOT NULL (has sent at least one heartbeat)
 * 2. lastHeartbeatAt >= cutoffDate (heartbeat is recent enough)
 * 
 * This filter is used across multiple endpoints to ensure consistent
 * active/stale classification.
 * 
 * @param lastHeartbeatAtColumn The lastHeartbeatAt column reference from Drizzle schema
 * @param cutoffDate The cutoff date for active installations (ISO string)
 * @returns SQL condition that checks if installation is active
 * 
 * @example
 * // Usage in a Drizzle query
 * const cutoffDate = getActivityCutoffDate(3);
 * const activeInstalls = await db
 *   .select({ count: count() })
 *   .from(installations)
 *   .where(createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate));
 * 
 * @example
 * // Combined with other conditions
 * import { and, eq } from 'drizzle-orm';
 * const usInstalls = await db
 *   .select()
 *   .from(installations)
 *   .where(and(
 *     createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
 *     eq(installations.countryCode, 'US')
 *   ));
 */
export function createActiveInstallationFilter(
  lastHeartbeatAtColumn: SQLiteColumn,
  cutoffDate: string
) {
  return and(
    isNotNull(lastHeartbeatAtColumn),
    gte(lastHeartbeatAtColumn, cutoffDate)
  );
}

/**
 * Create a SQL condition for filtering stale installations
 * 
 * Generates a SQL WHERE clause that filters for stale installations.
 * An installation is stale if:
 * 1. lastHeartbeatAt is NULL (never sent a heartbeat), OR
 * 2. lastHeartbeatAt < cutoffDate (last heartbeat is too old)
 * 
 * This is the inverse of the active installation filter.
 * 
 * @param lastHeartbeatAtColumn The lastHeartbeatAt column reference from Drizzle schema
 * @param cutoffDate The cutoff date for active installations (ISO string)
 * @returns SQL condition that checks if installation is stale
 * 
 * @example
 * // Usage in a Drizzle query
 * const cutoffDate = getActivityCutoffDate(3);
 * const staleInstalls = await db
 *   .select({ count: count() })
 *   .from(installations)
 *   .where(createStaleInstallationFilter(installations.lastHeartbeatAt, cutoffDate));
 * 
 * @example
 * // Combined with other conditions
 * import { and, eq } from 'drizzle-orm';
 * const usStaleInstalls = await db
 *   .select()
 *   .from(installations)
 *   .where(and(
 *     createStaleInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
 *     eq(installations.countryCode, 'US')
 *   ));
 */
export function createStaleInstallationFilter(
  lastHeartbeatAtColumn: SQLiteColumn,
  cutoffDate: string
) {
  return or(
    isNull(lastHeartbeatAtColumn),
    lt(lastHeartbeatAtColumn, cutoffDate)
  );
}
