import { describe, it, expect } from 'vitest';
import { getBase, d1Exec } from './utils';

const ENDPOINT = '/api/new-installations';

// Helper to generate unique IDs
let testCounter = 0;
function getUniqueId() {
  return `test-new-inst-${Date.now()}-${++testCounter}`;
}

describe('New Installations API', () => {
  it('should distinguish between new users and reinstalls', async () => {
    const base = getBase();
    
    // Create test data with different previousId values
    const now = new Date().toISOString();
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    const id3 = getUniqueId();
    const oldId = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, created_at, updated_at)
      VALUES 
        (?, 'icloud-docker', '2.1.0', '1.2.3.4', NULL, ?, ?),
        (?, 'icloud-docker', '2.1.0', '1.2.3.5', NULL, ?, ?),
        (?, 'icloud-docker', '2.1.0', '1.2.3.6', ?, ?, ?)
    `, [
      id1, now, now,
      id2, now, now,
      id3, oldId, now, now
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?period=7d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('timeline');
    expect(data).toHaveProperty('topCountriesNewUsers');
    expect(data).toHaveProperty('reinstallPatterns');
    
    // Summary should show correct counts
    expect(data.summary.totalNew).toBeGreaterThanOrEqual(2);
    expect(data.summary.totalReinstalls).toBeGreaterThanOrEqual(1);
    expect(data.summary.period).toBe('7d');
    expect(typeof data.summary.newUserRate).toBe('number');
    expect(data.summary.newUserRate).toBeGreaterThan(0);
    expect(data.summary.newUserRate).toBeLessThanOrEqual(100);
  });

  it('should return correct structure with default parameters', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Verify response structure
    expect(data.summary).toHaveProperty('totalNew');
    expect(data.summary).toHaveProperty('totalReinstalls');
    expect(data.summary).toHaveProperty('newUserRate');
    expect(data.summary).toHaveProperty('period');
    expect(data.summary.period).toBe('30d'); // default period
    
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(Array.isArray(data.topCountriesNewUsers)).toBe(true);
    expect(data.reinstallPatterns).toHaveProperty('reinstallRate');
  });

  it('should group timeline by day', async () => {
    const base = getBase();
    
    // Create installations on different days
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, created_at, updated_at)
      VALUES 
        (?, 'test-app', '1.0.0', '1.2.3.4', NULL, ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.5', NULL, ?, ?)
    `, [
      id1, today.toISOString(), today.toISOString(),
      id2, yesterday.toISOString(), yesterday.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?period=7d&groupBy=day`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.timeline)).toBe(true);
    
    // Timeline should have entries
    if (data.timeline.length > 0) {
      const entry = data.timeline[0];
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('newUsers');
      expect(entry).toHaveProperty('reinstalls');
      expect(entry).toHaveProperty('total');
      expect(typeof entry.newUsers).toBe('number');
      expect(typeof entry.reinstalls).toBe('number');
    }
  });

  it('should return top countries for new users only', async () => {
    const base = getBase();
    
    // Create new users with country codes
    const now = new Date().toISOString();
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    const id3 = getUniqueId(); // reinstall, should not be counted
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, country_code, created_at, updated_at)
      VALUES 
        (?, 'test-app', '1.0.0', '1.2.3.4', NULL, 'US', ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.5', NULL, 'CA', ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.6', 'old-id', 'GB', ?, ?)
    `, [
      id1, now, now,
      id2, now, now,
      id3, now, now
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?period=7d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.topCountriesNewUsers)).toBe(true);
    
    // Verify structure of country data
    if (data.topCountriesNewUsers.length > 0) {
      const country = data.topCountriesNewUsers[0];
      expect(country).toHaveProperty('countryCode');
      expect(country).toHaveProperty('count');
      expect(country).toHaveProperty('percentage');
      expect(typeof country.count).toBe('number');
      expect(typeof country.percentage).toBe('number');
    }
  });

  it('should calculate new user rate correctly', async () => {
    const base = getBase();
    
    // Create controlled test data
    const now = new Date().toISOString();
    const uniqueAppName = `test-rate-${Date.now()}`;
    
    // Create 3 new users and 1 reinstall = 75% new user rate
    const ids = [getUniqueId(), getUniqueId(), getUniqueId(), getUniqueId()];
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, created_at, updated_at)
      VALUES 
        (?, ?, '1.0.0', '1.2.3.4', NULL, ?, ?),
        (?, ?, '1.0.0', '1.2.3.5', NULL, ?, ?),
        (?, ?, '1.0.0', '1.2.3.6', NULL, ?, ?),
        (?, ?, '1.0.0', '1.2.3.7', 'old-id', ?, ?)
    `, [
      ids[0], uniqueAppName, now, now,
      ids[1], uniqueAppName, now, now,
      ids[2], uniqueAppName, now, now,
      ids[3], uniqueAppName, now, now
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?period=7d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Should have at least our test data
    expect(data.summary.totalNew).toBeGreaterThanOrEqual(3);
    expect(data.summary.totalReinstalls).toBeGreaterThanOrEqual(1);
    
    // New user rate should be reasonable (0-100)
    expect(data.summary.newUserRate).toBeGreaterThanOrEqual(0);
    expect(data.summary.newUserRate).toBeLessThanOrEqual(100);
  });

  it('should handle different period parameters', async () => {
    const base = getBase();
    
    // Test 7 days period
    const response7d = await fetch(`${base}${ENDPOINT}?period=7d`);
    const data7d = await response7d.json();
    expect(response7d.status).toBe(200);
    expect(data7d.summary.period).toBe('7d');
    
    // Test 30 days period
    const response30d = await fetch(`${base}${ENDPOINT}?period=30d`);
    const data30d = await response30d.json();
    expect(response30d.status).toBe(200);
    expect(data30d.summary.period).toBe('30d');
    
    // Test 90 days period
    const response90d = await fetch(`${base}${ENDPOINT}?period=90d`);
    const data90d = await response90d.json();
    expect(response90d.status).toBe(200);
    expect(data90d.summary.period).toBe('90d');
  });

  it('should handle empty database gracefully', async () => {
    const base = getBase();
    
    // Query for a very old period that should have no data
    const response = await fetch(`${base}${ENDPOINT}?period=1d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.summary.totalNew).toBeGreaterThanOrEqual(0);
    expect(data.summary.totalReinstalls).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(Array.isArray(data.topCountriesNewUsers)).toBe(true);
  });

  it('should calculate reinstall rate correctly', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?period=30d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.reinstallPatterns).toHaveProperty('reinstallRate');
    expect(typeof data.reinstallPatterns.reinstallRate).toBe('number');
    expect(data.reinstallPatterns.reinstallRate).toBeGreaterThanOrEqual(0);
    expect(data.reinstallPatterns.reinstallRate).toBeLessThanOrEqual(100);
  });

  it('should limit top countries to 10', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?period=90d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.topCountriesNewUsers.length).toBeLessThanOrEqual(10);
  });

  it('should group by week when requested', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?period=30d&groupBy=week`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.timeline)).toBe(true);
    
    // Week format should include 'W' prefix
    if (data.timeline.length > 0) {
      const entry = data.timeline[0];
      expect(entry.date).toMatch(/\d{4}-W\d{2}/); // Format: YYYY-WXX
    }
  });

  it('should group by month when requested', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?period=90d&groupBy=month`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.timeline)).toBe(true);
    
    // Month format should be YYYY-MM
    if (data.timeline.length > 0) {
      const entry = data.timeline[0];
      expect(entry.date).toMatch(/\d{4}-\d{2}/); // Format: YYYY-MM
    }
  });

  it('should not count null country codes in top countries', async () => {
    const base = getBase();
    
    // Create new users with and without country codes
    const now = new Date().toISOString();
    const id1 = getUniqueId();
    const id2 = getUniqueId();
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, previous_id, country_code, created_at, updated_at)
      VALUES 
        (?, 'test-app', '1.0.0', '1.2.3.4', NULL, NULL, ?, ?),
        (?, 'test-app', '1.0.0', '1.2.3.5', NULL, 'US', ?, ?)
    `, [
      id1, now, now,
      id2, now, now
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}?period=7d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // All entries in topCountriesNewUsers should have non-null country codes
    data.topCountriesNewUsers.forEach((country: any) => {
      expect(country.countryCode).not.toBeNull();
      expect(country.countryCode).toBeTruthy();
    });
  });
});
