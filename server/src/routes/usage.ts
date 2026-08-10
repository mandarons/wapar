import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';
import { count, countDistinct, eq, isNotNull, gte, desc, and, min } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter } from '../utils/active-installations';
import type { D1Database } from '../types/database';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  // Test mode: allow simulating generic errors
  if (c.req.header('X-Test-Generic-Error') === 'true') {
    throw new Error('Simulated generic error for testing');
  }
  
  const now = new Date().toUTCString();
  const db = getDb(c.env);
  const appName = c.req.query('appName');

  // Get activity threshold from environment, default to 3 days
  const thresholdDays = getActivityThresholdDays(c.env);
  const cutoffDate = getActivityCutoffDate(thresholdDays);

    // Build base filter for app-specific queries
    const appFilter = appName ? eq(installations.appName, appName) : undefined;

    // Total installations count
    const totalInstallationsResult = await Logger.measureOperation(
      'usage.total_installations',
      () => db.select({ count: count() })
        .from(installations)
        .where(appFilter),
      requestContext
    );
    const totalInstallations = totalInstallationsResult[0]?.count ?? 0;

    // Active installations (based on lastHeartbeatAt within threshold)
    const activeInstallationsResult = await Logger.measureOperation(
      'usage.active_installations',
      () => db.select({ count: count() })
        .from(installations)
        .where(appFilter
          ? and(createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate), appFilter)
          : createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate)),
      {
        metadata: { cutoffDate, thresholdDays, appName: appName ?? null },
        ...requestContext
      }
    );
    const activeInstallations = activeInstallationsResult[0]?.count ?? 0;

    // Monthly active installations (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyActiveResult = await Logger.measureOperation(
      'usage.monthly_active',
      () => appName
        ? db.select({ count: countDistinct(heartbeats.installationId) })
            .from(heartbeats)
            .innerJoin(installations, eq(heartbeats.installationId, installations.id))
            .where(and(gte(heartbeats.createdAt, since), eq(installations.appName, appName)))
        : db.select({ count: countDistinct(heartbeats.installationId) })
            .from(heartbeats)
            .where(gte(heartbeats.createdAt, since)),
      {
        metadata: { sinceDate: since, appName: appName ?? null },
        ...requestContext
      }
    );
    const monthlyActive = monthlyActiveResult[0]?.count ?? 0;

    // Country counts for active installations only
    const countryToCount = await Logger.measureOperation(
      'usage.country_counts',
      () => db.select({
        country_code: installations.countryCode,
        count: count()
      })
        .from(installations)
        .where(and(
          createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
          isNotNull(installations.countryCode),
          ...(appName ? [eq(installations.appName, appName)] : [])
        ))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays, appName: appName ?? null },
        ...requestContext
      }
    );

    // All-time country counts (no active filter)
    const allTimeCountryToCount = await Logger.measureOperation(
      'usage.all_time_country_counts',
      () => db.select({
        country_code: installations.countryCode,
        count: count()
      })
        .from(installations)
        .where(appName
          ? and(isNotNull(installations.countryCode), eq(installations.appName, appName))
          : isNotNull(installations.countryCode))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      requestContext
    );

    // Earliest installation date (start of collected data)
    const earliestInstallationResult = await Logger.measureOperation(
      'usage.earliest_installation',
      () => db.select({ earliestInstallationDate: min(installations.createdAt) })
        .from(installations)
        .where(appFilter),
      requestContext
    );
    const earliestInstallationDate = earliestInstallationResult[0]?.earliestInstallationDate ?? null;

    // App-specific counts
    const getAppCount = async (appNameValue: string) => {
      const result = await Logger.measureOperation(
        `usage.app_count.${appNameValue}`,
        () => db.select({ count: count() })
          .from(installations)
          .where(eq(installations.appName, appNameValue)),
        {
          metadata: { appName: appNameValue },
          ...requestContext
        }
      );
      return result[0]?.count ?? 0;
    };

    // Query both legacy and current app names to support backward compatibility
    const iCloudDockerLegacy = await getAppCount('icloud-drive-docker');
    const iCloudDockerCurrent = await getAppCount('icloud-docker');
    const iCloudDockerTotal = iCloudDockerLegacy + iCloudDockerCurrent;
    const haBouncieTotal = await getAppCount('ha-bouncie');

    const responseData = {
      totalInstallations,
      activeInstallations,
      staleInstallations: totalInstallations - activeInstallations,
      monthlyActive,
      activityThresholdDays: thresholdDays,
      createdAt: now,
      earliestInstallationDate,
      countryToCount: countryToCount.map((r) => ({ 
        countryCode: r.country_code, 
        count: Number(r.count) 
      })),
      allTimeCountryToCount: allTimeCountryToCount.map((r) => ({ 
        countryCode: r.country_code, 
        count: Number(r.count) 
      })),
      iCloudDocker: { total: iCloudDockerTotal },
      haBouncie: { total: haBouncieTotal },
    };

    // Log warning if no data found
    if (totalInstallations === 0) {
      Logger.warning('Usage analytics returned zero installations', {
        operation: 'usage.analytics',
        metadata: { 
          totalInstallations,
          monthlyActive,
          countriesWithData: countryToCount.length
        },
        ...requestContext
      });
    }

    Logger.success('Usage analytics generated', {
      operation: 'usage.analytics',
      metadata: { 
        totalInstallations,
        activeInstallations,
        staleInstallations: totalInstallations - activeInstallations,
        monthlyActive,
        countriesWithData: countryToCount.length,
        allTimeCountriesWithData: allTimeCountryToCount.length,
        topApps: { iCloudDockerTotal, haBouncieTotal }
      }
    });

    return c.json(responseData);
});
