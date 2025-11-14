import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, desc, isNotNull, and } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter, createStaleInstallationFilter } from '../utils/active-installations';

export const installationStatsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationStatsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
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
        .where(createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate)),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );
    const activeInstallations = activeInstallationsResult[0]?.count ?? 0;

    // Stale installations count (no recent heartbeat or never had heartbeat)
    // Note: The stale filter (NULL OR < cutoff) is mathematically complementary to
    // the active filter (NOT NULL AND >= cutoff), so active + stale will always
    // equal total. No validation needed.
    const staleInstallationsResult = await Logger.measureOperation(
      'installation_stats.stale',
      () => db.select({ count: count() })
        .from(installations)
        .where(createStaleInstallationFilter(installations.lastHeartbeatAt, cutoffDate)),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );
    const staleInstallations = staleInstallationsResult[0]?.count ?? 0;

    // Version breakdown for active installations only
    const activeVersionsResult = await Logger.measureOperation(
      'installation_stats.active_versions',
      () => db.select({
        version: installations.appVersion,
        count: count()
      })
        .from(installations)
        .where(createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate))
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
          createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
          isNotNull(installations.countryCode)
        ))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );

    const activeCountryDistribution = activeCountriesResult.map((r) => ({
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
});
