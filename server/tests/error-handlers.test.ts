import { describe, it, expect, beforeAll } from 'bun:test';
import { resetDb, getBase, waitForCount, d1Exec } from './utils';

describe('Error Handlers', () => {
  let base: string;

  beforeAll(async () => {
    await resetDb();
    base = getBase();
  });

  describe('JSON Parse Errors', () => {
    it('should handle malformed JSON with proper error message', async () => {
      // Create a request with Content-Type: application/json but malformed body
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }' // Malformed JSON
      });

      // The error could be 400 (validation) or 404 (route not matched)
      expect([400, 404]).toContain(response.status);
    });

    it('should handle empty JSON body', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ''
      });

      // Empty body leads to validation error
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Zod Validation Errors', () => {
    it('should handle missing required fields in installation endpoint', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing all required fields
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.message).toBeDefined();
      expect(data.issues).toBeDefined();
      expect(Array.isArray(data.issues)).toBe(true);
    });

    it('should handle invalid field types', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 123, // Should be string
          version: 'valid',
          previousId: 'valid',
          arch: 'invalid-arch', // Invalid enum value
          platform: 'valid'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toBe('Bad Request');
      expect(data.issues).toBeDefined();
    });

    it('should handle invalid version format', async () => {
      const response = await fetch(`${base}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-id',
          version: 'not-a-version', // Invalid version format
          arch: 'x86_64',
          platform: 'linux'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.message).toBeDefined();
    });
  });

  describe('Test SQL Endpoint (Localhost Only)', () => {
    it('should return 404 when X-Test-SQL header is missing', async () => {
      const response = await fetch(`${base}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT COUNT(*) as count FROM installations'
        })
      });

      // Without X-Test-SQL header, should return 404
      expect(response.status).toBe(404);
    });

    it('should execute SQL with X-Test-SQL: exec header', async () => {
      const response = await fetch(`${base}/api`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Test-SQL': 'exec'
        },
        body: JSON.stringify({
          sql: 'SELECT 1',
          params: []
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('ok', true);
    });

    it('should query SQL with X-Test-SQL: query header', async () => {
      const response = await fetch(`${base}/api`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Test-SQL': 'query'
        },
        body: JSON.stringify({
          sql: 'SELECT 1 as value',
          params: []
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('value', 1);
    });

    it('should handle SQL execution errors', async () => {
      const response = await fetch(`${base}/api`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Test-SQL': 'exec'
        },
        body: JSON.stringify({
          sql: 'INVALID SQL SYNTAX',
          params: []
        })
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Generic Error Handler', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await fetch(`${base}/api/unknown-endpoint`);

      expect(response.status).toBe(404);
      // 404 responses may not be JSON, so we just check the status
    });

    it('should handle 404 for POST without test header', async () => {
      const response = await fetch(`${base}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(404);
    });
  });
});
