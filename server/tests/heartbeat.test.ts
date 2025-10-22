import { describe, it, expect } from 'vitest';
import { d1QueryOne, getBase, waitForCount } from './utils';

const ENDPOINT = '/api/heartbeat';
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

  it('POST with data field should store JSON data correctly', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const testData = {
      sessionId: 'session-123',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      performance: {
        loadTime: 1234,
        renderTime: 567
      },
      features: ['feature-a', 'feature-b']
    };

    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        installationId,
        data: testData
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(installationId);

    // Verify data was stored correctly in database
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const stored = await d1QueryOne<{ data: string }>(`SELECT data FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(stored?.data).toBeDefined();
    const parsedData = JSON.parse(stored?.data ?? '');
    expect(parsedData).toEqual(testData);
  });

  it('POST with null data field should store null', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        installationId,
        data: null
      })
    });
    
    expect(res.status).toBe(201);
    
    // Verify null data was stored correctly
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const stored = await d1QueryOne<{ data: string | null }>(`SELECT data FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(stored?.data).toBeNull();
  });

  it('POST without data field should store null', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId })
    });
    
    expect(res.status).toBe(201);
    
    // Verify null data was stored when not provided
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const stored = await d1QueryOne<{ data: string | null }>(`SELECT data FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(stored?.data).toBeNull();
  });

  it('POST with complex nested data should work', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const complexData = {
      session: {
        id: 'sess_abc123',
        startTime: '2024-01-01T10:00:00Z',
        duration: 3600,
        events: [
          { type: 'click', target: 'button', timestamp: '2024-01-01T10:05:00Z' },
          { type: 'scroll', position: 150, timestamp: '2024-01-01T10:06:00Z' }
        ]
      },
      system: {
        cpu: { usage: 45.2, cores: 8 },
        memory: { used: '4.2GB', total: '16GB' },
        network: { latency: 23, bandwidth: '100Mbps' }
      },
      errors: []
    };
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        installationId,
        data: complexData
      })
    });
    
    expect(res.status).toBe(201);
    
    // Verify complex data was stored and can be retrieved correctly
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const stored = await d1QueryOne<{ data: string }>(`SELECT data FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(stored?.data).toBeDefined();
    const parsedData = JSON.parse(stored?.data ?? '');
    expect(parsedData).toEqual(complexData);
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

  it('POST should fail for invalid installation ID format', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        installationId: 'invalid-id-not-a-uuid',
        data: { test: true }
      })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('Validation failed');
    expect(body.issues).toBeDefined();
    expect(body.issues.length).toBeGreaterThan(0);
    expect(body.issues[0].message).toContain('UUID');
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

  // Form-encoded request tests (for backward compatibility with older icloud-docker versions)
  it('POST with form-encoded data should succeed', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const formData = new URLSearchParams({
      installationId: installationId
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(installationId);

    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const countRow = await d1QueryOne<{ count: number }>(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(Number(countRow?.count ?? 0)).toBe(1);
  });

  it('POST with form-encoded data including JSON data field should succeed', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const testData = {
      sessionId: 'session-456',
      metrics: { cpu: 45, memory: 80 }
    };
    const formData = new URLSearchParams({
      installationId: installationId,
      data: JSON.stringify(testData)
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(installationId);

    // Verify data was stored correctly
    await waitForCount(`SELECT COUNT(1) as count FROM Heartbeat WHERE installation_id = '${installationId}'`, 1);
    const stored = await d1QueryOne<{ data: string }>(`SELECT data FROM Heartbeat WHERE installation_id = '${installationId}'`);
    expect(stored?.data).toBeDefined();
    const parsedData = JSON.parse(stored?.data ?? '');
    expect(parsedData).toEqual(testData);
  });

  it('POST with form-encoded data should fail for invalid JSON in data field', async () => {
    const base = getBase();
    const installationId = await createInstallation();
    const formData = new URLSearchParams({
      installationId: installationId,
      data: 'not-valid-json{'  // Invalid JSON
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    // Should fail with 400 due to JSON parsing error in form-encoded data field
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('Invalid JSON in form-encoded data field');
  });

  it('POST with form-encoded data should fail for non-existent installation', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      installationId: crypto.randomUUID()
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(404);
  });

  it('POST with form-encoded data should fail for invalid installationId format', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      installationId: 'not-a-valid-uuid'
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('Validation failed');
  });

  it('POST with form-encoded data should fail for missing installationId', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      data: JSON.stringify({ test: true })
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(400);
  });
});
