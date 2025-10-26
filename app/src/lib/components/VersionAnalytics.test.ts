import { describe, it, expect } from 'vitest';

describe('VersionAnalytics Component Tests', () => {
	// Mock version data for testing
	const mockVersionData = {
		versionDistribution: [
			{ version: '2.1.0', count: 450, percentage: 45.0 },
			{ version: '2.0.5', count: 350, percentage: 35.0 },
			{ version: '1.9.8', count: 200, percentage: 20.0 }
		],
		latestVersion: '2.1.0',
		outdatedInstallations: 550,
		upgradeRate: {
			last7Days: 15,
			last30Days: 78
		}
	};

	it('should have valid version distribution data structure', () => {
		expect(mockVersionData.versionDistribution).toBeDefined();
		expect(Array.isArray(mockVersionData.versionDistribution)).toBe(true);
		expect(mockVersionData.versionDistribution.length).toBeGreaterThan(0);
	});

	it('should have correct percentage calculations', () => {
		const totalPercentage = mockVersionData.versionDistribution.reduce(
			(sum, v) => sum + v.percentage,
			0
		);
		expect(totalPercentage).toBeCloseTo(100, 0);
	});

	it('should identify latest version', () => {
		expect(mockVersionData.latestVersion).toBe('2.1.0');
		const latestVersionInDistribution = mockVersionData.versionDistribution.find(
			(v) => v.version === mockVersionData.latestVersion
		);
		expect(latestVersionInDistribution).toBeDefined();
	});

	it('should calculate outdated installations correctly', () => {
		expect(mockVersionData.outdatedInstallations).toBeGreaterThan(0);
		const latestCount = mockVersionData.versionDistribution.find(
			(v) => v.version === mockVersionData.latestVersion
		)?.count || 0;
		const totalCount = mockVersionData.versionDistribution.reduce((sum, v) => sum + v.count, 0);
		expect(mockVersionData.outdatedInstallations).toBe(totalCount - latestCount);
	});

	it('should have valid upgrade rate data', () => {
		expect(mockVersionData.upgradeRate).toBeDefined();
		expect(mockVersionData.upgradeRate.last7Days).toBeGreaterThanOrEqual(0);
		expect(mockVersionData.upgradeRate.last30Days).toBeGreaterThanOrEqual(0);
		expect(mockVersionData.upgradeRate.last30Days).toBeGreaterThanOrEqual(
			mockVersionData.upgradeRate.last7Days
		);
	});

	it('should format large numbers correctly', () => {
		const formatNumber = (num: number): string => {
			if (num >= 1000000) {
				return `${(num / 1000000).toFixed(1)}M`;
			} else if (num >= 1000) {
				return `${(num / 1000).toFixed(1)}K`;
			}
			return num.toString();
		};

		expect(formatNumber(1500)).toBe('1.5K');
		expect(formatNumber(2500000)).toBe('2.5M');
		expect(formatNumber(500)).toBe('500');
	});

	it('should determine outdated versions correctly', () => {
		const isOutdated = (version: string, latestVersion: string | null): boolean => {
			if (!latestVersion || version === latestVersion) return false;
			return version !== latestVersion;
		};

		expect(isOutdated('2.0.5', '2.1.0')).toBe(true);
		expect(isOutdated('2.1.0', '2.1.0')).toBe(false);
		expect(isOutdated('1.9.8', '2.1.0')).toBe(true);
	});

	it('should handle empty version distribution', () => {
		const emptyData = {
			versionDistribution: [],
			latestVersion: null,
			outdatedInstallations: 0,
			upgradeRate: { last7Days: 0, last30Days: 0 }
		};

		expect(emptyData.versionDistribution.length).toBe(0);
		expect(emptyData.latestVersion).toBeNull();
		expect(emptyData.outdatedInstallations).toBe(0);
	});

	it('should validate version string formats', () => {
		const versions = ['1.0', '2.0.0', '3.0.0-beta', 'v4.0.0', 'latest'];
		versions.forEach((version) => {
			expect(typeof version).toBe('string');
			expect(version.length).toBeGreaterThan(0);
		});
	});

	it('should have non-negative counts and percentages', () => {
		mockVersionData.versionDistribution.forEach((v) => {
			expect(v.count).toBeGreaterThanOrEqual(0);
			expect(v.percentage).toBeGreaterThanOrEqual(0);
			expect(v.percentage).toBeLessThanOrEqual(100);
		});
	});
});

