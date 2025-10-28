import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, desc, gte } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';

export const versionAnalyticsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

versionAnalyticsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const db = getDb(c.env);

    // Get version distribution
    const versionDistributionResult = await Logger.measureOperation(
      'version_analytics.distribution',
      () => db.select({
        version: installations.appVersion,
        count: count()
      })
        .from(installations)
        .groupBy(installations.appVersion)
        .orderBy(desc(count())),
      requestContext
    );

    // Calculate total installations
    const totalInstallations = versionDistributionResult.reduce(
      (sum, item) => sum + Number(item.count), 
      0
    );

    // Calculate percentages and format distribution
    const versionDistribution = versionDistributionResult.map((item) => ({
      version: item.version,
      count: Number(item.count),
      percentage: totalInstallations > 0 
        ? Number(((Number(item.count) / totalInstallations) * 100).toFixed(2))
        : 0
    }));

    // Determine latest version (most popular by installation count)
    const latestVersion = versionDistribution.length > 0 
      ? versionDistribution[0].version 
      : null;

    // Count outdated installations (not on latest version)
    const outdatedInstallations = latestVersion
      ? versionDistribution
          .filter((v) => v.version !== latestVersion)
          .reduce((sum, v) => sum + v.count, 0)
      : 0;

    // Calculate upgrade rates (installations updated in last 7 and 30 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const last7DaysResult = await Logger.measureOperation(
      'version_analytics.upgrades_7d',
      () => db.select({ count: count() })
        .from(installations)
        .where(gte(installations.updatedAt, sevenDaysAgo)),
      {
        metadata: { sinceDate: sevenDaysAgo },
        ...requestContext
      }
    );

    const last30DaysResult = await Logger.measureOperation(
      'version_analytics.upgrades_30d',
      () => db.select({ count: count() })
        .from(installations)
        .where(gte(installations.updatedAt, thirtyDaysAgo)),
      {
        metadata: { sinceDate: thirtyDaysAgo },
        ...requestContext
      }
    );

    const responseData = {
      versionDistribution,
      latestVersion,
      outdatedInstallations,
      upgradeRate: {
        last7Days: last7DaysResult[0]?.count ?? 0,
        last30Days: last30DaysResult[0]?.count ?? 0
      }
    };

    // Log warning if no data found
    if (totalInstallations === 0) {
      Logger.warning('Version analytics returned zero installations', {
        operation: 'version_analytics.analytics',
        metadata: { 
          totalInstallations,
          versionsFound: versionDistribution.length
        },
        ...requestContext
      });
    }

    Logger.success('Version analytics generated', {
      operation: 'version_analytics.analytics',
      metadata: { 
        totalInstallations,
        versionsFound: versionDistribution.length,
        latestVersion,
        outdatedCount: outdatedInstallations
      }
    });

    return c.json(responseData);
  } catch (error) {
    Logger.error('Version analytics failed', {
      operation: 'version_analytics.analytics',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
