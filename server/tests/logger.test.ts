import { describe, it, expect, beforeAll, afterAll, mock, spyOn } from 'bun:test';
import { Logger } from '../src/utils/logger';
import { Hono } from 'hono';

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Test Environment Detection', () => {
    it('should suppress logs in test environment', () => {
      // Already in test env, logs should be suppressed
      const consoleSpy = spyOn(console, 'log');
      Logger.info('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Format Message with Context', () => {
    beforeAll(() => {
      // Temporarily enable logging to test formatMessage
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should log success with operation context', () => {
      const consoleSpy = spyOn(console, 'log');
      Logger.success('Operation completed', {
        operation: 'database-query',
        duration: 150
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('✅');
      expect(call).toContain('database-query');
      expect(call).toContain('150ms');
      consoleSpy.mockRestore();
    });

    it('should log warning with full context', () => {
      const consoleSpy = spyOn(console, 'warn');
      Logger.warning('Slow operation', {
        operation: 'api-call',
        duration: 5000,
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('⚠️');
      expect(call).toContain('WARNING');
      expect(call).toContain('Slow operation');
      expect(call).toContain('op=api-call');
      expect(call).toContain('duration=5000ms');
      expect(call).toContain('reqId=req-123');
      expect(call).toContain('ip=192.168.1.1');
      expect(call).toContain('ua=Mozilla'); // truncated userAgent
      consoleSpy.mockRestore();
    });

    it('should log error with error context', () => {
      const consoleSpy = spyOn(console, 'error');
      const testError = new Error('Test error message');
      testError.stack = 'Error: Test error\n  at test.ts:10:5';
      
      Logger.error('Operation failed', {
        operation: 'db-insert',
        duration: 200,
        error: testError
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('❌');
      expect(call).toContain('ERROR');
      expect(call).toContain('Operation failed');
      expect(call).toContain('error=Test error message');
      expect(call).toContain('stack=');
      consoleSpy.mockRestore();
    });

    it('should log info with metadata', () => {
      const consoleSpy = spyOn(console, 'log');
      Logger.info('Processing request', {
        operation: 'api-handler',
        metadata: {
          userId: '123',
          action: 'update',
          count: 5
        }
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('ℹ️');
      expect(call).toContain('INFO');
      expect(call).toContain('Processing request');
      expect(call).toContain('userId="123"');
      expect(call).toContain('action="update"');
      expect(call).toContain('count=5');
      consoleSpy.mockRestore();
    });

    it('should handle success without context', () => {
      const consoleSpy = spyOn(console, 'log');
      Logger.success('Simple success');
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('✅');
      expect(call).toContain('Simple success');
      consoleSpy.mockRestore();
    });
  });

  describe('Measure Operation', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should measure successful operation duration', async () => {
      const consoleSpy = spyOn(console, 'log');
      
      const result = await Logger.measureOperation(
        'test-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        }
      );
      
      expect(result).toBe('success');
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('test-operation');
      expect(call).toContain('ms');
      consoleSpy.mockRestore();
    });

    it('should log error and rethrow on failure', async () => {
      const errorSpy = spyOn(console, 'error');
      
      await expect(
        Logger.measureOperation('failing-operation', async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');
      
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0][0];
      expect(call).toContain('failing-operation');
      expect(call).toContain('failed');
      errorSpy.mockRestore();
    });

    it('should include additional context', async () => {
      const consoleSpy = spyOn(console, 'log');
      
      await Logger.measureOperation(
        'contextual-operation',
        async () => 'done',
        { requestId: 'req-456', metadata: { type: 'batch' } }
      );
      
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('contextual-operation');
      consoleSpy.mockRestore();
    });
  });

  describe('Get Request Context', () => {
    it('should extract context from Hono request', () => {
      const app = new Hono();
      
      app.get('/test', (c) => {
        const context = Logger.getRequestContext(c);
        
        expect(context.requestId).toBeDefined();
        expect(typeof context.requestId).toBe('string');
        expect(context.ipAddress).toBeDefined();
        expect(context.userAgent).toBeDefined();
        
        return c.json(context);
      });
      
      const req = new Request('http://localhost/test', {
        headers: {
          'User-Agent': 'Test Agent',
          'x-forwarded-for': '10.0.0.1'
        }
      });
      
      app.request(req);
    });

    it('should handle missing headers gracefully', () => {
      const app = new Hono();
      
      app.get('/test-no-headers', (c) => {
        const context = Logger.getRequestContext(c);
        
        expect(context.requestId).toBeDefined();
        expect(context.ipAddress).toBe('unknown');
        expect(context.userAgent).toBe('unknown');
        
        return c.json(context);
      });
      
      const req = new Request('http://localhost/test-no-headers');
      app.request(req);
    });

    it('should prioritize CF-Connecting-IP header', () => {
      const app = new Hono();
      
      app.get('/test-cf-ip', (c) => {
        const context = Logger.getRequestContext(c);
        expect(context.ipAddress).toBe('203.0.113.1');
        return c.json(context);
      });
      
      const req = new Request('http://localhost/test-cf-ip', {
        headers: {
          'CF-Connecting-IP': '203.0.113.1',
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      app.request(req);
    });
  });
});
