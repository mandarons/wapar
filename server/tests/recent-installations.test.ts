import { describe, it, expect } from 'vitest';
import { getBase, d1Exec } from './utils';

const ENDPOINT = '/api/recent-installations';

// Helper to generate unique IDs
let testCounter = 0;
function getUniqueId() {
  return `test-${Date.now()}-${++testCounter}`;
}

describe('Recent Installations API', () => {
  it('should return recent installations with correct structure', async () => {
    const base = getBase();
    
    // Create a test installation
    const id = getUniqueId();
    const now = new Date().toISOString();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES (?, 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?)
    `, [id, now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}?limit=50`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('installations');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('limit');
    expect(data).toHaveProperty('offset');
    expect(data).toHaveProperty('installationsLast24h');
    expect(data).toHaveProperty('installationsLast7d');
    expect(Array.isArray(data.installations)).toBe(true);
    
    // Find our test installation
    const testInstall = data.installations.find((i: any) => i.id === id);
    expect(testInstall).toBeDefined();
    expect(testInstall.appName).toBe('icloud-docker');
    expect(testInstall.appVersion).toBe('2.1.0');
  });

  it('should order installations by createdAt DESC', async () => {
    const base = getBase();
    
    // Create test installations with different timestamps
    const now = new Date();
    const older = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const oldest = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
    
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    const id3 = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        (?, 'test-app', '1.0.0', '1.2.3.4', ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.5', ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.6', ?, ?)
    `, [
      id1, now.toISOString(), now.toISOString(),
      id2, older.toISOString(), older.toISOString(),
      id3, oldest.toISOString(), oldest.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?limit=100`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Find our test installations in the results
    const idx1 = data.installations.findIndex((i: any) => i.id === id1);
    const idx2 = data.installations.findIndex((i: any) => i.id === id2);
    const idx3 = data.installations.findIndex((i: any) => i.id === id3);
    
    // All should be found
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx3).toBeGreaterThanOrEqual(0);
    
    // Most recent should come before older ones
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
  });

  it('should filter by appName', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    const uniqueAppName = `test-app-${Date.now()}`;
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        (?, ?, '2.1.0', '1.2.3.4', ?, ?),
        (?, ?, '2.0.5', '1.2.3.5', ?, ?)
    `, [id1, uniqueAppName, now, now, id2, uniqueAppName, now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}?appName=${uniqueAppName}&limit=100`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Find our test installations
    const testInstalls = data.installations.filter((i: any) => 
      i.id === id1 || i.id === id2
    );
    
    expect(testInstalls.length).toBe(2);
    expect(testInstalls.every((i: any) => i.appName === uniqueAppName)).toBe(true);
  });

  it('should respect limit parameter', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?limit=10`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.installations.length).toBeLessThanOrEqual(10);
  });

  it('should cap limit at 100', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?limit=500`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.limit).toBe(100); // Should be capped at 100
  });

  it('should include geographic data when available', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    const id = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, country_code, region, created_at, updated_at)
      VALUES (?, 'test-geo-app', '1.0.0', '1.2.3.4', 'US', 'California', ?, ?)
    `, [id, now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}?limit=100`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Find our test installation
    const testInstall = data.installations.find((i: any) => i.id === id);
    expect(testInstall).toBeDefined();
    expect(testInstall.countryCode).toBe('US');
    expect(testInstall.region).toBe('California');
  });

  it('should count recent installations correctly', async () => {
    const base = getBase();
    
    // Create installations with recent timestamps
    const now = new Date();
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        (?, 'recent-test-app', '1.0.0', '1.2.3.4', ?, ?),
        (?, 'recent-test-app', '1.0.0', '1.2.3.5', ?, ?)
    `, [
      id1, now.toISOString(), now.toISOString(),
      id2, now.toISOString(), now.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // Should have counted our recent installations
    expect(data.installationsLast24h).toBeGreaterThanOrEqual(2);
    expect(data.installationsLast7d).toBeGreaterThanOrEqual(2);
  });
});
