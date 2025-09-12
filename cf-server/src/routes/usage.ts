import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';
import { count, countDistinct, eq, isNotNull, gte, desc } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const now = new Date().toUTCString();
    const db = getDb(c.env);

    // Total installations count
    const totalInstallationsResult = await Logger.measureOperation(
      'usage.total_installations',
      () => db.select({ count: count() }).from(installations),
      requestContext
    );
    const totalInstallations = totalInstallationsResult[0]?.count ?? 0;

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

    // Country counts - fix ORDER BY to reference the count function
    const countryToCount = await Logger.measureOperation(
      'usage.country_counts',
      () => db.select({
        country_code: installations.countryCode,
        count: count()
      })
        .from(installations)
        .where(isNotNull(installations.countryCode))
        .groupBy(installations.countryCode)
        .orderBy(desc(count())),
      requestContext
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

    const iCloudDockerTotal = await getAppCount('icloud-drive-docker');
    const haBouncieTotal = await getAppCount('ha-bouncie');

    const responseData = {
      totalInstallations,
      monthlyActive,
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
