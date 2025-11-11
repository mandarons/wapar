import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { desc, eq, and, gte, count, type SQL } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { getActivityThresholdDays, getActivityCutoffDate } from '../utils/active-installations';

export const recentInstallationsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

recentInstallationsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  const db = getDb(c.env);
  
  // Parse query parameters
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);
  const appName = c.req.query('appName');
  
  // Get activity threshold from environment
  const thresholdDays = getActivityThresholdDays(c.env);
  const cutoffDate = getActivityCutoffDate(thresholdDays);
  
  Logger.info('Recent installations request', {
    operation: 'recent-installations.fetch',
    metadata: { limit, offset, appName, thresholdDays },
    ...requestContext
  });
  
  // Build query conditions
  const conditions: SQL[] = [];
  if (appName) {
      conditions.push(eq(installations.appName, appName));
    }
    
    // Get recent installations
    const recentInstallations = await Logger.measureOperation(
      'recent-installations.query',
      () => db.select()
        .from(installations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(installations.createdAt))
        .limit(limit)
        .offset(offset),
      {
        metadata: { limit, offset, hasFilter: !!appName },
        ...requestContext
      }
    );
    
    // Get total count
    const totalCountResult = await db.select({ count: count() })
      .from(installations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalCount = totalCountResult[0]?.count || 0;
    
    // Get count for installations within the activity threshold window
    const recentCountResult = await db.select({ count: count() })
      .from(installations)
      .where(
        conditions.length > 0 
          ? and(...conditions, gte(installations.createdAt, cutoffDate))
          : gte(installations.createdAt, cutoffDate)
      );
    const installationsWithinThreshold = recentCountResult[0]?.count || 0;
    
    const responseData = {
      installations: recentInstallations,
      total: totalCount,
      limit,
      offset,
      installationsWithinThreshold,
      thresholdDays
    };
    
    Logger.success('Recent installations fetched', {
      operation: 'recent-installations.fetch',
      metadata: { 
        count: recentInstallations.length,
        total: totalCount,
        withinThreshold: installationsWithinThreshold,
        thresholdDays
      }
    });
    
    return c.json(responseData);
});
