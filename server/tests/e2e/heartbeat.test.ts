import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import dataUtils from './data.utils';

const ENDPOINT = '/api/heartbeat';

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
  
  it('POST should succeed', async () => {
    // First create an installation
    const installationData = dataUtils.createInstallationRecord(dataUtils.appsList[0]);
    const installRes = await fetch(`${server}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const installation = await installRes.json();
    
    // Then create a heartbeat for that installation
    const heartbeatData = dataUtils.createHeartbeatRecord(installation.id);
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBeTruthy();
    
    // Verify the heartbeat was created in the database
    const base = server;
    const countRes = await fetch(`${base}/api`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Test-SQL': 'query'
      },
      body: JSON.stringify({ 
        sql: 'SELECT COUNT(*) as count FROM Heartbeat WHERE installation_id = ?', 
        params: [installation.id] 
      }),
    });
    const countData = await countRes.json();
    expect(countData.count).toBe(1);
  });
  
  it('POST should succeed but not create duplicate record for same day', async () => {
    // First create an installation
    const installationData = dataUtils.createInstallationRecord(dataUtils.appsList[0]);
    const installRes = await fetch(`${server}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const installation = await installRes.json();
    
    // Create first heartbeat
    const heartbeatData = dataUtils.createHeartbeatRecord(installation.id);
    await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    // Create second heartbeat (should not create duplicate)
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBeTruthy();
    
    // Verify only one heartbeat exists
    const base = server;
    const countRes = await fetch(`${base}/api`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Test-SQL': 'query'
      },
      body: JSON.stringify({ 
        sql: 'SELECT COUNT(*) as count FROM Heartbeat WHERE installation_id = ?', 
        params: [installation.id] 
      }),
    });
    const countData = await countRes.json();
    expect(countData.count).toBe(1);
  });
  
  it('POST should fail for non-existent installation', async () => {
    const heartbeatData = dataUtils.createHeartbeatRecord('f6a16ff7-4a31-11eb-be7b-8344edc8f36b');
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(res.status).toBe(404);
  });
  
  it('POST should fail for invalid data', async () => {
    // First create an installation
    const installationData = dataUtils.createInstallationRecord(dataUtils.appsList[0]);
    await fetch(`${server}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    
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
    // First create an installation
    const installationData = dataUtils.createInstallationRecord(dataUtils.appsList[0]);
    const installRes = await fetch(`${server}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const installation = await installRes.json();
    
    const heartbeatData = dataUtils.createHeartbeatRecord(installation.id);
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(res.status).toBe(404);
  });
  
  it('DELETE should return error', async () => {
    // First create an installation
    const installationData = dataUtils.createInstallationRecord(dataUtils.appsList[0]);
    const installRes = await fetch(`${server}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const installation = await installRes.json();
    
    const heartbeatData = dataUtils.createHeartbeatRecord(installation.id);
    const res = await fetch(`${server}${ENDPOINT}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(res.status).toBe(404);
  });
});
