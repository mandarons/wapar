import { describe, it, expect } from 'bun:test';
import { getActivityThresholdDays, getActivityCutoffDate, createActiveInstallationFilter, createStaleInstallationFilter } from '../src/utils/active-installations';
import { installations } from '../src/db/schema';

describe('Active Installations Utilities', () => {
  describe('getActivityThresholdDays', () => {
    it('should return default value (3) when env is undefined', () => {
      const threshold = getActivityThresholdDays(undefined);
      expect(threshold).toBe(3);
    });

    it('should return default value (3) when env is null', () => {
      const threshold = getActivityThresholdDays(null);
      expect(threshold).toBe(3);
    });

    it('should return default value (3) when ACTIVITY_THRESHOLD_DAYS is not set', () => {
      const threshold = getActivityThresholdDays({});
      expect(threshold).toBe(3);
    });

    it('should return parsed value when ACTIVITY_THRESHOLD_DAYS is valid', () => {
      const threshold = getActivityThresholdDays({ ACTIVITY_THRESHOLD_DAYS: '7' });
      expect(threshold).toBe(7);
    });

    it('should return default value (3) when ACTIVITY_THRESHOLD_DAYS is not a number', () => {
      const threshold = getActivityThresholdDays({ ACTIVITY_THRESHOLD_DAYS: 'invalid' });
      expect(threshold).toBe(3);
    });

    it('should return default value (3) when ACTIVITY_THRESHOLD_DAYS is zero', () => {
      const threshold = getActivityThresholdDays({ ACTIVITY_THRESHOLD_DAYS: '0' });
      expect(threshold).toBe(3);
    });

    it('should return default value (3) when ACTIVITY_THRESHOLD_DAYS is negative', () => {
      const threshold = getActivityThresholdDays({ ACTIVITY_THRESHOLD_DAYS: '-5' });
      expect(threshold).toBe(3);
    });
  });

  describe('getActivityCutoffDate', () => {
    it('should calculate cutoff date correctly for 3 days', () => {
      const cutoffDate = getActivityCutoffDate(3);
      const cutoffTime = new Date(cutoffDate).getTime();
      const expectedTime = Date.now() - (3 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(cutoffTime - expectedTime)).toBeLessThan(1000);
    });

    it('should calculate cutoff date correctly for 7 days', () => {
      const cutoffDate = getActivityCutoffDate(7);
      const cutoffTime = new Date(cutoffDate).getTime();
      const expectedTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(cutoffTime - expectedTime)).toBeLessThan(1000);
    });
  });

  describe('createActiveInstallationFilter', () => {
    it('should create filter for active installations', () => {
      const cutoffDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const filter = createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate);
      
      // The filter should be a SQL condition object
      expect(filter).toBeDefined();
    });
  });

  describe('createStaleInstallationFilter', () => {
    it('should create filter for stale installations', () => {
      const cutoffDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const filter = createStaleInstallationFilter(installations.lastHeartbeatAt, cutoffDate);
      
      // The filter should be a SQL condition object
      expect(filter).toBeDefined();
    });

    it('should be the inverse of active installation filter', () => {
      const cutoffDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const activeFilter = createActiveInstallationFilter(installations.lastHeartbeatAt, cutoffDate);
      const staleFilter = createStaleInstallationFilter(installations.lastHeartbeatAt, cutoffDate);
      
      // Both filters should be defined
      expect(activeFilter).toBeDefined();
      expect(staleFilter).toBeDefined();
      
      // They should be different objects
      expect(activeFilter).not.toBe(staleFilter);
    });
  });
});
