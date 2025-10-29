import { describe, it, expect, beforeEach } from 'vitest';
import { getBase, d1Exec } from './utils';

const ENDPOINT = '/api/recent-installations';

describe('Recent Installations API', () => {
  beforeEach(async () => {
    // Clean up Installation table before each test
    await d1Exec('DELETE FROM Installation');
  });

  it('should return empty list when no installations exist', async () => {
    const base = getBase();
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.limit).toBe(50);
    expect(data.offset).toBe(0);
    expect(data.installationsLast24h).toBe(0);
    expect(data.installationsLast7d).toBe(0);
  });

  it('should return recent installations ordered by createdAt DESC', async () => {
    const base = getBase();
    
    // Create test installations with different timestamps
    const now = new Date();
    const older = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const oldest = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?),
        ('uuid-2', 'icloud-docker', '2.0.5', '1.2.3.5', ?, ?),
        ('uuid-3', 'ha-bouncie', '1.5.0', '1.2.3.6', ?, ?)
    `, [
      now.toISOString(), now.toISOString(),
      older.toISOString(), older.toISOString(),
      oldest.toISOString(), oldest.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(3);
    expect(data.total).toBe(3);
    // Most recent should be first
    expect(data.installations[0].id).toBe('uuid-1');
    expect(data.installations[1].id).toBe('uuid-2');
    expect(data.installations[2].id).toBe('uuid-3');
  });

  it('should filter by appName', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?),
        ('uuid-2', 'icloud-docker', '2.0.5', '1.2.3.5', ?, ?),
        ('uuid-3', 'ha-bouncie', '1.5.0', '1.2.3.6', ?, ?)
    `, [now, now, now, now, now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.installations.every((i: any) => i.appName === 'icloud-docker')).toBe(true);
  });

  it('should respect limit parameter', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    // Insert 5 installations
    for (let i = 1; i <= 5; i++) {
      await d1Exec(`
        INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
        VALUES (?, 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?)
      `, [`uuid-${i}`, now, now]);
    }
    
    const response = await fetch(`${base}${ENDPOINT}?limit=3`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(3);
    expect(data.total).toBe(5);
    expect(data.limit).toBe(3);
  });

  it('should respect offset parameter for pagination', async () => {
    const base = getBase();
    
    // Insert installations with sequential timestamps
    for (let i = 1; i <= 5; i++) {
      const timestamp = new Date(Date.now() - i * 1000).toISOString();
      await d1Exec(`
        INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
        VALUES (?, 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?)
      `, [`uuid-${i}`, timestamp, timestamp]);
    }
    
    const response = await fetch(`${base}${ENDPOINT}?limit=2&offset=2`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(2);
    expect(data.total).toBe(5);
    expect(data.offset).toBe(2);
    // Should skip first 2 records (offset=2)
    expect(data.installations[0].id).toBe('uuid-3');
  });

  it('should cap limit at 100', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?limit=500`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.limit).toBe(100); // Should be capped at 100
  });

  it('should count installations in last 24 hours correctly', async () => {
    const base = getBase();
    
    const now = new Date();
    const within24h = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    const beyond24h = new Date(now.getTime() - 30 * 60 * 60 * 1000); // 30 hours ago
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?),
        ('uuid-2', 'icloud-docker', '2.0.5', '1.2.3.5', ?, ?),
        ('uuid-3', 'ha-bouncie', '1.5.0', '1.2.3.6', ?, ?)
    `, [
      now.toISOString(), now.toISOString(),
      within24h.toISOString(), within24h.toISOString(),
      beyond24h.toISOString(), beyond24h.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installationsLast24h).toBe(2); // Only uuid-1 and uuid-2
  });

  it('should count installations in last 7 days correctly', async () => {
    const base = getBase();
    
    const now = new Date();
    const within7d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const beyond7d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?),
        ('uuid-2', 'icloud-docker', '2.0.5', '1.2.3.5', ?, ?),
        ('uuid-3', 'ha-bouncie', '1.5.0', '1.2.3.6', ?, ?)
    `, [
      now.toISOString(), now.toISOString(),
      within7d.toISOString(), within7d.toISOString(),
      beyond7d.toISOString(), beyond7d.toISOString()
    ]);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installationsLast7d).toBe(2); // Only uuid-1 and uuid-2
  });

  it('should include geographic data when available', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, country_code, region, created_at, updated_at)
      VALUES ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', 'US', 'California', ?, ?)
    `, [now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(1);
    expect(data.installations[0].countryCode).toBe('US');
    expect(data.installations[0].region).toBe('California');
  });

  it('should apply appName filter to 24h and 7d counts', async () => {
    const base = getBase();
    
    const now = new Date().toISOString();
    await d1Exec(`
      INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
      VALUES 
        ('uuid-1', 'icloud-docker', '2.1.0', '1.2.3.4', ?, ?),
        ('uuid-2', 'ha-bouncie', '1.5.0', '1.2.3.5', ?, ?)
    `, [now, now, now, now]);
    
    const response = await fetch(`${base}${ENDPOINT}?appName=icloud-docker`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.installationsLast24h).toBe(1);
    expect(data.installationsLast7d).toBe(1);
  });
});
