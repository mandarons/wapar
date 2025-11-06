import { describe, it, expect } from 'bun:test';
import { getBase } from './utils';

const ENDPOINT = '/api/version-analytics';

describe('Version Analytics Performance Tests', () => {
  it('should respond within 500ms (acceptance criteria)', async () => {
    const base = getBase();
    const startTime = Date.now();
    
    const res = await fetch(`${base}${ENDPOINT}`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    expect(res.status).toBe(200);
    expect(responseTime).toBeLessThan(500);
    
    console.log(`✓ Version Analytics API responded in ${responseTime}ms (target: <500ms)`);
  });

  it('should handle concurrent requests efficiently', async () => {
    const base = getBase();
    const numRequests = 10;
    
    const startTime = Date.now();
    
    const promises = Array.from({ length: numRequests }, () =>
      fetch(`${base}${ENDPOINT}`)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTime = totalTime / numRequests;
    
    // All requests should succeed
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });
    
    // Average response time should still be reasonable
    expect(avgTime).toBeLessThan(1000);
    
    console.log(`✓ ${numRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgTime}ms)`);
  });

  it('should return consistent data structure across multiple calls', async () => {
    const base = getBase();
    
    // Make 3 consecutive calls
    const responses = await Promise.all([
      fetch(`${base}${ENDPOINT}`).then((r) => r.json()),
      fetch(`${base}${ENDPOINT}`).then((r) => r.json()),
      fetch(`${base}${ENDPOINT}`).then((r) => r.json())
    ]);
    
    // All responses should have the same structure
    responses.forEach((data) => {
      expect(Array.isArray(data.versionDistribution)).toBe(true);
      expect(typeof data.outdatedInstallations).toBe('number');
      expect(data.latestVersion === null || typeof data.latestVersion === 'string').toBe(true);
      expect(typeof data.upgradeRate).toBe('object');
      expect(typeof data.upgradeRate.last7Days).toBe('number');
      expect(typeof data.upgradeRate.last30Days).toBe('number');
    });
    
    // Version distributions should be consistent (same data)
    expect(responses[0].versionDistribution.length).toBe(responses[1].versionDistribution.length);
    expect(responses[1].versionDistribution.length).toBe(responses[2].versionDistribution.length);
  });

  it('should have efficient database query execution', async () => {
    const base = getBase();
    
    // Warm up
    await fetch(`${base}${ENDPOINT}`);
    
    // Measure actual performance
    const measurements: number[] = [];
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const res = await fetch(`${base}${ENDPOINT}`);
      const endTime = Date.now();
      
      expect(res.status).toBe(200);
      measurements.push(endTime - startTime);
    }
    
    const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxResponseTime = Math.max(...measurements);
    
    expect(avgResponseTime).toBeLessThan(500);
    expect(maxResponseTime).toBeLessThan(1000);
    
    console.log(`✓ Average response time: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
  });
});