import { describe, it, expect } from 'bun:test';
import { extractClientIp } from '../src/utils/network';

describe('Network Utilities', () => {
  describe('extractClientIp', () => {
    it('should extract first IP from comma-separated x-forwarded-for', () => {
      const result = extractClientIp('192.168.1.1, 10.0.0.1, 172.16.0.1', undefined);
      expect(result).toBe('192.168.1.1');
    });

    it('should trim whitespace from extracted IP', () => {
      const result = extractClientIp(' 192.168.1.1 , 10.0.0.1', undefined);
      expect(result).toBe('192.168.1.1');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const result = extractClientIp('192.168.1.1', undefined);
      expect(result).toBe('192.168.1.1');
    });

    it('should fall back to x-real-ip when x-forwarded-for is undefined', () => {
      const result = extractClientIp(undefined, '10.0.0.1');
      expect(result).toBe('10.0.0.1');
    });

    it('should fall back to x-real-ip when x-forwarded-for is empty', () => {
      const result = extractClientIp('', '10.0.0.1');
      expect(result).toBe('10.0.0.1');
    });

    it('should use default fallback when both headers are undefined', () => {
      const result = extractClientIp(undefined, undefined);
      expect(result).toBe('0.0.0.0');
    });

    it('should use custom fallback when both headers are undefined', () => {
      const result = extractClientIp(undefined, undefined, 'unknown');
      expect(result).toBe('unknown');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const result = extractClientIp('192.168.1.1', '10.0.0.1');
      expect(result).toBe('192.168.1.1');
    });

    it('should handle empty string after split', () => {
      const result = extractClientIp(',', undefined);
      expect(result).toBe('0.0.0.0');
    });

    it('should handle IPv6 addresses', () => {
      const result = extractClientIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334', undefined);
      expect(result).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should extract first IPv6 from comma-separated list', () => {
      const result = extractClientIp('2001:0db8::1, 192.168.1.1', undefined);
      expect(result).toBe('2001:0db8::1');
    });
  });
});
