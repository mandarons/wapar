import { Hono } from 'hono';
import { InstallationSchema } from '../utils/validation';
import { getDb } from '../db/client';
import { installations, type NewInstallation } from '../db/schema';
import { handleValidationError, handleGenericError } from '../utils/errors';

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationRoutes.post('/', async (c) => {
  try {
    const json = await c.req.json();
    const body = InstallationSchema.parse(json);

    const db = getDb(c.env);
    const id = crypto.randomUUID();
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0';
    const now = new Date().toISOString();

    const newInstallation: NewInstallation = {
      id,
      appName: body.appName,
      appVersion: body.appVersion,
      ipAddress,
      previousId: body.previousId ?? null,
      data: body.data ? JSON.stringify(body.data) : null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(installations).values(newInstallation);

    return c.json({ id }, 201);
  } catch (error) {
    // Handle Zod validation errors
    if ((error as any).name === 'ZodError') {
      return handleValidationError(c, error);
    }
    // Handle all other errors
    return handleGenericError(c, error as Error);
  }
});
