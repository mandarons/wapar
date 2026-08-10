import { describe, it, expect } from 'bun:test';
import { d1Exec, getBase, resetDb, waitForCount } from './utils';

const ENDPOINT = '/api/usage';
const INSTALL_ENDPOINT = '/api/installation';
const HEARTBEAT_ENDPOINT = '/api/heartbeat';

function randomAppName() {
  const apps = ['icloud-drive-docker', 'icloud-docker', 'ha-bouncie'];
  return apps[Math.floor(Math.random() * apps.length)];
}
function randomVersion() {
  return `${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`;
}

async function createInstallation(): Promise<string> {
  const base = getBase();
  const res = await fetch(`${base}${INSTALL_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName: randomAppName(), appVersion: randomVersion() })
  });
  const body = await res.json();
  return body.id as string;
}

async function postHeartbeat(installationId: string) {
  const base = getBase();
  await fetch(`${base}${HEARTBEAT_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId })
  });
}

describe(ENDPOINT, () => {
  it('should return usage data structure', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Verify the response structure without assuming empty data
    expect(Array.isArray(body.countryToCount)).toBe(true);
    expect(Array.isArray(body.allTimeCountryToCount)).toBe(true);
    expect(typeof body.totalInstallations).toBe('number');
    expect(typeof body.monthlyActive).toBe('number');
    expect(typeof body.iCloudDocker.total).toBe('number');
    expect(typeof body.haBouncie.total).toBe('number');
    expect(body.totalInstallations).toBeGreaterThanOrEqual(0);
  });

  it('should return non-empty data after creating installations', async () => {
    // Get baseline counts
    const base = getBase();
    const initialRes = await fetch(`${base}${ENDPOINT}`);
    const initialBody = await initialRes.json();
    const initialCount = initialBody.totalInstallations;
    
    // Create two installations with geo info and heartbeats
    const id1 = await createInstallation();
    const id2 = await createInstallation();

    // Wait until installations are created
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id IN ('${id1}', '${id2}')`, 2);

    // Update geo info for the installations we just created
    await d1Exec(`UPDATE Installation SET country_code = 'US', region = 'California' WHERE id = ?`, [id1]);
    await d1Exec(`UPDATE Installation SET country_code = 'CA', region = 'Ontario' WHERE id = ?`, [id2]);

    // Create heartbeats for our installations
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), id1]);
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), id2]);

    // Update lastHeartbeatAt to make them active installations
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id IN (?, ?)`, [id1, id2]);

    // Wait for heartbeats to be created
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id IN ('${id1}', '${id2}')`, 2);

    // Fetch usage data
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify our installations are included in the counts
    expect(body.totalInstallations).toBeGreaterThanOrEqual(initialCount + 2);
    expect(body.monthlyActive).toBeGreaterThanOrEqual(2);
    
    // Verify country data includes our test countries
    const countryCodes = body.countryToCount.map((c: any) => c.countryCode);
    expect(countryCodes).toContain('US');
    expect(countryCodes).toContain('CA');
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

  it('should return earliestInstallationDate reflecting the oldest installation', async () => {
    await resetDb();
    const base = getBase();

    const id = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id}'`, 1);

    const backdated = '2026-07-10T00:00:00.000Z';
    await d1Exec(`UPDATE Installation SET created_at = ? WHERE id = ?`, [backdated, id]);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.earliestInstallationDate).toBe(backdated);
    expect(new Date(body.earliestInstallationDate).getTime()).toBeLessThan(Date.now());
  });

  it('should count both icloud-docker and icloud-drive-docker installations', async () => {
    const base = getBase();
    
    // Get initial counts
    const initialRes = await fetch(`${base}${ENDPOINT}`);
    const initialBody = await initialRes.json();
    const initialICloudTotal = initialBody.iCloudDocker.total;
    
    // Create one installation with legacy name
    const legacyRes = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'icloud-drive-docker', appVersion: '1.0.0' })
    });
    const legacyBody = await legacyRes.json();
    const legacyId = legacyBody.id as string;
    
    // Create one installation with current name
    const currentRes = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'icloud-docker', appVersion: '2.0.0' })
    });
    const currentBody = await currentRes.json();
    const currentId = currentBody.id as string;
    
    // Wait for both installations to be created
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id IN ('${legacyId}', '${currentId}')`, 2);
    
    // Fetch usage data
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Verify that both installations are counted in iCloudDocker.total
    expect(body.iCloudDocker.total).toBeGreaterThanOrEqual(initialICloudTotal + 2);
  });

  it('should include allTimeCountryToCount with stale installations', async () => {
    await resetDb();
    const base = getBase();

    // Create an active installation (with heartbeat)
    const activeId = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${activeId}'`, 1);
    await d1Exec(`UPDATE Installation SET country_code = 'US' WHERE id = ?`, [activeId]);
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), activeId]);
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id = ?`, [activeId]);
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${activeId}'`, 1);

    // Create a stale installation (no heartbeat)
    const staleId = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${staleId}'`, 1);
    await d1Exec(`UPDATE Installation SET country_code = 'JP' WHERE id = ?`, [staleId]);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Active countryToCount should only have US
    const activeCodes = body.countryToCount.map((c: any) => c.countryCode);
    expect(activeCodes).toContain('US');

    // allTimeCountryToCount should have both US and JP
    const allTimeCodes = body.allTimeCountryToCount.map((c: any) => c.countryCode);
    expect(allTimeCodes).toContain('US');
    expect(allTimeCodes).toContain('JP');

    // JP should appear in allTime but not in active
    expect(activeCodes).not.toContain('JP');
  });

  it('should filter totalInstallations by appName', async () => {
    await resetDb();
    const base = getBase();

    // Create installations for specific apps
    const icloudRes = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'icloud-docker', appVersion: '1.0.0' })
    });
    const icloudBody = await icloudRes.json();
    const icloudId = icloudBody.id as string;

    const bouncieRes = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'ha-bouncie', appVersion: '2.0.0' })
    });
    const bouncieBody = await bouncieRes.json();
    const bouncieId = bouncieBody.id as string;

    await waitForCount(
      'SELECT COUNT(1) as count FROM Installation WHERE id IN (?, ?)',
      [icloudId, bouncieId],
      2
    );

    // Filter by icloud-docker
    const icloudUsage = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    expect(icloudUsage.status).toBe(200);
    const icloudData = await icloudUsage.json();
    expect(icloudData.totalInstallations).toBeGreaterThanOrEqual(1);

    // Filter by ha-bouncie
    const bouncieUsage = await fetch(`${base}${ENDPOINT}?appName=ha-bouncie`);
    expect(bouncieUsage.status).toBe(200);
    const bouncieData = await bouncieUsage.json();
    expect(bouncieData.totalInstallations).toBeGreaterThanOrEqual(1);

    // Without filter should include both
    const allUsage = await fetch(`${base}${ENDPOINT}`);
    const allData = await allUsage.json();
    expect(allData.totalInstallations).toBeGreaterThanOrEqual(2);
  });

  it('should filter country counts by appName', async () => {
    await resetDb();
    const base = getBase();

    // Create active installation for icloud-docker with US country
    const icloudId = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${icloudId}'`, 1);
    await d1Exec(`UPDATE Installation SET app_name = 'icloud-docker', country_code = 'US' WHERE id = ?`, [icloudId]);
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), icloudId]);
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id = ?`, [icloudId]);
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${icloudId}'`, 1);

    // Create active installation for ha-bouncie with JP country
    const bouncieId = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${bouncieId}'`, 1);
    await d1Exec(`UPDATE Installation SET app_name = 'ha-bouncie', country_code = 'JP' WHERE id = ?`, [bouncieId]);
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), bouncieId]);
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id = ?`, [bouncieId]);
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${bouncieId}'`, 1);

    // Filter by icloud-docker should only show US
    const icloudUsage = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    const icloudData = await icloudUsage.json();
    const icloudCodes = icloudData.countryToCount.map((c: any) => c.countryCode);
    expect(icloudCodes).toContain('US');
    expect(icloudCodes).not.toContain('JP');

    // Filter by ha-bouncie should only show JP
    const bouncieUsage = await fetch(`${base}${ENDPOINT}?appName=ha-bouncie`);
    const bouncieData = await bouncieUsage.json();
    const bouncieCodes = bouncieData.countryToCount.map((c: any) => c.countryCode);
    expect(bouncieCodes).toContain('JP');
    expect(bouncieCodes).not.toContain('US');

    // Without filter should show both
    const allUsage = await fetch(`${base}${ENDPOINT}`);
    const allData = await allUsage.json();
    const allCodes = allData.countryToCount.map((c: any) => c.countryCode);
    expect(allCodes).toContain('US');
    expect(allCodes).toContain('JP');
  });

  it('should return zero counts for non-existent appName', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}?appName=nonexistent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalInstallations).toBe(0);
    expect(body.activeInstallations).toBe(0);
    expect(body.countryToCount).toEqual([]);
  });

  it('should filter monthly active by appName', async () => {
    await resetDb();
    const base = getBase();

    // Create installation for a specific app
    const res = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'ha-bouncie', appVersion: '1.0.0' })
    });
    const body = await res.json();
    const id = body.id as string;

    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id}'`, 1);
    await d1Exec(`INSERT INTO Heartbeat (id, installation_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [crypto.randomUUID(), id]);
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${id}'`, 1);

    // Filter by ha-bouncie
    const bouncieUsage = await fetch(`${base}${ENDPOINT}?appName=ha-bouncie`);
    const bouncieData = await bouncieUsage.json();
    expect(bouncieData.monthlyActive).toBeGreaterThanOrEqual(1);

    // Filter by icloud-docker should not include it
    const icloudUsage = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    const icloudData = await icloudUsage.json();
    expect(icloudData.monthlyActive).toBe(0);
  });
});
