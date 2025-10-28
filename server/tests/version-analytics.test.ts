import { describe, it, expect } from 'vitest';
import { getBase, waitForCount } from './utils';

const ENDPOINT = '/api/version-analytics';
const INSTALL_ENDPOINT = '/api/installation';

function randomAppName() {
  const apps = ['icloud-drive-docker', 'icloud-docker', 'ha-bouncie'];
  return apps[Math.floor(Math.random() * apps.length)];
}

async function createInstallation(appVersion: string): Promise<string> {
  const base = getBase();
  const res = await fetch(`${base}${INSTALL_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName: randomAppName(), appVersion })
  });
  const body = await res.json();
  return body.id as string;
}

describe(ENDPOINT, () => {
  it('should return version analytics data structure', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Verify the response structure
    expect(Array.isArray(body.versionDistribution)).toBe(true);
    expect(typeof body.outdatedInstallations).toBe('number');
    expect(body.latestVersion === null || typeof body.latestVersion === 'string').toBe(true);
    expect(typeof body.upgradeRate).toBe('object');
    expect(typeof body.upgradeRate.last7Days).toBe('number');
    expect(typeof body.upgradeRate.last30Days).toBe('number');
  });

  it('should return correct version distribution with counts and percentages', async () => {
    // Get baseline
    const base = getBase();
    const initialRes = await fetch(`${base}${ENDPOINT}`);
    const initialBody = await initialRes.json();
    const initialTotal = initialBody.versionDistribution.reduce(
      (sum: number, v: any) => sum + v.count, 
      0
    );
    
    // Create installations with specific versions
    const id1 = await createInstallation('2.1.0');
    const id2 = await createInstallation('2.1.0');
    const id3 = await createInstallation('2.0.5');
    const id4 = await createInstallation('1.9.8');

    // Wait for installations to be created
    await waitForCount(
      'SELECT COUNT(1) as count FROM Installation WHERE id IN (?, ?, ?, ?)',
      [id1, id2, id3, id4],
      4
    );

    // Fetch version analytics
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify total count increased
    const totalCount = body.versionDistribution.reduce(
      (sum: number, v: any) => sum + v.count, 
      0
    );
    expect(totalCount).toBeGreaterThanOrEqual(initialTotal + 4);

    // Find our test versions
    const version210 = body.versionDistribution.find((v: any) => v.version === '2.1.0');
    const version205 = body.versionDistribution.find((v: any) => v.version === '2.0.5');
    const version198 = body.versionDistribution.find((v: any) => v.version === '1.9.8');

    // Verify counts
    expect(version210).toBeDefined();
    expect(version210.count).toBeGreaterThanOrEqual(2);
    expect(version205).toBeDefined();
    expect(version205.count).toBeGreaterThanOrEqual(1);
    expect(version198).toBeDefined();
    expect(version198.count).toBeGreaterThanOrEqual(1);

    // Verify percentages are calculated correctly
    body.versionDistribution.forEach((v: any) => {
      expect(v.percentage).toBeGreaterThanOrEqual(0);
      expect(v.percentage).toBeLessThanOrEqual(100);
      expect(typeof v.percentage).toBe('number');
      expect(typeof v.count).toBe('number');
      expect(typeof v.version).toBe('string');
    });

    // Verify all percentages sum to approximately 100%
    const totalPercentage = body.versionDistribution.reduce(
      (sum: number, v: any) => sum + v.percentage, 
      0
    );
    expect(totalPercentage).toBeCloseTo(100, 1);
  });

  it('should identify latest version correctly', async () => {
    const base = getBase();
    
    // Create installations with different versions
    const id1 = await createInstallation('3.0.0');
    const id2 = await createInstallation('2.9.9');
    const id3 = await createInstallation('3.0.0');

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN ('${id1}', '${id2}', '${id3}')`, 
      3
    );

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Latest version should be the one with highest count (or first in distribution)
    expect(body.latestVersion).toBeTruthy();
    expect(typeof body.latestVersion).toBe('string');
    
    // Verify latest version exists in the distribution
    const latestVersionInDistribution = body.versionDistribution.find(
      (v: any) => v.version === body.latestVersion
    );
    expect(latestVersionInDistribution).toBeDefined();
    
    // Latest version should be the first item (highest count)
    expect(body.versionDistribution[0].version).toBe(body.latestVersion);
  });

  it('should calculate outdated installations correctly', async () => {
    const base = getBase();
    
    // Create a mix of versions
    const id1 = await createInstallation('4.0.0');
    const id2 = await createInstallation('4.0.0');
    const id3 = await createInstallation('4.0.0');
    const id4 = await createInstallation('3.9.9');
    const id5 = await createInstallation('3.8.0');

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN ('${id1}', '${id2}', '${id3}', '${id4}', '${id5}')`, 
      5
    );

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify outdated installations count
    expect(typeof body.outdatedInstallations).toBe('number');
    expect(body.outdatedInstallations).toBeGreaterThanOrEqual(0);
    
    // If we have a latest version, outdated should be less than total
    if (body.latestVersion) {
      const totalInstallations = body.versionDistribution.reduce(
        (sum: number, v: any) => sum + v.count, 
        0
      );
      expect(body.outdatedInstallations).toBeLessThan(totalInstallations);
    }
  });

  it('should track upgrade rates for last 7 and 30 days', async () => {
    const base = getBase();
    
    // Create a recent installation (will have recent updatedAt)
    const id1 = await createInstallation('5.0.0');
    await waitForCount(`SELECT COUNT(1) as count FROM Installation WHERE id = '${id1}'`, 1);

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify upgrade rate structure
    expect(typeof body.upgradeRate.last7Days).toBe('number');
    expect(typeof body.upgradeRate.last30Days).toBe('number');
    expect(body.upgradeRate.last7Days).toBeGreaterThanOrEqual(0);
    expect(body.upgradeRate.last30Days).toBeGreaterThanOrEqual(0);
    
    // 30-day count should be >= 7-day count
    expect(body.upgradeRate.last30Days).toBeGreaterThanOrEqual(body.upgradeRate.last7Days);
    
    // At least our newly created installation should be counted
    expect(body.upgradeRate.last7Days).toBeGreaterThanOrEqual(1);
    expect(body.upgradeRate.last30Days).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty database gracefully', async () => {
    // This test assumes we might have data, so we check the structure is valid
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Even with empty data, structure should be valid
    expect(Array.isArray(body.versionDistribution)).toBe(true);
    expect(typeof body.outdatedInstallations).toBe('number');
    expect(body.upgradeRate).toBeDefined();
  });

  it('should return versions ordered by count descending', async () => {
    const base = getBase();
    
    // Create installations with varying counts
    const id1 = await createInstallation('6.0.0');
    const id2 = await createInstallation('6.0.0');
    const id3 = await createInstallation('6.0.0');
    const id4 = await createInstallation('5.9.0');

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN ('${id1}', '${id2}', '${id3}', '${id4}')`, 
      4
    );

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify versions are ordered by count (descending)
    if (body.versionDistribution.length > 1) {
      for (let i = 0; i < body.versionDistribution.length - 1; i++) {
        expect(body.versionDistribution[i].count)
          .toBeGreaterThanOrEqual(body.versionDistribution[i + 1].count);
      }
    }
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

  it('should calculate percentages to 2 decimal places', async () => {
    const base = getBase();
    
    // Create installations to test percentage precision
    const id1 = await createInstallation('7.0.0');
    const id2 = await createInstallation('7.0.0');
    const id3 = await createInstallation('7.0.0');

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN ('${id1}', '${id2}', '${id3}')`, 
      3
    );

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Check that percentages have at most 2 decimal places
    body.versionDistribution.forEach((v: any) => {
      const decimalPlaces = v.percentage.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  it('should handle version strings of various formats', async () => {
    const base = getBase();
    
    // Create installations with different version formats
    const versions = ['1.0', '2.0.0', '3.0.0-beta', 'v4.0.0', 'latest'];
    const ids: string[] = [];
    
    for (const version of versions) {
      const id = await createInstallation(version);
      ids.push(id);
    }

    await waitForCount(
      `SELECT COUNT(1) as count FROM Installation WHERE id IN ('${ids.join("','")}')`, 
      versions.length
    );

    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify all version formats are present in distribution
    const returnedVersions = body.versionDistribution.map((v: any) => v.version);
    
    versions.forEach(version => {
      expect(returnedVersions).toContain(version);
    });
  });
});
