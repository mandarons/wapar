import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/client';
import { installations, type NewInstallation } from '../db/schema';
import { handleValidationError, handleGenericError } from '../utils/errors';

const installationSchema = z.object({
  appName: z.string().min(1),
  appVersion: z.string().min(1),
  previousId: z.string().optional(),
  data: z.string().optional(),
});

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = installationSchema.parse(body);
    
    const db = getDb(c.env);
    const installationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0';
    
    const newInstallation: NewInstallation = {
      id: installationId,
      appName: validatedData.appName,
      appVersion: validatedData.appVersion,
      ipAddress,
      previousId: validatedData.previousId || null,
      data: validatedData.data || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(installations).values(newInstallation);

    return c.json({ id: installationId }, 201);
  } catch (error) {
    if ((error as any).name === 'ZodError') {
      return handleValidationError(c, error as Error);
    }
    return handleGenericError(c, error as Error);
  }
});
