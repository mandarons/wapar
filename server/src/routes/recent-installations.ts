import { Hono } from 'hono';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { desc, eq, and, gte, count, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { handleGenericError } from '../utils/errors';

export const recentInstallationsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

recentInstallationsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    const db = getDb(c.env);
    
    // Parse query parameters
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);
    const appName = c.req.query('appName');
    
    Logger.info('Recent installations request', {
      operation: 'recent-installations.fetch',
      metadata: { limit, offset, appName },
      ...requestContext
    });
    
    // Build query conditions
    const conditions = [];
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
    
    // Get counts for last 24h and 7d
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const count24hResult = await db.select({ count: count() })
      .from(installations)
      .where(
        conditions.length > 0 
          ? and(...conditions, gte(installations.createdAt, last24h))
          : gte(installations.createdAt, last24h)
      );
    const installationsLast24h = count24hResult[0]?.count || 0;
    
    const count7dResult = await db.select({ count: count() })
      .from(installations)
      .where(
        conditions.length > 0 
          ? and(...conditions, gte(installations.createdAt, last7d))
          : gte(installations.createdAt, last7d)
      );
    const installationsLast7d = count7dResult[0]?.count || 0;
    
    const responseData = {
      installations: recentInstallations,
      total: totalCount,
      limit,
      offset,
      installationsLast24h,
      installationsLast7d
    };
    
    Logger.success('Recent installations fetched', {
      operation: 'recent-installations.fetch',
      metadata: { 
        count: recentInstallations.length,
        total: totalCount,
        last24h: installationsLast24h,
        last7d: installationsLast7d
      }
    });
    
    return c.json(responseData);
  } catch (error) {
    Logger.error('Recent installations fetch failed', {
      operation: 'recent-installations.fetch',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
