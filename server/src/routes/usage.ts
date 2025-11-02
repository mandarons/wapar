import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';
import { count, countDistinct, eq, isNotNull, gte, desc, and } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter } from '../utils/active-installations';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const now = new Date().toUTCString();
    const db = getDb(c.env);

    // Get activity threshold from environment, default to 3 days
    const thresholdDays = getActivityThresholdDays(c.env);
    const cutoffDate = getActivityCutoffDate(thresholdDays);

    // Total installations count
    const totalInstallationsResult = await Logger.measureOperation(
      'usage.total_installations',
      () => db.select({ count: count() }).from(installations),
      requestContext
    );
    const totalInstallations = totalInstallationsResult[0]?.count ?? 0;

    // Active installations (based on lastHeartbeatAt within threshold)
    const activeInstallationsResult = await Logger.measureOperation(
      'usage.active_installations',
      () => db.select({ count: count() })
        .from(installations)
        .where(createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate)),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );
    const activeInstallations = activeInstallationsResult[0]?.count ?? 0;

    // Monthly active installations (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyActiveResult = await Logger.measureOperation(
      'usage.monthly_active',
      () => db.select({ count: countDistinct(heartbeats.installationId) })
        .from(heartbeats)
        .where(gte(heartbeats.createdAt, since)),
      {
        metadata: { sinceDate: since },
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
          isNotNull(installations.countryCode)
        ))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays },
        ...requestContext
      }
    );

    // App-specific counts
    const getAppCount = async (appName: string) => {
      const result = await Logger.measureOperation(
        `usage.app_count.${appName}`,
        () => db.select({ count: count() })
          .from(installations)
          .where(eq(installations.appName, appName)),
        {
          metadata: { appName },
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
      countryToCount: countryToCount.map((r) => ({ 
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
        topApps: { iCloudDockerTotal, haBouncieTotal }
      }
    });

    return c.json(responseData);
  } catch (error) {
    Logger.error('Usage analytics failed', {
      operation: 'usage.analytics',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
