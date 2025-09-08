import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';
import { count, countDistinct, eq, isNotNull, gte, desc } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  try {
    const now = new Date().toUTCString();
    const db = getDb(c.env);

    // Total installations count
    const totalInstallationsResult = await db.select({ count: count() })
      .from(installations);
    const totalInstallations = totalInstallationsResult[0]?.count ?? 0;

    // Monthly active installations (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyActiveResult = await db.select({ count: countDistinct(heartbeats.installationId) })
      .from(heartbeats)
      .where(gte(heartbeats.createdAt, since));
    const monthlyActive = monthlyActiveResult[0]?.count ?? 0;

    // Country counts - fix ORDER BY to reference the count function
    const countryToCount = await db.select({
      country_code: installations.countryCode,
      count: count()
    })
      .from(installations)
      .where(isNotNull(installations.countryCode))
      .groupBy(installations.countryCode)
      .orderBy(desc(count()));

    // App-specific counts
    const getAppCount = async (appName: string) => {
      const result = await db.select({ count: count() })
        .from(installations)
        .where(eq(installations.appName, appName));
      return result[0]?.count ?? 0;
    };

    const iCloudDockerTotal = await getAppCount('icloud-drive-docker');
    const haBouncieTotal = await getAppCount('ha-bouncie');

    return c.json({
      totalInstallations,
      monthlyActive,
      createdAt: now,
      countryToCount: countryToCount.map((r) => ({ 
        countryCode: r.country_code, 
        count: Number(r.count) 
      })),
      iCloudDocker: { total: iCloudDockerTotal },
      haBouncie: { total: haBouncieTotal },
    });
  } catch (error) {
    console.error('Usage route error:', error);
    return handleGenericError(c, error as Error);
  }
});
