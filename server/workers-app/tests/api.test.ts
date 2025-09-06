import { describe, it, expect } from 'vitest';
import { getBase } from './utils';

describe('/api', () => {
  it('GET should return success', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('All good.');
  });
  it('POST should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api`, { method: 'POST', body: JSON.stringify({ some: 'data' }) });
    expect(res.status).toBe(404);
  });
  it('PUT should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api`, { method: 'PUT', body: JSON.stringify({ some: 'data' }) });
    expect(res.status).toBe(404);
  });
  it('DELETE should return 404', async () => {
    const base = getBase();
    const res = await fetch(`${base}/api`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
