import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, d1QueryOne, getBase, waitForCount } from './utils';

const ENDPOINT = '/api/heartbeat';
const INSTALL_ENDPOINT = '/api/installation';

function randomAppName() {
  const apps = ['icloud-drive-docker', 'ha-bouncie'];
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

describe(ENDPOINT, () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('POST should succeed and create one record', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(installationId);

    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const countRow = await d1QueryOne<{ count: number }>(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(Number(countRow?.count ?? 0)).toBe(1);
  });

  it('POST twice in same day should not create duplicate record', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    await fetch(`${base}${ENDPOINT}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installationId }) });
    await fetch(`${base}${ENDPOINT}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installationId }) });

    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const countRow = await d1QueryOne<{ count: number }>(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(Number(countRow?.count ?? 0)).toBe(1);
  });

  it('POST should fail for non-existent installation', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId: crypto.randomUUID() })
    });
    expect(res.status).toBe(404);
  });

  it('POST should fail for invalid data', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    expect(res.status).toBe(400);
  });

  it('GET should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
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
