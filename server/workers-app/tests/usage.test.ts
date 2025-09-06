import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, d1Exec, getBase, waitForCount } from './utils';

const ENDPOINT = '/api/usage';
const INSTALL_ENDPOINT = '/api/installation';
const HEARTBEAT_ENDPOINT = '/api/heartbeat';

async function createInstallation(appName: string, appVersion: string) {
  const base = getBase();
  const res = await fetch(`${base}${INSTALL_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName, appVersion })
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
  beforeEach(async () => {
    await resetDb();
    // Ensure DB really empty before starting assertions
    await waitForCount('SELECT COUNT(1) as count FROM Installation', 0);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat', 0);
  });

  it('should return empty data', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.countryToCount)).toBe(true);
    expect(body.countryToCount.length).toBe(0);
    expect(body.totalInstallations).toBe(0);
    expect(body.monthlyActive).toBe(0);
    expect(body.iCloudDocker.total).toBe(0);
    expect(body.haBouncie.total).toBe(0);
  });

  it('should return non-empty data', async () => {
    // Create two installations with geo info and heartbeats
    const id1 = await createInstallation('icloud-drive-docker', '1.0.0');
    const id2 = await createInstallation('ha-bouncie', '2.0.0');

    // Wait until two installations exist
    await waitForCount('SELECT COUNT(1) as count FROM Installation', 2);

    // Patch geo info directly in D1 (route does not accept geo fields)
    await d1Exec(`UPDATE Installation SET country_code = 'US', region = 'CA' WHERE id = '${id1}'`);
    await d1Exec(`UPDATE Installation SET country_code = 'DE', region = 'BE' WHERE id = '${id2}'`);

    // Heartbeats
    await postHeartbeat(id1);
    await postHeartbeat(id2);
    await postHeartbeat(id2); // second heartbeat same day shouldn't increment monthlyActive beyond distinct count

    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalInstallations).toBe(2);
    expect(Array.isArray(body.countryToCount)).toBe(true);
    expect(body.countryToCount.length).toBe(2);
    expect(body.monthlyActive).toBe(2);
    expect(body.iCloudDocker.total).toBe(1);
    expect(body.haBouncie.total).toBe(1);
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
});
