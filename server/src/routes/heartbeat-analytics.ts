import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations, heartbeats } from '../db/schema';
import { count, countDistinct, gte } from 'drizzle-orm';
import { handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';

export const heartbeatAnalyticsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

heartbeatAnalyticsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const db = getDb(c.env);
    const period = c.req.query('period') || '30d';
    
    const now = new Date();
    
    // Calculate time windows
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Daily Active Users (DAU)
    const dauResult = await Logger.measureOperation(
      'heartbeat-analytics.dau',
      () => db.select({ count: countDistinct(heartbeats.installationId) })
        .from(heartbeats)
        .where(gte(heartbeats.createdAt, last24h)),
      requestContext
    );
    const dau = dauResult[0]?.count ?? 0;
    
    // Weekly Active Users (WAU)
    const wauResult = await Logger.measureOperation(
      'heartbeat-analytics.wau',
      () => db.select({ count: countDistinct(heartbeats.installationId) })
        .from(heartbeats)
        .where(gte(heartbeats.createdAt, last7d)),
      requestContext
    );
    const wau = wauResult[0]?.count ?? 0;
    
    // Monthly Active Users (MAU)
    const mauResult = await Logger.measureOperation(
      'heartbeat-analytics.mau',
      () => db.select({ count: countDistinct(heartbeats.installationId) })
        .from(heartbeats)
        .where(gte(heartbeats.createdAt, last30d)),
      requestContext
    );
    const mau = mauResult[0]?.count ?? 0;
    
    // DAU/MAU ratio (engagement indicator - closer to 1 = more engaged)
    const dauMauRatio = mau > 0 ? dau / mau : 0;
    
    // Engagement levels based on heartbeat frequency
    // Use raw D1 database for complex SQL queries
    // Categories are mutually exclusive based on recent activity
    
    // Highly active: users with >7 heartbeats in last 7 days (avg >1/day)
    const highlyActiveResult = await Logger.measureOperation(
      'heartbeat-analytics.highly_active',
      () => c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM (
          SELECT installation_id, COUNT(*) as heartbeat_count
          FROM Heartbeat
          WHERE created_at >= ?
          GROUP BY installation_id
          HAVING heartbeat_count > 7
        )
      `).bind(last7d).first<{ count: number }>(),
      requestContext
    );
    const highlyActive = Number(highlyActiveResult?.count ?? 0);
    
    // Active: users with 1-7 heartbeats in last 7 days (excluding highly active)
    const activeResult = await Logger.measureOperation(
      'heartbeat-analytics.active',
      () => c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM (
          SELECT installation_id, COUNT(*) as heartbeat_count
          FROM Heartbeat
          WHERE created_at >= ?
          GROUP BY installation_id
          HAVING heartbeat_count >= 1 AND heartbeat_count <= 7
        )
      `).bind(last7d).first<{ count: number }>(),
      requestContext
    );
    const active = Number(activeResult?.count ?? 0);
    
    // Occasional: users with heartbeats in last 30d but not in last 7d
    const occasionalResult = await Logger.measureOperation(
      'heartbeat-analytics.occasional',
      () => c.env.DB.prepare(`
        SELECT COUNT(DISTINCT installation_id) as count
        FROM Heartbeat
        WHERE created_at >= ?
          AND created_at < ?
      `).bind(last30d, last7d).first<{ count: number }>(),
      requestContext
    );
    const occasional = Number(occasionalResult?.count ?? 0);
    
    // Dormant: installations with NO heartbeats in last 30 days
    const dormantResult = await Logger.measureOperation(
      'heartbeat-analytics.dormant',
      () => c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM Installation i
        WHERE NOT EXISTS (
          SELECT 1 FROM Heartbeat h
          WHERE h.installation_id = i.id
            AND h.created_at >= ?
        )
      `).bind(last30d).first<{ count: number }>(),
      requestContext
    );
    const dormant = Number(dormantResult?.count ?? 0);
    
    // Timeline - active users per day for last 30 days
    const timelineResult = await Logger.measureOperation(
      'heartbeat-analytics.timeline',
      () => c.env.DB.prepare(`
        SELECT 
          strftime('%Y-%m-%d', created_at) as date,
          COUNT(DISTINCT installation_id) as active_users,
          COUNT(*) as total_heartbeats
        FROM Heartbeat
        WHERE created_at >= ?
        GROUP BY strftime('%Y-%m-%d', created_at)
        ORDER BY date DESC
      `).bind(last30d).all<{ date: string; active_users: number; total_heartbeats: number }>(),
      requestContext
    );
    const timeline = (timelineResult?.results ?? []).map(row => ({
      date: row.date,
      activeUsers: Number(row.active_users),
      totalHeartbeats: Number(row.total_heartbeats)
    }));
    
    // Health metrics - average heartbeats per user in last 30 days
    const avgHeartbeatsResult = await Logger.measureOperation(
      'heartbeat-analytics.avg_heartbeats',
      () => c.env.DB.prepare(`
        SELECT AVG(heartbeat_count) as avg_heartbeats
        FROM (
          SELECT installation_id, COUNT(*) as heartbeat_count
          FROM Heartbeat
          WHERE created_at >= ?
          GROUP BY installation_id
        )
      `).bind(last30d).first<{ avg_heartbeats: number }>(),
      requestContext
    );
    const avgHeartbeatsPerUser = Number(avgHeartbeatsResult?.avg_heartbeats ?? 0);
    
    // Calculate average time between heartbeats (in hours)
    const avgTimeBetweenResult = await Logger.measureOperation(
      'heartbeat-analytics.avg_time_between',
      () => c.env.DB.prepare(`
        SELECT AVG(time_diff) as avg_seconds
        FROM (
          SELECT 
            installation_id,
            (julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY installation_id ORDER BY created_at))) * 86400 as time_diff
          FROM Heartbeat
          WHERE created_at >= ?
        )
        WHERE time_diff IS NOT NULL
      `).bind(last30d).first<{ avg_seconds: number }>(),
      requestContext
    );
    const avgSeconds = Number(avgTimeBetweenResult?.avg_seconds ?? 0);
    const avgHours = avgSeconds > 0 ? (avgSeconds / 3600).toFixed(1) : '0';
    
    // Churn risk - users inactive for various periods but active within 30 days
    const inactive7dResult = await Logger.measureOperation(
      'heartbeat-analytics.inactive_7d',
      () => c.env.DB.prepare(`
        SELECT COUNT(DISTINCT i.id) as count
        FROM Installation i
        WHERE NOT EXISTS (
          SELECT 1 FROM Heartbeat h 
          WHERE h.installation_id = i.id 
            AND h.created_at >= ?
        )
        AND EXISTS (
          SELECT 1 FROM Heartbeat h2 
          WHERE h2.installation_id = i.id 
            AND h2.created_at >= ?
        )
      `).bind(last7d, last30d).first<{ count: number }>(),
      requestContext
    );
    const usersInactive7Days = Number(inactive7dResult?.count ?? 0);
    
    const inactive14dResult = await Logger.measureOperation(
      'heartbeat-analytics.inactive_14d',
      () => c.env.DB.prepare(`
        SELECT COUNT(DISTINCT i.id) as count
        FROM Installation i
        WHERE NOT EXISTS (
          SELECT 1 FROM Heartbeat h 
          WHERE h.installation_id = i.id 
            AND h.created_at >= ?
        )
        AND EXISTS (
          SELECT 1 FROM Heartbeat h2 
          WHERE h2.installation_id = i.id 
            AND h2.created_at >= ?
        )
      `).bind(last14d, last30d).first<{ count: number }>(),
      requestContext
    );
    const usersInactive14Days = Number(inactive14dResult?.count ?? 0);
    
    // Users inactive for 30+ days = dormant installations (no heartbeat in last 30 days)
    // This aligns with the API spec where churn risk tracks users who haven't sent heartbeats
    const usersInactive30Days = dormant;
    
    const responseData = {
      activeUsers: {
        daily: dau,
        weekly: wau,
        monthly: mau,
        dau_mau_ratio: Math.round(dauMauRatio * 1000) / 1000
      },
      engagementLevels: {
        highlyActive: { count: highlyActive, description: ">7 heartbeats/week" },
        active: { count: active, description: "1-7 heartbeats/week" },
        occasional: { count: occasional, description: "Active in last 30d but not last 7d" },
        dormant: { count: dormant, description: "No heartbeat in 30 days" }
      },
      timeline,
      healthMetrics: {
        avgHeartbeatsPerUser: Math.round(avgHeartbeatsPerUser * 10) / 10,
        avgTimeBetweenHeartbeats: `${avgHours} hours`,
        heartbeatFailureRate: 0 // Not implemented - would need error tracking
      },
      churnRisk: {
        usersInactive7Days,
        usersInactive14Days,
        usersInactive30Days
      }
    };
    
    Logger.success('Heartbeat analytics generated', {
      operation: 'heartbeat-analytics.success',
      metadata: { dau, wau, mau, dauMauRatio: responseData.activeUsers.dau_mau_ratio },
      ...requestContext
    });
    
    return c.json(responseData);
  } catch (error) {
    Logger.error('Heartbeat analytics failed', {
      operation: 'heartbeat-analytics.error',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
