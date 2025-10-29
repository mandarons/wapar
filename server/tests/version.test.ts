import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  compareVersions,
  findLatestVersion,
  sortVersionsDescending
} from '../src/utils/version';

describe('Version Utilities', () => {
  describe('parseVersion', () => {
    it('should parse standard semantic versions', () => {
      const result = parseVersion('1.24.0');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(24);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBe('');
      expect(result.original).toBe('1.24.0');
    });

    it('should parse versions with prerelease tags', () => {
      const result = parseVersion('2.1.0-beta');
      expect(result.major).toBe(2);
      expect(result.minor).toBe(1);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBe('-beta');
    });

    it('should handle non-semver versions', () => {
      const result = parseVersion('main');
      expect(result.major).toBe(-1);
      expect(result.minor).toBe(-1);
      expect(result.patch).toBe(-1);
      expect(result.prerelease).toBe('main');
    });

    it('should handle pr versions', () => {
      const result = parseVersion('pr-360');
      expect(result.major).toBe(-1);
      expect(result.minor).toBe(-1);
      expect(result.patch).toBe(-1);
      expect(result.prerelease).toBe('pr-360');
    });
  });

  describe('compareVersions', () => {
    it('should correctly identify 1.24.0 > 1.15.0', () => {
      expect(compareVersions('1.24.0', '1.15.0')).toBeGreaterThan(0);
      expect(compareVersions('1.15.0', '1.24.0')).toBeLessThan(0);
    });

    it('should correctly compare major versions', () => {
      expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should correctly compare minor versions', () => {
      expect(compareVersions('1.24.0', '1.15.0')).toBeGreaterThan(0);
      expect(compareVersions('1.5.0', '1.20.0')).toBeLessThan(0);
    });

    it('should correctly compare patch versions', () => {
      expect(compareVersions('1.15.2', '1.15.1')).toBeGreaterThan(0);
      expect(compareVersions('1.15.0', '1.15.5')).toBeLessThan(0);
    });

    it('should handle equal versions', () => {
      expect(compareVersions('1.15.0', '1.15.0')).toBe(0);
    });

    it('should prefer releases over prereleases', () => {
      expect(compareVersions('1.15.0', '1.15.0-beta')).toBeGreaterThan(0);
      expect(compareVersions('1.15.0-alpha', '1.15.0')).toBeLessThan(0);
    });

    it('should put non-semver versions at the bottom', () => {
      expect(compareVersions('1.0.0', 'main')).toBeGreaterThan(0);
      expect(compareVersions('pr-360', '1.0.0')).toBeLessThan(0);
    });
  });

  describe('findLatestVersion', () => {
    it('should find the latest version from real-world data', () => {
      const versions = [
        '1.15.0',
        '1.14.0',
        '1.18.0',
        '1.20.1',
        '1.17.0',
        '1.21.0',
        '1.16.1',
        '1.20.0',
        '1.20.2',
        '1.16.0',
        '1.14.1',
        '1.13.0',
        '1.24.0',
        '1.23.0',
        '1.22.0',
        'main',
        '1.19.0',
        '${GITHUB_REF#refs/tags/v}',
        'pr-360',
        'pr-356',
        'pr-346',
        '0.2.2'
      ];

      const latest = findLatestVersion(versions);
      expect(latest).toBe('1.24.0');
    });

    it('should handle empty array', () => {
      expect(findLatestVersion([])).toBeNull();
    });

    it('should handle single version', () => {
      expect(findLatestVersion(['1.0.0'])).toBe('1.0.0');
    });

    it('should handle versions with different major numbers', () => {
      const versions = ['1.0.0', '2.0.0', '1.99.0'];
      expect(findLatestVersion(versions)).toBe('2.0.0');
    });
  });

  describe('sortVersionsDescending', () => {
    it('should sort versions in descending order', () => {
      const versions = ['1.15.0', '1.24.0', '1.20.0', '1.14.0'];
      const sorted = sortVersionsDescending(versions);
      expect(sorted).toEqual(['1.24.0', '1.20.0', '1.15.0', '1.14.0']);
    });

    it('should not mutate original array', () => {
      const versions = ['1.15.0', '1.24.0', '1.20.0'];
      const original = [...versions];
      sortVersionsDescending(versions);
      expect(versions).toEqual(original);
    });

    it('should handle real-world version list', () => {
      const versions = [
        '1.15.0',
        '1.24.0',
        '1.20.1',
        'main',
        '1.13.0'
      ];
      const sorted = sortVersionsDescending(versions);
      expect(sorted[0]).toBe('1.24.0');
      expect(sorted[1]).toBe('1.20.1');
      expect(sorted[2]).toBe('1.15.0');
      expect(sorted[3]).toBe('1.13.0');
      expect(sorted[4]).toBe('main');
    });
  });
});
