/**
 * Utility functions for active installations tracking
 */

import { and, gte, isNotNull, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * Get activity threshold in days from environment variable
 * @param env Environment object that may contain ACTIVITY_THRESHOLD_DAYS
 * @returns Activity threshold in days (default: 3)
 */
export function getActivityThresholdDays(env: any): number {
  const envValue = env?.ACTIVITY_THRESHOLD_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 3; // Default to 3 days
}

/**
 * Calculate the cutoff date for active installations
 * @param thresholdDays Number of days for activity threshold
 * @returns ISO string cutoff date
 */
export function getActivityCutoffDate(thresholdDays: number): string {
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

/**
 * Create a SQL condition for filtering active installations
 * @param lastHeartbeatAtColumn The lastHeartbeatAt column reference
 * @param cutoffDate The cutoff date for active installations
 * @returns SQL condition that checks if installation is active
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
