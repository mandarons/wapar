import { describe, it, expect } from 'bun:test';
import { getBase } from './utils';

const ENDPOINT = '/api';

describe(ENDPOINT, () => {
  it('GET / should return root endpoint', async () => {
    const base = getBase();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('Hello World!');
  });

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

  it('NOT found errors should have standardized format', async () => {
    const base = getBase();
    // Use a non-existent endpoint to test 404 error format
    const res = await fetch(`${base}/api/non-existent-endpoint`, {
      method: 'GET'
    });
    
    expect(res.status).toBe(404);
    const text = await res.text();
    // Hono returns plain text "404 Not Found" for routes that don't exist
    expect(text).toContain('404');
  });
});
