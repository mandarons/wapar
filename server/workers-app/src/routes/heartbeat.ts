import { Hono } from 'hono';
import { HeartbeatSchema } from '../utils/validation';
import { queryOne, execute } from '../db/client';
import { NotFoundError, handleValidationError, handleGenericError } from '../utils/errors';

export const heartbeatRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

heartbeatRoutes.post('/', async (c) => {
  try {
    const json = await c.req.json();
    const body = HeartbeatSchema.parse(json);

    // Verify installation exists
    const installation = await queryOne<{ id: string }>(
      c.env,
      'SELECT id FROM Installation WHERE id = ? LIMIT 1',
      body.installationId,
    );
    if (!installation) {
      throw new NotFoundError('Installation not found.');
    }

    // Check if a heartbeat exists for today (UTC)
    const start = new Date(); start.setUTCHours(0,0,0,0);
    const end = new Date(); end.setUTCHours(23,59,59,999);

    const existing = await queryOne<{ id: string }>(
      c.env,
      'SELECT id FROM Heartbeat WHERE installation_id = ? AND created_at BETWEEN ? AND ? LIMIT 1',
      body.installationId,
      start.toISOString(),
      end.toISOString(),
    );

    if (!existing) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await execute(
        c.env,
        'INSERT INTO Heartbeat (id, installation_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        id,
        body.installationId,
        body.data ? JSON.stringify(body.data) : null,
        now,
        now,
      );
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
