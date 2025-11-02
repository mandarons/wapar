import { describe, it, expect } from 'vitest';
import { getBase, queryOne, d1QueryOne } from './utils';

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

  // Snake_case field name tests (for backward compatibility)
  it('POST with JSON and snake_case field names should succeed', async () => {
    const base = getBase();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: 'icloud-docker',
        app_version: '1.5.0'
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(String(body.id).length).toBeGreaterThan(0);
  });

  it('POST with form-encoded snake_case field names should succeed', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      app_name: 'icloud-docker',
      app_version: '2.0.0'
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

  it('POST with mixed camelCase and snake_case (camelCase takes precedence) should succeed', async () => {
    const base = getBase();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: 'icloud-docker-camel',
        app_name: 'icloud-docker-snake', // This should be ignored
        appVersion: '3.0.0',
        app_version: '2.0.0' // This should be ignored
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it('POST with snake_case and all optional fields should succeed', async () => {
    const base = getBase();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: 'icloud-docker',
        app_version: '1.0.0',
        ip_address: '10.0.0.1',
        previous_id: crypto.randomUUID(),
        country_code: 'CA',
        region: 'Ontario'
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  // Geo data enrichment tests
  it('POST should accept and store client-provided geo data', async () => {
    const base = getBase();
    const appName = randomAppName();
    const appVersion = randomVersion();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName,
        appVersion,
        countryCode: 'US',
        region: 'California'
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    
    // Verify geo data was stored in database
    const installation = await d1QueryOne<{ country_code: string; region: string }>(
      'SELECT country_code, region FROM Installation WHERE id = ?',
      [body.id]
    );
    
    expect(installation).toBeDefined();
    expect(installation?.country_code).toBe('US');
    expect(installation?.region).toBe('California');
  });

  it('POST should handle installations without geo data gracefully', async () => {
    const base = getBase();
    const appName = randomAppName();
    const appVersion = randomVersion();
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName,
        appVersion
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    
    // Verify installation was created even without geo data
    // Note: In production with Cloudflare, request.cf would provide geo data
    // In test environment, it may be null
    const installation = await d1QueryOne<{ id: string; app_name: string }>(
      'SELECT id, app_name FROM Installation WHERE id = ?',
      [body.id]
    );
    
    expect(installation).toBeDefined();
    expect(installation?.app_name).toBe(appName);
  });

  it('POST with form-encoded geo data should succeed', async () => {
    const base = getBase();
    const formData = new URLSearchParams({
      appName: 'icloud-docker',
      appVersion: '1.0.0',
      countryCode: 'CA',
      region: 'Ontario'
    });
    
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    
    // Verify geo data was stored
    const installation = await d1QueryOne<{ country_code: string; region: string }>(
      'SELECT country_code, region FROM Installation WHERE id = ?',
      [body.id]
    );
    
    expect(installation?.country_code).toBe('CA');
    expect(installation?.region).toBe('Ontario');
  });
});
