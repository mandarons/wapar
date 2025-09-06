import { Hono } from 'hono';
import { InstallationSchema } from '../utils/validation';
import { execute } from '../db/client';

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationRoutes.post('/', async (c) => {
  const json = await c.req.json();
  const body = InstallationSchema.parse(json);

  const id = crypto.randomUUID();
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0';
  const now = new Date().toISOString();

  await execute(
    c.env,
    `INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.appName,
    body.appVersion,
    ipAddress,
    body.previousId ?? null,
    null,
    now,
    now,
  );

  return c.json({ id }, 201);
});
