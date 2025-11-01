import { describe, it, expect } from 'vitest';
import { d1Exec, d1QueryOne, getBase, waitForCount } from './utils';

const ENDPOINT = '/api/heartbeat-analytics';
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

async function createHeartbeat(installationId: string, createdAt?: string): Promise<void> {
  const id = crypto.randomUUID();
  const timestamp = createdAt || new Date().toISOString();
  await d1Exec(`
    INSERT INTO Heartbeat (id, installation_id, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `, [id, installationId, timestamp, timestamp]);
}

describe(ENDPOINT, () => {
  // Note: We don't reset DB between tests to avoid conflicts
  // Each test creates unique installations
  
  it('should return correct structure with default data', async () => {
    const base = getBase();
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('activeUsers');
    expect(data.activeUsers).toHaveProperty('daily');
    expect(data.activeUsers).toHaveProperty('weekly');
    expect(data.activeUsers).toHaveProperty('monthly');
    expect(data.activeUsers).toHaveProperty('dau_mau_ratio');
    expect(data).toHaveProperty('engagementLevels');
    expect(data.engagementLevels).toHaveProperty('highlyActive');
    expect(data.engagementLevels).toHaveProperty('active');
    expect(data.engagementLevels).toHaveProperty('occasional');
    expect(data.engagementLevels).toHaveProperty('dormant');
    expect(data).toHaveProperty('timeline');
    expect(data).toHaveProperty('healthMetrics');
    expect(data).toHaveProperty('churnRisk');
  });

  it('should calculate DAU, WAU, MAU correctly', async () => {
    const base = getBase();
    
    // Create test installations
    const install1 = await createInstallation();
    const install2 = await createInstallation();
    const install3 = await createInstallation();
    
    // Create heartbeats at different times
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    
    // install1: active today (should be in DAU, WAU, MAU)
    await createHeartbeat(install1, now.toISOString());
    
    // install2: active yesterday (should be in DAU, WAU, MAU)
    await createHeartbeat(install2, yesterday);
    
    // install3: active week ago (should be in WAU, MAU but not DAU)
    await createHeartbeat(install3, weekAgo);
    
    // Wait for heartbeats to be created
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id IN (?, ?, ?)`, [install1, install2, install3], 3);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // DAU should include install1 and install2 (active in last 24h)
    expect(data.activeUsers.daily).toBeGreaterThanOrEqual(1); // At least install1 which is definitely today
    // WAU should include all three
    expect(data.activeUsers.weekly).toBeGreaterThanOrEqual(3);
    // MAU should include all three
    expect(data.activeUsers.monthly).toBeGreaterThanOrEqual(3);
    // DAU/MAU ratio should be between 0 and 1
    expect(data.activeUsers.dau_mau_ratio).toBeGreaterThanOrEqual(0);
    expect(data.activeUsers.dau_mau_ratio).toBeLessThanOrEqual(1);
  });

  it('should categorize users by engagement level', async () => {
    const base = getBase();
    
    // Create a highly active user (>7 heartbeats in last 7 days)
    const highlyActiveInstall = await createInstallation();
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const timestamp = new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(); // Every 12 hours
      await createHeartbeat(highlyActiveInstall, timestamp);
    }
    
    // Wait for heartbeats to be created
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?`, [highlyActiveInstall], 8);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // Should have at least one highly active user
    expect(data.engagementLevels.highlyActive.count).toBeGreaterThanOrEqual(1);
    expect(data.engagementLevels.highlyActive.description).toBe(">7 heartbeats/week");
  });

  it('should identify dormant installations', async () => {
    const base = getBase();
    
    // Create installation without any recent heartbeats
    const dormantInstall = await createInstallation();
    
    // Create a heartbeat from 31 days ago (outside 30-day window)
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await createHeartbeat(dormantInstall, longAgo);
    
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?`, [dormantInstall], 1);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // Should have at least one dormant installation
    expect(data.engagementLevels.dormant.count).toBeGreaterThanOrEqual(1);
    expect(data.engagementLevels.dormant.description).toBe("No heartbeat in 30 days");
  });

  it('should provide timeline data', async () => {
    const base = getBase();
    
    // Create installation with heartbeat
    const install = await createInstallation();
    await createHeartbeat(install, new Date().toISOString());
    
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?`, [install], 1);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.timeline)).toBe(true);
    // Timeline should have entries
    if (data.timeline.length > 0) {
      const firstEntry = data.timeline[0];
      expect(firstEntry).toHaveProperty('date');
      expect(firstEntry).toHaveProperty('activeUsers');
      expect(firstEntry).toHaveProperty('totalHeartbeats');
      expect(typeof firstEntry.date).toBe('string');
      expect(typeof firstEntry.activeUsers).toBe('number');
      expect(typeof firstEntry.totalHeartbeats).toBe('number');
    }
  });

  it('should calculate health metrics', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.healthMetrics).toHaveProperty('avgHeartbeatsPerUser');
    expect(data.healthMetrics).toHaveProperty('avgTimeBetweenHeartbeats');
    expect(data.healthMetrics).toHaveProperty('heartbeatFailureRate');
    expect(typeof data.healthMetrics.avgHeartbeatsPerUser).toBe('number');
    expect(typeof data.healthMetrics.avgTimeBetweenHeartbeats).toBe('string');
    expect(data.healthMetrics.avgTimeBetweenHeartbeats).toContain('hours');
  });

  it('should identify churn risk users', async () => {
    const base = getBase();
    
    // Create installation that was active 10 days ago but not recently
    const churnRiskInstall = await createInstallation();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await createHeartbeat(churnRiskInstall, tenDaysAgo);
    
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?`, [churnRiskInstall], 1);
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.churnRisk).toHaveProperty('usersInactive7Days');
    expect(data.churnRisk).toHaveProperty('usersInactive14Days');
    expect(data.churnRisk).toHaveProperty('usersInactive30Days');
    // Should identify at least one user inactive for 7 days
    expect(data.churnRisk.usersInactive7Days).toBeGreaterThanOrEqual(1);
  });

  it('should handle period query parameter', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}?period=30d`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('activeUsers');
  });

  it('should handle empty database gracefully', async () => {
    const base = getBase();
    
    // Create a new installation without heartbeats
    const newInstall = await createInstallation();
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // Should handle zero values gracefully
    expect(typeof data.activeUsers.daily).toBe('number');
    expect(typeof data.activeUsers.weekly).toBe('number');
    expect(typeof data.activeUsers.monthly).toBe('number');
    expect(data.activeUsers.dau_mau_ratio).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct DAU/MAU ratio', async () => {
    const base = getBase();
    
    const response = await fetch(`${base}${ENDPOINT}`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // If there are monthly active users, ratio should be DAU/MAU
    if (data.activeUsers.monthly > 0) {
      const expectedRatio = data.activeUsers.daily / data.activeUsers.monthly;
      expect(Math.abs(data.activeUsers.dau_mau_ratio - expectedRatio)).toBeLessThan(0.001);
    } else {
      // If no monthly active users, ratio should be 0
      expect(data.activeUsers.dau_mau_ratio).toBe(0);
    }
  });

  it('should return proper HTTP methods', async () => {
    const base = getBase();
    
    // GET should work
    const getRes = await fetch(`${base}${ENDPOINT}`);
    expect(getRes.status).toBe(200);
    
    // POST should return 404
    const postRes = await fetch(`${base}${ENDPOINT}`, { method: 'POST' });
    expect(postRes.status).toBe(404);
    
    // PUT should return 404
    const putRes = await fetch(`${base}${ENDPOINT}`, { method: 'PUT' });
    expect(putRes.status).toBe(404);
    
    // DELETE should return 404
    const deleteRes = await fetch(`${base}${ENDPOINT}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(404);
  });
});
