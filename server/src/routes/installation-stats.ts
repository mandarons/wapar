import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, countDistinct, desc, gte, isNotNull, and } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';

export const installationStatsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

// Get activity threshold in days from environment variable, default to 3 days
function getActivityThresholdDays(env: any): number {
  const envValue = env?.ACTIVITY_THRESHOLD_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 3; // Default to 3 days
}

// Calculate the cutoff date for active installations
function getActivityCutoffDate(thresholdDays: number): string {
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

installationStatsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const db = getDb(c.env);
    const thresholdDays = getActivityThresholdDays(c.env);
    const cutoffDate = getActivityCutoffDate(thresholdDays);

    // Total installations count (all time)
    const totalInstallationsResult = await Logger.measureOperation(
      'installation_stats.total',
      () => db.select({ count: count() }).from(installations),
      requestContext
    );
    const totalInstallations = totalInstallationsResult[0]?.count ?? 0;

    // Active installations count (with heartbeat within threshold)
    const activeInstallationsResult = await Logger.measureOperation(
      'installation_stats.active',
      () => db.select({ count: count() })
        .from(installations)
        .where(and(
          isNotNull(installations.lastHeartbeatAt),
          gte(installations.lastHeartbeatAt, cutoffDate)
        )),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );
    const activeInstallations = activeInstallationsResult[0]?.count ?? 0;

    // Stale installations count (no recent heartbeat or never had heartbeat)
    const staleInstallations = totalInstallations - activeInstallations;

    // Version breakdown for active installations only
    const activeVersionsResult = await Logger.measureOperation(
      'installation_stats.active_versions',
      () => db.select({
        version: installations.appVersion,
        count: count()
      })
        .from(installations)
        .where(and(
          isNotNull(installations.lastHeartbeatAt),
          gte(installations.lastHeartbeatAt, cutoffDate)
        ))
        .groupBy(installations.appVersion)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );

    const activeVersionDistribution = activeVersionsResult.map((r) => ({
      version: r.version,
      count: Number(r.count),
      percentage: activeInstallations > 0
        ? Number(((Number(r.count) / activeInstallations) * 100).toFixed(2))
        : 0
    }));

    // Country distribution for active installations only
    const activeCountriesResult = await Logger.measureOperation(
      'installation_stats.active_countries',
      () => db.select({
        country_code: installations.countryCode,
        count: count()
      })
        .from(installations)
        .where(and(
          isNotNull(installations.lastHeartbeatAt),
          gte(installations.lastHeartbeatAt, cutoffDate)
        ))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );

    const activeCountryDistribution = activeCountriesResult
      .filter((r) => r.country_code !== null)
      .map((r) => ({
        countryCode: r.country_code,
        count: Number(r.count)
      }));

    const responseData = {
      totalInstallations,
      activeInstallations,
      staleInstallations,
      activityThresholdDays: thresholdDays,
      cutoffDate,
      activeVersionDistribution,
      activeCountryDistribution
    };

    Logger.success('Installation stats generated', {
      operation: 'installation_stats.get',
      metadata: {
        totalInstallations,
        activeInstallations,
        staleInstallations,
        thresholdDays,
        activeVersions: activeVersionDistribution.length,
        activeCountries: activeCountryDistribution.length
      }
    });

    return c.json(responseData);
  } catch (error) {
    Logger.error('Installation stats failed', {
      operation: 'installation_stats.get',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
