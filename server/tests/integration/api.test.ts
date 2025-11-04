/**
 * Integration tests for deployed WAPAR API.
 * These tests run against the actual staging deployment.
 */
import { describe, test, expect } from 'vitest';

// Get staging API URL from environment
const API_BASE_URL = process.env.STAGING_API_URL || 'http://localhost:8787';

describe('Deployed API Integration Tests', () => {
  
  test('health endpoint returns status', async () => {
    const response = await fetch(`${API_BASE_URL}/api`);
    expect(response.ok).toBe(true);
    
    const text = await response.text();
    expect(text).toBeTruthy();
  });

  test('can create new installation via POST', async () => {
    const installationData = {
      appName: 'integration-test',
      appVersion: '1.0.0-test',
    };
    
    const response = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(installationData),
    });
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    
    // Verify it's a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(data.id).toMatch(uuidRegex);
  });

  test('can submit heartbeat via POST', async () => {
    // First create an installation
    const installationData = {
      appName: 'integration-test-heartbeat',
      appVersion: '1.0.0-test',
    };
    
    const installResponse = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const { id: installationId } = await installResponse.json();
    
    // Submit heartbeat
    const heartbeatData = {
      installationId,
      data: { test: 'data' },
    };
    
    const response = await fetch(`${API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    
    // Verify it's a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(data.id).toMatch(uuidRegex);
  });

  test('usage analytics endpoint returns valid data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/usage`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Verify expected fields exist
    expect(data).toHaveProperty('totalInstallations');
    expect(data).toHaveProperty('activeInstallations');
    expect(data).toHaveProperty('staleInstallations');
    expect(data).toHaveProperty('monthlyActive');
    
    // Verify types
    expect(typeof data.totalInstallations).toBe('number');
    expect(typeof data.activeInstallations).toBe('number');
    expect(typeof data.staleInstallations).toBe('number');
    expect(typeof data.monthlyActive).toBe('number');
    
    // Verify counts are non-negative
    expect(data.totalInstallations).toBeGreaterThanOrEqual(0);
    expect(data.activeInstallations).toBeGreaterThanOrEqual(0);
    expect(data.staleInstallations).toBeGreaterThanOrEqual(0);
    expect(data.monthlyActive).toBeGreaterThanOrEqual(0);
  });

  test('installation stats endpoint returns statistics', async () => {
    const response = await fetch(`${API_BASE_URL}/api/installation-stats`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    expect(data).toHaveProperty('totalInstallations');
    expect(data).toHaveProperty('activeInstallations');
    expect(data).toHaveProperty('staleInstallations');
    expect(data).toHaveProperty('activityThresholdDays');
    
    expect(typeof data.totalInstallations).toBe('number');
    expect(typeof data.activeInstallations).toBe('number');
    expect(typeof data.staleInstallations).toBe('number');
    expect(typeof data.activityThresholdDays).toBe('number');
    
    // Verify threshold is positive
    expect(data.activityThresholdDays).toBeGreaterThan(0);
  });

  test('database schema has required columns (heartbeat update)', async () => {
    /**
     * Test that critical database columns exist.
     * This would have caught the missing last_heartbeat_at column!
     */
    
    // Create installation
    const installationData = {
      appName: 'schema-test',
      appVersion: '1.0.0',
    };
    
    const installResponse = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    const { id: installationId } = await installResponse.json();
    
    // Send heartbeat - this updates last_heartbeat_at column
    const heartbeatData = { installationId };
    const response = await fetch(`${API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    // If last_heartbeat_at column exists, this should succeed
    expect(response.ok).toBe(true);
  });

  test('handles invalid installation ID gracefully', async () => {
    const heartbeatData = {
      installationId: '00000000-0000-0000-0000-000000000000',
      data: {},
    };
    
    const response = await fetch(`${API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData),
    });
    
    // Should return error status (400 or 404)
    expect(response.ok).toBe(false);
    expect([400, 404]).toContain(response.status);
  });

  test('validates required fields on installation creation', async () => {
    const invalidData = {
      // Missing required fields
    };
    
    const response = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });
    
    // Should return 400 Bad Request
    expect(response.status).toBe(400);
  });

  test('version analytics endpoint returns data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/version-analytics`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    // Returns an object with versionDistribution array
    expect(data).toHaveProperty('versionDistribution');
    expect(Array.isArray(data.versionDistribution)).toBe(true);
  });

  test('recent installations endpoint returns data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/recent-installations`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    // Returns an object with installations array
    expect(data).toHaveProperty('installations');
    expect(Array.isArray(data.installations)).toBe(true);
  });

  test('new installations endpoint returns data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/new-installations`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    // Returns an object with summary and timeline
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('timeline');
  });

  test('heartbeat analytics endpoint returns data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/heartbeat-analytics`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    // Returns an object with activeUsers and engagementLevels
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('engagementLevels');
  });

  test('can create installation with optional data field', async () => {
    const installationData = {
      appName: 'integration-test-data',
      appVersion: '1.0.0-test',
      data: JSON.stringify({
        platform: 'linux',
        features: ['sync', 'cleanup']
      })
    };
    
    const response = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData),
    });
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
  });

  test('handles malformed JSON gracefully', async () => {
    const response = await fetch(`${API_BASE_URL}/api/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    });
    
    expect(response.status).toBe(400);
  });
});
