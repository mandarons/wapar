import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getBase, resetDb, d1Exec } from './utils';

describe('Empty Database Coverage Tests', () => {
  // Note: These tests must run in isolation as they reset the database
  
  beforeAll(async () => {
    // Reset database to ensure we start with zero installations
    await resetDb();
  });

  afterAll(async () => {
    // Restore a normal state after these tests so subsequent tests have data
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES ('test-restore-1', 'test', '1.0.0', '127.0.0.1', datetime('now'), datetime('now'))
    `);
    await d1Exec(`
      INSERT INTO Heartbeat (id, installation_id, created_at, updated_at)
      VALUES ('hb-restore-1', 'test-restore-1', datetime('now'), datetime('now'))
    `);
  });

  it('Usage analytics should handle zero installations gracefully', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api/usage`);
    
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // With zero installations, totalInstallations should be 0
    // This triggers the warning log on lines 114-122 in usage.ts
    expect(body.totalInstallations).toBe(0);
    expect(body.activeInstallations).toBe(0);
    expect(body.monthlyActive).toBe(0);
    expect(Array.isArray(body.countryToCount)).toBe(true);
    expect(body.countryToCount.length).toBe(0);
  });

  it('Version analytics should handle zero installations gracefully', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api/version-analytics`);
    
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // With zero installations, should trigger warning on lines 106-113 in version-analytics.ts
    expect(Array.isArray(body.versionDistribution)).toBe(true);
    expect(body.versionDistribution.length).toBe(0);
    expect(body.outdatedInstallations).toBe(0);
    expect(body.latestVersion).toBeNull();
    expect(body.upgradeRate.last7Days).toBe(0);
    expect(body.upgradeRate.last30Days).toBe(0);
  });

  it('Non-localhost POST to /api should trigger warning', async () => {
    const base = getBase();
    // Override Host header to simulate non-localhost request
    const res = await fetch(`${base}/api`, {
      method: 'POST',
      headers: {
        'Host': 'example.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    // Should return 404 and trigger warning on lines 138-142 in index.ts
    expect(res.status).toBe(404);
  });
});
