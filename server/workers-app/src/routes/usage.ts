import { Hono } from 'hono';
import { queryOne, queryAll } from '../db/client';

export const usageRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usageRoutes.get('/', async (c) => {
  const now = new Date().toUTCString();

  const totalInstallations = await queryOne<{ count: number }>(
    c.env,
    'SELECT COUNT(1) as count FROM Installation',
  );

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthlyActive = await queryOne<{ count: number }>(
    c.env,
    'SELECT COUNT(DISTINCT installation_id) as count FROM Heartbeat WHERE created_at >= ?',
    since,
  );

  const countryToCount = await queryAll<{ country_code: string; count: number }>(
    c.env,
    'SELECT country_code, COUNT(1) as count FROM Installation WHERE country_code IS NOT NULL GROUP BY country_code ORDER BY count DESC',
  );

  const countByApp = async (name: string) =>
    (await queryOne<{ count: number }>(c.env, 'SELECT COUNT(1) as count FROM Installation WHERE app_name = ?', name))?.count ?? 0;

  return c.json({
    totalInstallations: totalInstallations?.count ?? 0,
    monthlyActive: monthlyActive?.count ?? 0,
    createdAt: now,
    countryToCount: countryToCount.map((r) => ({ countryCode: r.country_code, count: Number(r.count) })),
    iCloudDocker: { total: await countByApp('icloud-drive-docker') },
    haBouncie: { total: await countByApp('ha-bouncie') },
  });
});
