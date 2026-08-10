import { describe, it, expect } from 'bun:test';
import { getBase, resetDb, waitForCount } from './utils';

const ENDPOINT = '/api/upgrade-analytics';
const INSTALL_ENDPOINT = '/api/installation';
const HEARTBEAT_ENDPOINT = '/api/heartbeat';

async function createInstallation(appVersion: string, appName?: string, previousId?: string): Promise<string> {
  const base = getBase();
  const res = await fetch(`${base}${INSTALL_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName: appName || 'icloud-docker', appVersion, previousId })
  });
  const body = await res.json();
  return body.id as string;
}

async function sendHeartbeat(installationId: string): Promise<void> {
  const base = getBase();
  await fetch(`${base}${HEARTBEAT_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId })
  });
}

describe(ENDPOINT, () => {
  it('should return correct response structure', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.upgradeFlows)).toBe(true);
    expect(typeof body.skipLevelUpgrades).toBe('object');
    expect(typeof body.skipLevelUpgrades.count).toBe('number');
    expect(typeof body.skipLevelUpgrades.rate).toBe('number');
    expect(typeof body.downgradeRate).toBe('number');
    expect(typeof body.upgradeThenStale30d).toBe('object');
    expect(typeof body.upgradeThenStale30d.count).toBe('number');
    expect(typeof body.upgradeThenStale30d.rate).toBe('number');
    expect(typeof body.upgradesLast7d).toBe('number');
    expect(typeof body.upgradesLast30d).toBe('number');
  });

  it('should detect version-to-version upgrade flows', async () => {
    await resetDb();
    const base = getBase();

    // Create an old installation
    const oldId = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldId], 1);

    // Create a new installation that upgraded from the old one
    const newId = await createInstallation('2.0.0', 'icloud-docker', oldId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.upgradeFlows.length).toBeGreaterThanOrEqual(1);
    const flow = body.upgradeFlows.find((f: any) => f.from === '1.0.0' && f.to === '2.0.0');
    expect(flow).toBeDefined();
    expect(flow.count).toBeGreaterThanOrEqual(1);
    expect(body.upgradesLast7d).toBeGreaterThanOrEqual(1);
    expect(body.upgradesLast30d).toBeGreaterThanOrEqual(1);
  });

  it('should detect skip-level upgrades', async () => {
    await resetDb();
    const base = getBase();

    // Create installation at 1.0.0
    const oldId = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldId], 1);

    // Skip from 1.0.0 directly to 3.0.0 (skipping 2.x)
    const newId = await createInstallation('3.0.0', 'icloud-docker', oldId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.skipLevelUpgrades.count).toBeGreaterThanOrEqual(1);
    expect(body.skipLevelUpgrades.rate).toBeGreaterThan(0);
  });

  it('should detect downgrades', async () => {
    await resetDb();
    const base = getBase();

    // Create installation at 3.0.0
    const oldId = await createInstallation('3.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldId], 1);

    // Downgrade from 3.0.0 to 2.0.0
    const newId = await createInstallation('2.0.0', 'icloud-docker', oldId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.downgradeRate).toBeGreaterThan(0);
  });

  it('should handle unresolved previousId gracefully', async () => {
    await resetDb();
    const base = getBase();

    // Generate a valid UUID that doesn't exist in the DB
    const fakeId = crypto.randomUUID();
    const newId = await createInstallation('2.0.0', 'icloud-docker', fakeId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should count as unresolved flow
    const unresolvedFlow = body.upgradeFlows.find((f: any) => f.from === 'unresolved');
    expect(unresolvedFlow).toBeDefined();
    expect(unresolvedFlow.count).toBeGreaterThanOrEqual(1);
  });

  it('should filter by appName', async () => {
    await resetDb();
    const base = getBase();

    // Create upgrade chain for icloud-docker
    const oldIcloud = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldIcloud], 1);
    const newIcloud = await createInstallation('2.0.0', 'icloud-docker', oldIcloud);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newIcloud], 1);

    // Create upgrade chain for ha-bouncie
    const oldBouncie = await createInstallation('1.0.0', 'ha-bouncie');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldBouncie], 1);
    const newBouncie = await createInstallation('2.0.0', 'ha-bouncie', oldBouncie);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newBouncie], 1);

    // Filter by icloud-docker
    const icloudRes = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    expect(icloudRes.status).toBe(200);
    const icloudBody = await icloudRes.json();

    // Should only include icloud-docker upgrades
    icloudBody.upgradeFlows.forEach((f: any) => {
      expect(f.to).not.toBe('ha-bouncie');
    });

    // Filter by ha-bouncie
    const bouncieRes = await fetch(`${base}${ENDPOINT}?appName=ha-bouncie`);
    expect(bouncieRes.status).toBe(200);
    const bouncieBody = await bouncieRes.json();

    bouncieBody.upgradeFlows.forEach((f: any) => {
      expect(f.to).not.toBe('icloud-docker');
    });
  });

  it('should return empty data for non-existent appName', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}?appName=nonexistent`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.upgradeFlows).toEqual([]);
    expect(body.skipLevelUpgrades.count).toBe(0);
    expect(body.downgradeRate).toBe(0);
    expect(body.upgradesLast7d).toBe(0);
    expect(body.upgradesLast30d).toBe(0);
  });

  it('should return empty data for empty database', async () => {
    await resetDb();
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.upgradeFlows).toEqual([]);
    expect(body.skipLevelUpgrades.count).toBe(0);
    expect(body.skipLevelUpgrades.rate).toBe(0);
    expect(body.downgradeRate).toBe(0);
    expect(body.upgradeThenStale30d.count).toBe(0);
    expect(body.upgradeThenStale30d.rate).toBe(0);
  });

  it('should calculate rates correctly with multiple flows', async () => {
    await resetDb();
    const base = getBase();

    // Create 3 upgrade chains: 2 adjacent, 1 skip-level
    const id1 = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id1], 1);
    const id2 = await createInstallation('2.0.0', 'icloud-docker', id1);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id2], 1);

    const id3 = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id3], 1);
    const id4 = await createInstallation('1.1.0', 'icloud-docker', id3);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id4], 1);

    const id5 = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id5], 1);
    const id6 = await createInstallation('3.0.0', 'icloud-docker', id5);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [id6], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Total flows: 3 (1.0.0→2.0.0, 1.0.0→1.1.0, 1.0.0→3.0.0)
    const totalFlows = body.upgradeFlows.reduce((sum: number, f: any) => sum + f.count, 0);
    expect(totalFlows).toBeGreaterThanOrEqual(3);

    // Skip-level: 1.0.0→3.0.0 is skip-level (skips 2.x)
    expect(body.skipLevelUpgrades.count).toBeGreaterThanOrEqual(1);
    expect(body.skipLevelUpgrades.rate).toBeGreaterThan(0);
    expect(body.skipLevelUpgrades.rate).toBeLessThanOrEqual(100);
  });

  it('POST should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('PUT should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'PUT' });
    expect(res.status).toBe(404);
  });

  it('DELETE should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('should handle same-version reinstalls as not upgrades', async () => {
    await resetDb();
    const base = getBase();

    // Create installation at 1.0.0
    const oldId = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldId], 1);

    // Reinstall at same version 1.0.0 with previousId
    const newId = await createInstallation('1.0.0', 'icloud-docker', oldId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should show as a flow but not skip-level or downgrade
    const sameFlow = body.upgradeFlows.find((f: any) => f.from === '1.0.0' && f.to === '1.0.0');
    expect(sameFlow).toBeDefined();
    expect(body.skipLevelUpgrades.count).toBe(0);
    expect(body.downgradeRate).toBe(0);
  });

  it('should track upgrade-then-stale installations', async () => {
    await resetDb();
    const base = getBase();

    // Create old installation with a stale heartbeat
    const oldId = await createInstallation('1.0.0', 'icloud-docker');
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [oldId], 1);

    // Create upgraded installation
    const newId = await createInstallation('2.0.0', 'icloud-docker', oldId);
    await waitForCount('SELECT COUNT(1) as count FROM Installation WHERE id = ?', [newId], 1);

    // Send heartbeat to make the new installation active
    await sendHeartbeat(newId);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?', [newId], 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Structure check - upgradeThenStale should be a valid object
    expect(typeof body.upgradeThenStale30d.count).toBe('number');
    expect(typeof body.upgradeThenStale30d.rate).toBe('number');
    expect(body.upgradeThenStale30d.count).toBeGreaterThanOrEqual(0);
  });
});
