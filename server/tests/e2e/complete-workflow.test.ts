import { describe, it, expect, beforeAll } from 'bun:test';
import { resetDb, getBase } from '../utils';

/**
 * E2E Tests: Complete Application Workflow
 * 
 * These tests verify end-to-end functionality across all API endpoints,
 * testing realistic usage scenarios and data flow.
 */
describe('E2E: Complete Application Workflow', () => {
  let base: string;

  beforeAll(async () => {
    await resetDb();
    base = getBase();
  });

  const randomApp = () => {
    const apps = ['icloud-docker', 'icloud-drive-docker', 'ha-bouncie'];
    return apps[Math.floor(Math.random() * apps.length)];
  };

  const randomVersion = () => `2024.${Math.floor(Math.random() * 12) + 1}.${Math.floor(Math.random() * 30) + 1}`;

  describe('Installation Lifecycle', () => {
    let createdInstallationId: string;

    it('should create a new installation', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: randomApp(),
          appVersion: randomVersion()
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.id).toBeDefined();
      createdInstallationId = data.id;
    });

    it('should send heartbeat for created installation', async () => {
      const response = await fetch(`${base}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId: createdInstallationId
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.id).toBeDefined();
    });

    it('should track installation upgrade', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: randomApp(),
          appVersion: randomVersion(),
          previousId: createdInstallationId
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.id).toBeDefined();
    });
  });

  describe('Statistics Endpoints', () => {
    it('should retrieve usage statistics', async () => {
      const response = await fetch(`${base}/api/usage`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(typeof data.totalInstallations).toBe('number');
      expect(data.totalInstallations).toBeGreaterThan(0);
      expect(typeof data.activeInstallations).toBe('number');
      expect(Array.isArray(data.countryToCount)).toBe(true);
      expect(data.iCloudDocker).toBeDefined();
      expect(data.haBouncie).toBeDefined();
    });

    it('should retrieve installation stats', async () => {
      const response = await fetch(`${base}/api/installation-stats`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.totalInstallations).toBeGreaterThan(0);
      expect(data.activeInstallations).toBeDefined();
      expect(Array.isArray(data.activeVersionDistribution)).toBe(true);
      expect(Array.isArray(data.activeCountryDistribution)).toBe(true);
    });

    it('should retrieve recent installations', async () => {
      const response = await fetch(`${base}/api/recent-installations?limit=10`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(Array.isArray(data.installations)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(data.limit).toBe(10);
    });

    it('should retrieve new installations', async () => {
      const response = await fetch(`${base}/api/new-installations?limit=10`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.timeline)).toBe(true);
    });
  });

  describe('Analytics Endpoints', () => {
    it('should retrieve version analytics', async () => {
      const response = await fetch(`${base}/api/version-analytics`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.versionDistribution).toBeDefined();
      expect(Array.isArray(data.versionDistribution)).toBe(true);
      expect(data.latestVersion).toBeDefined();
      expect(data.upgradeRate).toBeDefined();
    });

    it('should retrieve heartbeat analytics', async () => {
      const response = await fetch(`${base}/api/heartbeat-analytics`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.activeUsers).toBeDefined();
      expect(data.engagementLevels).toBeDefined();
      expect(Array.isArray(data.timeline)).toBe(true);
    });

    it('should filter analytics by time period', async () => {
      const days = 30;
      const response = await fetch(`${base}/api/version-analytics?days=${days}`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.versionDistribution).toBeDefined();
    });
  });

  describe('Multiple Installations Scenario', () => {
    it('should handle bulk installation creation', async () => {
      const numInstallations = 20;
      const installations = [];

      for (let i = 0; i < numInstallations; i++) {
        const response = await fetch(`${base}/api/installation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: randomApp(),
            appVersion: randomVersion()
          })
        });

        expect(response.status).toBe(201);
        const data = await response.json() as any;
        installations.push(data.id);
      }

      expect(installations.length).toBe(numInstallations);
    });

    it('should handle bulk heartbeats', async () => {
      // Create installations
      const installations = [];
      for (let i = 0; i < 10; i++) {
        const createRes = await fetch(`${base}/api/installation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: randomApp(),
            appVersion: randomVersion()
          })
        });
        const createData = await createRes.json() as any;
        installations.push(createData.id);
      }

      // Send heartbeats
      for (const id of installations) {
        const response = await fetch(`${base}/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ installationId: id })
        });
        expect(response.status).toBe(201);
      }

      // Verify in analytics
      const analyticsResponse = await fetch(`${base}/api/heartbeat-analytics`);
      const analyticsData = await analyticsResponse.json() as any;
      expect(analyticsData.activeUsers).toBeDefined();
    });
  });

  describe('Upgrade and Downgrade Flow', () => {
    it('should detect upgrades correctly', async () => {
      const app = 'icloud-docker';
      
      // Create v1.0.0
      const v1Response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: app,
          appVersion: '1.0.0'
        })
      });
      const v1Data = await v1Response.json() as any;

      // Upgrade to v2.0.0
      await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: app,
          appVersion: '2.0.0',
          previousId: v1Data.id
        })
      });

      // Check version analytics
      const analyticsResponse = await fetch(`${base}/api/version-analytics`);
      const analyticsData = await analyticsResponse.json() as any;
      
      expect(analyticsData.versionDistribution).toBeDefined();
      expect(analyticsData.upgradeRate).toBeDefined();
    });
  });

  describe('Form-Encoded Requests', () => {
    it('should accept installation via form encoding', async () => {
      const formData = new URLSearchParams();
      formData.append('appName', randomApp());
      formData.append('appVersion', randomVersion());

      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.id).toBeDefined();
    });

    it('should accept heartbeat via form encoding', async () => {
      // Create installation first
      const createResponse = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: randomApp(),
          appVersion: randomVersion()
        })
      });
      const createData = await createResponse.json() as any;

      // Send heartbeat via form encoding
      const formData = new URLSearchParams();
      formData.append('installationId', createData.id);

      const response = await fetch(`${base}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid installation data', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.message).toBeDefined();
    });

    it('should auto-create installation on heartbeat for non-existent installation', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${base}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId: testId
        })
      });

      // Should succeed and auto-create the installation
      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.id).toBe(testId);
    });
  });
});
