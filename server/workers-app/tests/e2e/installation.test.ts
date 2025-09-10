import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import dataUtils from './data.utils';

const ENDPOINT = '/api/installation';

describe(ENDPOINT, async () => {
  let server: string;
  
  beforeAll(async () => {
    server = await dataUtils.createServer();
  });
  
  afterAll(async () => {
    await dataUtils.stopWorker();
  });
  
  beforeEach(async () => {
    await dataUtils.syncDb();
  });
  
  afterEach(async () => {
    await dataUtils.syncDb(false);
  });
  
  it('POST with valid data should succeed', async () => {
    const installationData = dataUtils.createInstallationRecord();
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBeTruthy();
  });
  
  it('POST should fail for invalid data', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    });
    
    expect(res.status).toBe(400);
  });
  
  it('GET should return error', async () => {
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'GET',
    });
    
    expect(res.status).toBe(404);
  });
  
  it('PUT should return error', async () => {
    const installationData = dataUtils.createInstallationRecord();
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    
    expect(res.status).toBe(404);
  });
  
  it('DELETE should return error', async () => {
    const installationData = dataUtils.createInstallationRecord();
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    
    expect(res.status).toBe(404);
  });
});
