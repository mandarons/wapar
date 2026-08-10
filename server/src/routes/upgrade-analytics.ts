import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { compareVersions } from '../utils/version';

export const upgradeAnalyticsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

upgradeAnalyticsRoutes.get('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);

  const db = getDb(c.env);
  const appName = c.req.query('appName');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Upgrade flows: aggregate from→to version pairs via LEFT JOIN on previousId
  const upgradeFlowAggStmt = c.env.DB.prepare(`
    SELECT
      prev.app_version as from_version,
      curr.app_version as to_version,
      COUNT(*) as count
    FROM Installation curr
    LEFT JOIN Installation prev ON curr.previous_id = prev.id
    WHERE curr.previous_id IS NOT NULL
      AND curr.created_at >= ?
      ${appName ? 'AND curr.app_name = ?' : ''}
    GROUP BY prev.app_version, curr.app_version
    ORDER BY count DESC
  `);

  const upgradeFlowAggResult = await Logger.measureOperation(
    'upgrade-analytics.flows_agg',
    () => appName
      ? upgradeFlowAggStmt.bind(thirtyDaysAgo, appName).all<{ from_version: string; to_version: string; count: number }>()
      : upgradeFlowAggStmt.bind(thirtyDaysAgo).all<{ from_version: string; to_version: string; count: number }>(),
    {
      metadata: { thirtyDaysAgo, appName: appName ?? null },
      ...requestContext
    }
  );

  const upgradeFlows = (upgradeFlowAggResult.results ?? []).map(row => ({
    from: row.from_version ?? 'unresolved',
    to: row.to_version,
    count: Number(row.count),
  }));

  // 2. Skip-level upgrades: adjacent version diff > 1
  const totalWithFlow = upgradeFlows.reduce((sum, f) => sum + f.count, 0);
  const skipLevelUpgrades = upgradeFlows
    .filter(f => f.from !== 'unresolved')
    .filter(f => compareVersions(f.to, f.from) > 1);
  const skipLevelCount = skipLevelUpgrades.reduce((sum, f) => sum + f.count, 0);

  // 3. Downgrade rate: toVersion < fromVersion
  const downgradeFlows = upgradeFlows
    .filter(f => f.from !== 'unresolved')
    .filter(f => compareVersions(f.to, f.from) < 0);
  const downgradeCount = downgradeFlows.reduce((sum, f) => sum + f.count, 0);

  // 4. Upgrade-then-stale (30d): upgraded in window, then lastHeartbeatAt < 30 days ago
  const upgradeThenStaleStmt = c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM Installation curr
    WHERE curr.previous_id IS NOT NULL
      AND curr.created_at >= ?
      AND curr.last_heartbeat_at IS NOT NULL
      AND curr.last_heartbeat_at < datetime(?, '-30 days')
      ${appName ? 'AND curr.app_name = ?' : ''}
  `);

  const upgradeThenStaleResult = await Logger.measureOperation(
    'upgrade-analytics.then_stale',
    () => appName
      ? upgradeThenStaleStmt.bind(thirtyDaysAgo, thirtyDaysAgo, appName).first<{ count: number }>()
      : upgradeThenStaleStmt.bind(thirtyDaysAgo, thirtyDaysAgo).first<{ count: number }>(),
    {
      metadata: { thirtyDaysAgo, appName: appName ?? null },
      ...requestContext
    }
  );
  const upgradeThenStaleCount = Number(upgradeThenStaleResult?.count ?? 0);

  // 5. Upgrades last 7d and 30d
  const upgradesCountStmt = c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM Installation
    WHERE previous_id IS NOT NULL
      AND created_at >= ?
      ${appName ? 'AND app_name = ?' : ''}
  `);

  const upgradesLast7dResult = await Logger.measureOperation(
    'upgrade-analytics.last_7d',
    () => appName
      ? upgradesCountStmt.bind(sevenDaysAgo, appName).first<{ count: number }>()
      : upgradesCountStmt.bind(sevenDaysAgo).first<{ count: number }>(),
    {
      metadata: { sinceDate: sevenDaysAgo, appName: appName ?? null },
      ...requestContext
    }
  );

  const upgradesLast30dResult = await Logger.measureOperation(
    'upgrade-analytics.last_30d',
    () => appName
      ? upgradesCountStmt.bind(thirtyDaysAgo, appName).first<{ count: number }>()
      : upgradesCountStmt.bind(thirtyDaysAgo).first<{ count: number }>(),
    {
      metadata: { sinceDate: thirtyDaysAgo, appName: appName ?? null },
      ...requestContext
    }
  );

  const responseData = {
    upgradeFlows,
    skipLevelUpgrades: {
      count: skipLevelCount,
      rate: totalWithFlow > 0 ? Math.round((skipLevelCount / totalWithFlow) * 1000) / 10 : 0,
    },
    downgradeRate: totalWithFlow > 0 ? Math.round((downgradeCount / totalWithFlow) * 1000) / 10 : 0,
    upgradeThenStale30d: {
      count: upgradeThenStaleCount,
      rate: totalWithFlow > 0 ? Math.round((upgradeThenStaleCount / totalWithFlow) * 1000) / 10 : 0,
    },
    upgradesLast7d: Number(upgradesLast7dResult?.count ?? 0),
    upgradesLast30d: Number(upgradesLast30dResult?.count ?? 0),
  };

  Logger.success('Upgrade analytics generated', {
    operation: 'upgrade-analytics.success',
    metadata: {
      upgradeFlowCount: upgradeFlows.length,
      totalWithFlow,
      skipLevelCount,
      downgradeCount,
      upgradeThenStaleCount,
      appName: appName ?? null,
    },
    ...requestContext,
  });

  return c.json(responseData);
});
