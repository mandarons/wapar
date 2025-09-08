import { describe, it, expect } from 'vitest';
import { getBase } from './utils';

const ENDPOINT = '/api';

describe(ENDPOINT, () => {
  it('GET should return health check', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('All good.');
  });

  it('POST should return 404 with standardized error format', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('PUT should return 404 with standardized error format', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'PUT' });
    expect(res.status).toBe(404);
  });

  it('DELETE should return 404 with standardized error format', async () => {
    const base = getBase();
    const res = await fetch(`${base}${ENDPOINT}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('Validation errors should have standardized format', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('statusCode', 400);
    expect(body).toHaveProperty('error', 'Bad Request');
    expect(body).toHaveProperty('issues');
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it('Not found errors should have standardized format', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId: crypto.randomUUID() })
    });
    
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('message', 'Installation not found.');
    expect(body).toHaveProperty('statusCode', 404);
  });
});
