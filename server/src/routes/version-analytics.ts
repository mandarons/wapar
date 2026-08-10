import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, desc, gte, and, ne, eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { findLatestVersion, compareVersions } from '../utils/version';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter } from '../utils/active-installations';
import { fillTimelineGaps } from '../utils/timeline-gaps';

export const versionAnalyticsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

versionAnalyticsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  const db = getDb(c.env);
  const appName = c.req.query('appName');

  // Get activity threshold from environment, default to 3 days
  const thresholdDays = getActivityThresholdDays(c.env);
  const cutoffDate = getActivityCutoffDate(thresholdDays);

    // Build filter conditions
    const conditions = [
      createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate),
      ne(installations.appVersion, 'unknown')
    ];
    if (appName) {
      conditions.push(eq(installations.appName, appName));
    }

    // Get version distribution for active installations only
    // Exclude 'unknown' versions (from auto-created installations, which can result from data loss/corruption or legitimate out-of-order requests such as clients sending heartbeats before installation records exist)
    const versionDistributionResult = await Logger.measureOperation(
      'version_analytics.distribution',
      () => db.select({
        version: installations.appVersion,
        count: count()
      })
        .from(installations)
        .where(and(...conditions))
        .groupBy(installations.appVersion)
        .orderBy(desc(count())),
      {
        metadata: { cutoffDate, thresholdDays, appName: appName ?? null },
        ...requestContext
      }
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

    // Sort version distribution by semantic version (descending)
    versionDistribution.sort((a, b) => compareVersions(b.version, a.version));

    // Determine latest version using semantic version comparison
    const latestVersion = findLatestVersion(
      versionDistribution.map(v => v.version)
    );

    // Count outdated installations (not on latest version)
    const outdatedInstallations = latestVersion
      ? versionDistribution
          .filter((v) => v.version !== latestVersion)
          .reduce((sum, v) => sum + v.count, 0)
      : 0;

    // Calculate new installation rates (installations created in last 7 and 30 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const newInstallConditions = appName ? [eq(installations.appName, appName)] : [];

    const last7DaysResult = await Logger.measureOperation(
      'version_analytics.new_installs_7d',
      () => db.select({ count: count() })
        .from(installations)
        .where(newInstallConditions.length > 0
          ? and(...newInstallConditions, gte(installations.createdAt, sevenDaysAgo))
          : gte(installations.createdAt, sevenDaysAgo)),
      {
        metadata: { sinceDate: sevenDaysAgo, appName: appName ?? null },
        ...requestContext
      }
    );

    const last30DaysResult = await Logger.measureOperation(
      'version_analytics.new_installs_30d',
      () => db.select({ count: count() })
        .from(installations)
        .where(newInstallConditions.length > 0
          ? and(...newInstallConditions, gte(installations.createdAt, thirtyDaysAgo))
          : gte(installations.createdAt, thirtyDaysAgo)),
      {
        metadata: { sinceDate: thirtyDaysAgo, appName: appName ?? null },
        ...requestContext
      }
    );

    // Adoption timeline: per-version installs over time
    const period = c.req.query('period') || '30d';
    const groupBy = c.req.query('groupBy') || 'day';

    const periodPattern = /^\d+d$/;
    const allowedGroupBy = ['day', 'week'];
    let adoptionTimeline: Array<{ date: string; version: string; newInstalls: number }> = [];
    let adoptionGaps: Array<{ from: string; to: string; days: number }> = [];

    if (periodPattern.test(period) && allowedGroupBy.includes(groupBy)) {
      const daysAgo = parseInt(period.replace('d', ''), 10);
      const sinceDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      const dateFormatMap: Record<string, string> = {
        'day': '%Y-%m-%d',
        'week': '%Y-W%V'
      };
      const dateFormat = dateFormatMap[groupBy];

      // Build optional appName filter for the raw query
      const appNameCondition = appName ? `AND app_name = '${appName.replace(/'/g, "''")}'` : '';

      const adoptionQuery = `
        SELECT
          strftime('${dateFormat}', created_at) as date,
          app_version as version,
          COUNT(*) as new_installs
        FROM Installation
        WHERE created_at >= ? AND app_version != 'unknown' ${appNameCondition}
        GROUP BY strftime('${dateFormat}', created_at), app_version
        ORDER BY date DESC
      `;

      const adoptionStmt = c.env.DB.prepare(adoptionQuery).bind(sinceDate);
      const adoptionResult = await Logger.measureOperation(
        'version_analytics.adoption_timeline',
        () => adoptionStmt.all(),
        {
          metadata: { period, groupBy, dateFormat, appName: appName ?? null },
          ...requestContext
        }
      );

      const rawTimeline = (adoptionResult.results || []).map((row: any) => ({
        date: row.date as string,
        version: row.version as string,
        newInstalls: Number(row.new_installs)
      }));

      // Group by version and fill gaps for each
      const versionDateMap = new Map<string, Array<{ date: string; version: string; newInstalls: number }>>();
      for (const entry of rawTimeline) {
        if (!versionDateMap.has(entry.version)) {
          versionDateMap.set(entry.version, []);
        }
        versionDateMap.get(entry.version)!.push(entry);
      }

      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const filledTimeline: Array<{ date: string; version: string; newInstalls: number }> = [];
      for (const [version, entries] of versionDateMap) {
        const { timeline: filled } = fillTimelineGaps(
          entries,
          startDate,
          endDate,
          groupBy,
          { version, newInstalls: 0 }
        );
        filledTimeline.push(...filled);
      }

      // Sort by date descending
      filledTimeline.sort((a, b) => b.date.localeCompare(a.date));
      adoptionTimeline = filledTimeline;

      // Detect gaps across all dates (union of zero-value dates)
      const allDates = new Set<string>();
      for (const entry of adoptionTimeline) {
        allDates.add(entry.date);
      }
      const sortedDates = Array.from(allDates).sort();
      let gapStart: string | null = null;
      for (const date of sortedDates) {
        const entriesForDate = adoptionTimeline.filter(e => e.date === date);
        const allZero = entriesForDate.every(e => e.newInstalls === 0);
        if (allZero) {
          if (gapStart === null) gapStart = date;
        } else {
          if (gapStart !== null) {
            const prevDate = sortedDates[sortedDates.indexOf(date) - 1];
            const fromMs = new Date(gapStart + 'T00:00:00Z').getTime();
            const toMs = new Date(prevDate + 'T00:00:00Z').getTime();
            adoptionGaps.push({
              from: gapStart,
              to: prevDate,
              days: Math.round((toMs - fromMs) / 86400000) + 1
            });
            gapStart = null;
          }
        }
      }
      if (gapStart !== null) {
        const lastDate = sortedDates[sortedDates.length - 1];
        const fromMs = new Date(gapStart + 'T00:00:00Z').getTime();
        const toMs = new Date(lastDate + 'T00:00:00Z').getTime();
        adoptionGaps.push({
          from: gapStart,
          to: lastDate,
          days: Math.round((toMs - fromMs) / 86400000) + 1
        });
      }
    }

    const responseData = {
      versionDistribution,
      latestVersion,
      outdatedInstallations,
      newInstallRate: {
        last7Days: last7DaysResult[0]?.count ?? 0,
        last30Days: last30DaysResult[0]?.count ?? 0
      },
      adoptionTimeline,
      adoptionGaps
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
        outdatedCount: outdatedInstallations,
        adoptionTimelineEntries: adoptionTimeline.length
      }
    });

    return c.json(responseData);
});
