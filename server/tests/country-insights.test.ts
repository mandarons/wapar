import { describe, it, expect } from 'bun:test';
import { d1Exec, getBase, resetDb, waitForCount } from './utils';

const ENDPOINT = '/api/country-insights';
const INSTALL_ENDPOINT = '/api/installation';

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

describe(ENDPOINT, () => {
  it('should return empty countries when no data exists', async () => {
    await resetDb();
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.countries)).toBe(true);
    expect(body.countries).toHaveLength(0);
    expect(body.period).toBe('30d');
    expect(typeof body.activityThresholdDays).toBe('number');
    expect(typeof body.generatedAt).toBe('string');
  });

  it('should return country insights with new and active installations', async () => {
    await resetDb();
    const base = getBase();

    // Create installations with different countries
    const id1 = await createInstallation();
    const id2 = await createInstallation();
    const id3 = await createInstallation();
    const id4 = await createInstallation();

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN (?, ?, ?, ?)`,
      [id1, id2, id3, id4],
      4
    );

    // Set country codes: US gets 3, CA gets 1
    await d1Exec(`UPDATE Installation SET country_code = 'US' WHERE id IN (?, ?, ?)`, [id1, id2, id3]);
    await d1Exec(`UPDATE Installation SET country_code = 'CA' WHERE id = ?`, [id4]);

    // Make US installations active (recent heartbeat), CA stays inactive
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id IN (?, ?)`, [id1, id2]);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.countries)).toBe(true);
    expect(body.countries.length).toBeGreaterThanOrEqual(2);

    // Find US and CA entries
    const us = body.countries.find((c: any) => c.countryCode === 'US');
    const ca = body.countries.find((c: any) => c.countryCode === 'CA');

    expect(us).toBeDefined();
    expect(us.new30d).toBeGreaterThanOrEqual(3);
    expect(us.active).toBeGreaterThanOrEqual(2);
    expect(us.total).toBeGreaterThanOrEqual(3);
    expect(us.new30dShare).toBeGreaterThan(0);
    expect(us.activeRate).toBeGreaterThan(0);

    expect(ca).toBeDefined();
    expect(ca.new30d).toBeGreaterThanOrEqual(1);
    expect(ca.active).toBe(0);
    expect(ca.activeRate).toBe(0);
  });

  it('should compute new30dShare as percentage of total new installs', async () => {
    await resetDb();
    const base = getBase();

    const id1 = await createInstallation();
    const id2 = await createInstallation();

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN (?, ?)`,
      [id1, id2],
      2
    );

    await d1Exec(`UPDATE Installation SET country_code = 'US' WHERE id = ?`, [id1]);
    await d1Exec(`UPDATE Installation SET country_code = 'CA' WHERE id = ?`, [id2]);

    const res = await fetch(`${base}${ENDPOINT}`);
    const body = await res.json();

    const totalShare = body.countries.reduce((sum: number, c: any) => sum + c.new30dShare, 0);
    expect(totalShare).toBeCloseTo(100, 0);
  });

  it('should sort countries by new30d descending', async () => {
    await resetDb();
    const base = getBase();

    const id1 = await createInstallation();
    const id2 = await createInstallation();
    const id3 = await createInstallation();

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN (?, ?, ?)`,
      [id1, id2, id3],
      3
    );

    await d1Exec(`UPDATE Installation SET country_code = 'US' WHERE id IN (?, ?)`, [id1, id2]);
    await d1Exec(`UPDATE Installation SET country_code = 'CA' WHERE id = ?`, [id3]);

    const res = await fetch(`${base}${ENDPOINT}`);
    const body = await res.json();

    expect(body.countries.length).toBeGreaterThanOrEqual(2);
    expect(body.countries[0].new30d).toBeGreaterThanOrEqual(body.countries[1].new30d);
  });

  it('should handle installations with null country_code gracefully', async () => {
    await resetDb();
    const base = getBase();

    const id = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id}'`, 1);

    // Don't set country_code — should be excluded from insights
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.countries)).toBe(true);
    // null country_code installations should not appear
    const nullCountry = body.countries.find((c: any) => c.countryCode === null);
    expect(nullCountry).toBeUndefined();
  });

  it('should return 0 activeRate when new30d is 0 for a country', async () => {
    await resetDb();
    const base = getBase();

    const id = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id}'`, 1);

    // Set country but backdate created_at to outside 30d window
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    await d1Exec(`UPDATE Installation SET country_code = 'US', created_at = ? WHERE id = ?`, [oldDate, id]);
    await d1Exec(`UPDATE Installation SET last_heartbeat_at = datetime('now') WHERE id = ?`, [id]);

    const res = await fetch(`${base}${ENDPOINT}`);
    const body = await res.json();

    const us = body.countries.find((c: any) => c.countryCode === 'US');
    // US has active installs but no new installs in last 30 days
    expect(us).toBeDefined();
    expect(us.new30d).toBe(0);
    expect(us.active).toBeGreaterThanOrEqual(1);
    // activeRate should be 0 because new30d is 0 (division guard)
    expect(us.activeRate).toBe(0);
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

  it('should return 0 new30dShare when total new installs is 0', async () => {
    await resetDb();
    const base = getBase();

    const id = await createInstallation();
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id}'`, 1);

    // Backdate created_at outside 30d window
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    await d1Exec(`UPDATE Installation SET country_code = 'US', created_at = ? WHERE id = ?`, [oldDate, id]);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Country appears from totalByCountry but has 0 new30d
    expect(body.countries.length).toBeGreaterThanOrEqual(1);
    const us = body.countries.find((c: any) => c.countryCode === 'US');
    expect(us).toBeDefined();
    expect(us.new30d).toBe(0);
    // new30dShare should be 0 because totalNew30d is 0
    expect(us.new30dShare).toBe(0);
  });

  it('should handle generic error header', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      headers: { 'X-Test-Generic-Error': 'true' }
    });
    expect(res.status).toBe(500);
  });
});
