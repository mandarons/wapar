import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { count, isNull, isNotNull, gte, desc, and } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const newInstallationsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

// Helper function to round a number to one decimal place
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

newInstallationsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  const db = getDb(c.env);
  const period = c.req.query('period') || '30d';
  const groupBy = c.req.query('groupBy') || 'day';

  // Validate period and groupBy
  const periodPattern = /^\d+d$/;
  const allowedGroupBy = ['day', 'week', 'month'];
  if (!periodPattern.test(period)) {
    return c.json({ error: "Invalid 'period' parameter. Must match pattern '\\d+d' (e.g., '30d')." }, 400);
  }
  if (!allowedGroupBy.includes(groupBy)) {
      return c.json({ error: "Invalid 'groupBy' parameter. Must be one of 'day', 'week', 'month'." }, 400);
    }
    
    Logger.info('New installations analytics request', {
      operation: 'new-installations.analytics',
      metadata: { period, groupBy },
      ...requestContext
    });
    
    // Calculate date threshold based on period
    // Safe to use parseInt here as period is validated by regex above
    const daysAgo = parseInt(period.replace('d', ''), 10);
    const sinceDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    // Count new users (previousId is NULL)
    const newUsersResult = await Logger.measureOperation(
      'new-installations.count_new',
      () => db.select({ count: count() })
        .from(installations)
        .where(
          and(
            isNull(installations.previousId),
            gte(installations.createdAt, sinceDate)
          )
        ),
      {
        metadata: { sinceDate },
        ...requestContext
      }
    );
    const totalNew = newUsersResult[0]?.count ?? 0;
    
    // Count reinstalls (previousId is NOT NULL)
    const reinstallsResult = await Logger.measureOperation(
      'new-installations.count_reinstalls',
      () => db.select({ count: count() })
        .from(installations)
        .where(
          and(
            isNotNull(installations.previousId),
            gte(installations.createdAt, sinceDate)
          )
        ),
      {
        metadata: { sinceDate },
        ...requestContext
      }
    );
    const totalReinstalls = reinstallsResult[0]?.count ?? 0;
    
    // Calculate new user rate
    const total = totalNew + totalReinstalls;
    const newUserRate = total > 0 ? (totalNew / total) * 100 : 0;
    
    // Determine date format for grouping
    // Use a whitelist map to prevent SQL injection
    const dateFormatMap: Record<string, string> = {
      'day': '%Y-%m-%d',
      'week': '%Y-W%V', // ISO 8601 week number
      'month': '%Y-%m'
    };
    const dateFormat = dateFormatMap[groupBy]; // Safe because groupBy is validated above
    
    // Timeline of new vs reinstalls using raw D1 query
    // This is necessary because SQLite's strftime is not supported in Drizzle ORM
    const timelineQuery = `
      SELECT 
        strftime('${dateFormat}', created_at) as date,
        COUNT(CASE WHEN previous_id IS NULL THEN 1 END) as new_users,
        COUNT(CASE WHEN previous_id IS NOT NULL THEN 1 END) as reinstalls,
        COUNT(*) as total
      FROM Installation
      WHERE created_at >= ?
      GROUP BY strftime('${dateFormat}', created_at)
      ORDER BY date DESC
    `;
    
    const timelineStmt = c.env.DB.prepare(timelineQuery).bind(sinceDate);
    const timelineResult = await Logger.measureOperation(
      'new-installations.timeline',
      () => timelineStmt.all(),
      {
        metadata: { groupBy, dateFormat },
        ...requestContext
      }
    );
    
    const timeline = (timelineResult.results || []).map((row: any) => ({
      date: row.date,
      newUsers: Number(row.new_users),
      reinstalls: Number(row.reinstalls),
      total: Number(row.total)
    }));
    
    // Top countries for new users only
    const topCountries = await Logger.measureOperation(
      'new-installations.top_countries',
      () => db.select({
        countryCode: installations.countryCode,
        count: count()
      })
        .from(installations)
        .where(
          and(
            isNull(installations.previousId),
            gte(installations.createdAt, sinceDate),
            isNotNull(installations.countryCode)
          )
        )
        .groupBy(installations.countryCode)
        .orderBy(desc(count()))
        .limit(10),
      requestContext
    );
    
    // Calculate percentages for top countries
    const topCountriesWithPercentage = topCountries.map(c => ({
      countryCode: c.countryCode,
      count: Number(c.count),
      percentage: totalNew > 0 ? roundToOneDecimal((Number(c.count) / totalNew) * 100) : 0
    }));
    
    // Calculate reinstall rate
    const reinstallRate = total > 0 ? roundToOneDecimal((totalReinstalls / total) * 100) : 0;
    
    const responseData = {
      summary: {
        totalNew: Number(totalNew),
        totalReinstalls: Number(totalReinstalls),
        newUserRate: roundToOneDecimal(newUserRate),
        period
      },
      timeline,
      topCountriesNewUsers: topCountriesWithPercentage,
      reinstallPatterns: {
        reinstallRate
      }
    };
    
    Logger.success('New installations analytics generated', {
      operation: 'new-installations.analytics',
      metadata: { 
        totalNew,
        totalReinstalls,
        newUserRate: responseData.summary.newUserRate,
        timelineCount: timeline.length,
        topCountriesCount: topCountriesWithPercentage.length
      },
      ...requestContext
    });
    
    return c.json(responseData);
});
