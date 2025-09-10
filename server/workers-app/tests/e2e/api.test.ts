import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import dataUtils from './data.utils';

const ENDPOINT = '/api';

describe(ENDPOINT, async () => {
  let server: string;
  
  beforeAll(async () => {
    server = await dataUtils.createServer();
  });
  
  afterAll(async () => {
    await dataUtils.stopWorker();
  });
  
  it('GET should return success', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'GET',
    });
    
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('All good.');
  });
  
  it('POST should return error', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ some: 'data' }),
    });
    
    expect(res.status).toBe(404);
  });
  
  it('PUT should return error', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ some: 'data' }),
    });
    
    expect(res.status).toBe(404);
  });
  
  it('DELETE should return error', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ some: 'data' }),
    });
    
    expect(res.status).toBe(404);
  });
});
