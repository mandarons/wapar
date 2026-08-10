import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, isNotNull, gte, and, eq, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter } from '../utils/active-installations';
import type { D1Database } from '../types/database';

export const countryInsightsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

countryInsightsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);

  if (c.req.header('X-Test-Generic-Error') === 'true') {
    throw new Error('Simulated generic error for testing');
  }

  const db = getDb(c.env);
  const thresholdDays = getActivityThresholdDays(c.env);
  const cutoffDate = getActivityCutoffDate(thresholdDays);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // New installations in last 30 days, grouped by country
  const newByCountry = await Logger.measureOperation(
    'country_insights.new_by_country',
    () => db.select({
      countryCode: installations.countryCode,
      count: count(),
    })
      .from(installations)
      .where(and(
        gte(installations.createdAt, since30d),
        isNotNull(installations.countryCode)
      ))
      .groupBy(installations.countryCode),
    requestContext
  );

  // Active installations, grouped by country
  const activeByCountry = await Logger.measureOperation(
    'country_insights.active_by_country',
    () => db.select({
      countryCode: installations.countryCode,
      count: count(),
    })
      .from(installations)
      .where(and(
        createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
        isNotNull(installations.countryCode)
      ))
      .groupBy(installations.countryCode),
    requestContext
  );

  // Total installations, grouped by country (all time)
  const totalByCountry = await Logger.measureOperation(
    'country_insights.total_by_country',
    () => db.select({
      countryCode: installations.countryCode,
      count: count(),
    })
      .from(installations)
      .where(isNotNull(installations.countryCode))
      .groupBy(installations.countryCode),
    requestContext
  );

  // Merge into a unified map
  const countryMap = new Map<string, {
    countryCode: string;
    new30d: number;
    active: number;
    total: number;
  }>();

  for (const row of newByCountry) {
    const cc = row.countryCode!;
    if (!countryMap.has(cc)) {
      countryMap.set(cc, { countryCode: cc, new30d: 0, active: 0, total: 0 });
    }
    countryMap.get(cc)!.new30d = Number(row.count);
  }

  for (const row of activeByCountry) {
    const cc = row.countryCode!;
    if (!countryMap.has(cc)) {
      countryMap.set(cc, { countryCode: cc, new30d: 0, active: 0, total: 0 });
    }
    countryMap.get(cc)!.active = Number(row.count);
  }

  for (const row of totalByCountry) {
    const cc = row.countryCode!;
    if (!countryMap.has(cc)) {
      countryMap.set(cc, { countryCode: cc, new30d: 0, active: 0, total: 0 });
    }
    countryMap.get(cc)!.total = Number(row.count);
  }

  // Compute totals for share calculations
  const totalNew30d = [...countryMap.values()].reduce((sum, c) => sum + c.new30d, 0);

  // Build response sorted by new30d descending
  const countries = [...countryMap.values()]
    .map((entry) => ({
      countryCode: entry.countryCode,
      new30d: entry.new30d,
      new30dShare: totalNew30d > 0 ? Number(((entry.new30d / totalNew30d) * 100).toFixed(1)) : 0,
      active: entry.active,
      activeRate: entry.new30d > 0 ? Number(((entry.active / entry.new30d) * 100).toFixed(1)) : 0,
      total: entry.total,
    }))
    .sort((a, b) => b.new30d - a.new30d);

  const responseData = {
    countries,
    period: '30d',
    activityThresholdDays: thresholdDays,
    generatedAt: new Date().toUTCString(),
  };

  Logger.success('Country insights generated', {
    operation: 'country_insights.analytics',
    metadata: {
      countriesWithData: countries.length,
      totalNew30d,
      topCountry: countries[0]?.countryCode ?? null,
    }
  });

  return c.json(responseData);
});
