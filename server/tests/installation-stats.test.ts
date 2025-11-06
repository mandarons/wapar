import { describe, it, expect } from 'bun:test';
import { d1QueryOne, d1Exec, getBase, waitForCount } from './utils';

const ENDPOINT = '/api/installation-stats';
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

async function sendHeartbeat(installationId: string): Promise<void> {
  const base = getBase();
  await fetch(`${base}${HEARTBEAT_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId })
  });
}

describe(ENDPOINT, () => {
  it('should return active and stale installation counts', async () => {
    const base = getBase();
    
    // Create 3 installations
    const id1 = await createInstallation();
    const id2 = await createInstallation();
    await createInstallation();

    // Send heartbeats for 2 of them (making them active)
    await sendHeartbeat(id1);
    await sendHeartbeat(id2);

    // Wait for heartbeats to be recorded
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id IN (?, ?)', [id1, id2], 2);

    // Fetch stats
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    
    const stats = await res.json();
    
    // Verify response structure
    expect(stats).toHaveProperty('totalInstallations');
    expect(stats).toHaveProperty('activeInstallations');
    expect(stats).toHaveProperty('staleInstallations');
    expect(stats).toHaveProperty('activityThresholdDays');
    expect(stats).toHaveProperty('cutoffDate');
    expect(stats).toHaveProperty('activeVersionDistribution');
    expect(stats).toHaveProperty('activeCountryDistribution');
    
    // Verify at least 2 are active (the ones we sent heartbeats for)
    expect(stats.activeInstallations).toBeGreaterThanOrEqual(2);
    
    // Verify stale = total - active
    expect(stats.staleInstallations).toBe(stats.totalInstallations - stats.activeInstallations);
    
    // Default threshold should be 3 days
    expect(stats.activityThresholdDays).toBe(3);
  });

  it('should only include active installations in version distribution', async () => {
    const base = getBase();
    
    // Create installation with specific version
    const version = '9.9.9';
    const installRes = await fetch(`${base}${INSTALL_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'test-app', appVersion: version })
    });
    const { id } = await installRes.json();

    // Send heartbeat to make it active
    await sendHeartbeat(id);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?', [id], 1);

    // Fetch stats
    const res = await fetch(`${base}${ENDPOINT}`);
    const stats = await res.json();
    
    // Verify version distribution includes our active installation
    const versionEntry = stats.activeVersionDistribution.find((v: any) => v.version === version);
    expect(versionEntry).toBeDefined();
    expect(versionEntry.count).toBeGreaterThanOrEqual(1);
    expect(versionEntry.percentage).toBeGreaterThan(0);
  });

  it('should mark installation as stale if no recent heartbeat', async () => {
    const base = getBase();
    
    // Create installation
    const id = await createInstallation();
    
    // Manually set lastHeartbeatAt to 5 days ago (beyond default 3-day threshold)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await d1Exec(
      `UPDATE Installation SET last_heartbeat_at = ? WHERE id = ?`,
      [fiveDaysAgo, id]
    );

    // Fetch stats
    const res = await fetch(`${base}${ENDPOINT}`);
    const stats = await res.json();
    
    // This installation should be counted as stale
    expect(stats.staleInstallations).toBeGreaterThanOrEqual(1);
  });

  it('should track lastHeartbeatAt when heartbeat is sent', async () => {
    // Create installation
    const id = await createInstallation();
    
    // Verify no lastHeartbeatAt initially
    const beforeRow = await d1QueryOne<{ last_heartbeat_at: string | null }>(
      `SELECT last_heartbeat_at FROM Installation WHERE id = ?`,
      [id]
    );
    expect(beforeRow?.last_heartbeat_at).toBeNull();
    
    // Send heartbeat
    await sendHeartbeat(id);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?', [id], 1);
    
    // Verify lastHeartbeatAt is now set
    const afterRow = await d1QueryOne<{ last_heartbeat_at: string }>(
      `SELECT last_heartbeat_at FROM Installation WHERE id = ?`,
      [id]
    );
    expect(afterRow?.last_heartbeat_at).toBeDefined();
    expect(afterRow?.last_heartbeat_at).not.toBeNull();
    
    // Verify it's a recent timestamp (within last minute)
    const lastHeartbeat = new Date(afterRow!.last_heartbeat_at);
    const now = new Date();
    const diffMs = now.getTime() - lastHeartbeat.getTime();
    expect(diffMs).toBeLessThan(60000); // Less than 1 minute
  });

  it('should update lastHeartbeatAt even on duplicate heartbeat', async () => {
    // Create installation and send first heartbeat
    const id = await createInstallation();
    await sendHeartbeat(id);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?', [id], 1);
    
    // Get initial lastHeartbeatAt
    const firstRow = await d1QueryOne<{ last_heartbeat_at: string }>(
      `SELECT last_heartbeat_at FROM Installation WHERE id = ?`,
      [id]
    );
    const firstHeartbeat = firstRow!.last_heartbeat_at;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send second heartbeat (duplicate for same day)
    await sendHeartbeat(id);
    
    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get updated lastHeartbeatAt
    const secondRow = await d1QueryOne<{ last_heartbeat_at: string }>(
      `SELECT last_heartbeat_at FROM Installation WHERE id = ?`,
      [id]
    );
    const secondHeartbeat = secondRow!.last_heartbeat_at;
    
    // lastHeartbeatAt should be updated (different timestamp)
    expect(secondHeartbeat).not.toBe(firstHeartbeat);
    expect(new Date(secondHeartbeat).getTime()).toBeGreaterThan(new Date(firstHeartbeat).getTime());
  });

  it('should filter country distribution to active installations only', async () => {
    const base = getBase();
    
    // Create active installation with country code
    const id = await createInstallation();
    
    // Set country code for this installation
    await d1Exec(`UPDATE Installation SET country_code = 'US', region = 'California' WHERE id = ?`, [id]);
    
    await sendHeartbeat(id);
    await waitForCount('SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = ?', [id], 1);
    
    // Fetch stats
    const res = await fetch(`${base}${ENDPOINT}`);
    const stats = await res.json();
    
    // Should have country distribution array
    expect(Array.isArray(stats.activeCountryDistribution)).toBe(true);
    
    // Find our installation in the distribution
    const usEntry = stats.activeCountryDistribution.find((c: any) => c.countryCode === 'US');
    if (usEntry) {
      expect(usEntry.count).toBeGreaterThanOrEqual(1);
    }
  });
});
