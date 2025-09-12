import { Hono } from 'hono';
import { HeartbeatSchema } from '../utils/validation';
import { getDb } from '../db/client';
import { installations, heartbeats, type NewHeartbeat } from '../db/schema';
import { NotFoundError, handleValidationError, handleGenericError } from '../utils/errors';
import { eq, and, gte, lte } from 'drizzle-orm';

export const heartbeatRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

heartbeatRoutes.post('/', async (c) => {
  try {
    const json = await c.req.json();
    const body = HeartbeatSchema.parse(json);

    const db = getDb(c.env);

    // Verify installation exists
    const installation = await db.select({ id: installations.id })
      .from(installations)
      .where(eq(installations.id, body.installationId))
      .limit(1);

    if (!installation.length) {
      throw new NotFoundError('Installation not found.');
    }

    // Check if a heartbeat exists for today (UTC)
    const start = new Date(); start.setUTCHours(0,0,0,0);
    const end = new Date(); end.setUTCHours(23,59,59,999);

    const existing = await db.select({ id: heartbeats.id })
      .from(heartbeats)
      .where(and(
        eq(heartbeats.installationId, body.installationId),
        gte(heartbeats.createdAt, start.toISOString()),
        lte(heartbeats.createdAt, end.toISOString())
      ))
      .limit(1);

    if (!existing.length) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newHeartbeat: NewHeartbeat = {
        id,
        installationId: body.installationId,
        data: body.data ? JSON.stringify(body.data) : null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(heartbeats).values(newHeartbeat);
    }
    return c.json({ id: body.installationId }, 201);
  } catch (error) {
    // Handle Zod validation errors
    if ((error as any).name === 'ZodError') {
      return handleValidationError(c, error);
    }
    // Handle custom HTTP errors with statusCode
    if (error instanceof NotFoundError) {
      return c.json({ 
        message: error.message, 
        statusCode: error.status 
      }, error.status as any);
    }
    // Handle all other errors
    return handleGenericError(c, error as Error);
  }
});
