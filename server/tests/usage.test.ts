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
});
