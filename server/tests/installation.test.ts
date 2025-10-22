import { describe, it, expect } from 'vitest';
import { getBase, queryOne } from './utils';

const ENDPOINT = '/api/installation';

function randomAppName() {
  const apps = ['icloud-drive-docker', 'icloud-docker', 'ha-bouncie'];
  return apps[Math.floor(Math.random() * apps.length)];
}
function randomVersion() {
  return `${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`;
}

describe(ENDPOINT, () => {
  it('POST with valid data should succeed', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: randomAppName(), appVersion: randomVersion() })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(String(body.id).length).toBeGreaterThan(0);
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

  it('POST should fail for invalid previousId format', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        appName: randomAppName(), 
        appVersion: randomVersion(),
        previousId: 'invalid-previous-id-not-uuid'
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
    const formData = new URLSearchParams({
      appName: 'icloud-docker',
      appVersion: '1.0.0'
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(String(body.id).length).toBeGreaterThan(0);
  });

  it('POST with form-encoded data and optional fields should succeed', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      appName: 'icloud-docker',
      appVersion: '2.5.1',
      ipAddress: '192.168.1.100',
      data: 'test-data-string',
      countryCode: 'US',
      region: 'California'
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it('POST with form-encoded data and previousId should succeed', async () => {
    const base = getBase();
    const previousId = crypto.randomUUID();
    const formData = new URLSearchParams({
      appName: 'icloud-docker',
      appVersion: '1.0.0',
      previousId: previousId
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it('POST with form-encoded data should fail for invalid previousId', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      appName: 'icloud-docker',
      appVersion: '1.0.0',
      previousId: 'not-a-valid-uuid'
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('Validation failed');
    expect(body.issues).toBeDefined();
    expect(body.issues.length).toBeGreaterThan(0);
    expect(body.issues[0].message).toContain('UUID');
  });

  it('POST with form-encoded data should fail for missing required fields', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      appName: 'icloud-docker'
      // Missing appVersion
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(400);
  });
});
