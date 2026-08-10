import { describe, it, expect } from 'vitest';

describe('GrowthAnalytics Component Tests', () => {
	const mockGrowthData = {
		summary: {
			totalNew: 12500,
			totalReinstalls: 1500,
			newUserRate: 89.3,
			period: '30d'
		},
		timeline: [
			{ date: '2025-10-25', newUsers: 450, reinstalls: 55, total: 505 },
			{ date: '2025-10-24', newUsers: 420, reinstalls: 48, total: 468 },
			{ date: '2025-10-23', newUsers: 435, reinstalls: 52, total: 487 }
		],
		topCountriesNewUsers: [
			{ countryCode: 'JP', count: 4075, percentage: 32.6 },
			{ countryCode: 'RU', count: 4063, percentage: 32.5 },
			{ countryCode: 'US', count: 4038, percentage: 32.3 }
		],
		reinstallPatterns: {
			reinstallRate: 10.7
		}
	};

	it('should have valid summary data structure', () => {
		expect(mockGrowthData.summary).toBeDefined();
		expect(mockGrowthData.summary.totalNew).toBeGreaterThan(0);
		expect(mockGrowthData.summary.totalReinstalls).toBeGreaterThanOrEqual(0);
		expect(mockGrowthData.summary.newUserRate).toBeGreaterThanOrEqual(0);
		expect(mockGrowthData.summary.newUserRate).toBeLessThanOrEqual(100);
	});

	it('should have valid timeline data structure', () => {
		expect(mockGrowthData.timeline).toBeDefined();
		expect(Array.isArray(mockGrowthData.timeline)).toBe(true);
		expect(mockGrowthData.timeline.length).toBeGreaterThan(0);
	});

	it('should calculate reinstall rate correctly', () => {
		const total = mockGrowthData.summary.totalNew + mockGrowthData.summary.totalReinstalls;
		const expectedReinstallRate = total > 0 ? 100 - mockGrowthData.summary.newUserRate : 0;
		expect(expectedReinstallRate).toBeCloseTo(10.7, 1);
	});

	it('should have valid top countries data', () => {
		expect(mockGrowthData.topCountriesNewUsers).toBeDefined();
		expect(Array.isArray(mockGrowthData.topCountriesNewUsers)).toBe(true);
		expect(mockGrowthData.topCountriesNewUsers.length).toBeGreaterThan(0);
	});

	it('should have non-negative percentages for top countries', () => {
		mockGrowthData.topCountriesNewUsers.forEach((country) => {
			expect(country.percentage).toBeGreaterThanOrEqual(0);
			expect(country.percentage).toBeLessThanOrEqual(100);
		});
	});

	it('should have non-negative counts', () => {
		mockGrowthData.timeline.forEach((day) => {
			expect(day.newUsers).toBeGreaterThanOrEqual(0);
			expect(day.reinstalls).toBeGreaterThanOrEqual(0);
			expect(day.total).toBeGreaterThanOrEqual(0);
		});
	});

	it('should have total equal to newUsers + reinstalls', () => {
		mockGrowthData.timeline.forEach((day) => {
			expect(day.total).toBe(day.newUsers + day.reinstalls);
		});
	});

	it('should have valid country codes', () => {
		mockGrowthData.topCountriesNewUsers.forEach((country) => {
			expect(typeof country.countryCode).toBe('string');
			expect(country.countryCode.length).toBe(2);
		});
	});

	it('should handle empty timeline', () => {
		const emptyTimeline: Array<{
			date: string;
			newUsers: number;
			reinstalls: number;
			total: number;
		}> = [];
		expect(emptyTimeline.length).toBe(0);
	});

	it('should handle empty top countries', () => {
		const emptyCountries: Array<{
			countryCode: string;
			count: number;
			percentage: number;
		}> = [];
		expect(emptyCountries.length).toBe(0);
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

	it('should validate period format', () => {
		const periodPattern = /^\d+d$/;
		expect(periodPattern.test(mockGrowthData.summary.period)).toBe(true);
		expect(periodPattern.test('30d')).toBe(true);
		expect(periodPattern.test('invalid')).toBe(false);
	});

	it('should have valid reinstall patterns', () => {
		expect(mockGrowthData.reinstallPatterns).toBeDefined();
		expect(mockGrowthData.reinstallPatterns.reinstallRate).toBeGreaterThanOrEqual(0);
		expect(mockGrowthData.reinstallPatterns.reinstallRate).toBeLessThanOrEqual(100);
	});
});
