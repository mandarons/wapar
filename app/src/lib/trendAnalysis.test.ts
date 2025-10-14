import { describe, it, expect } from 'vitest';
import {
	calculateGrowthRate,
	calculateDailyGrowthRate,
	calculateWeeklyGrowthRate,
	calculateMonthlyGrowthRate,
	calculateGrowthVelocity,
	projectMilestone,
	calculateAllGrowthMetrics,
	type GrowthRate
} from './trendAnalysis';
import type { DataSnapshot } from './historicalData';

describe('trendAnalysis', () => {
	const createSnapshot = (
		daysAgo: number,
		totalInstallations: number
	): DataSnapshot => {
		const date = new Date();
		date.setDate(date.getDate() - daysAgo);
		return {
			timestamp: date.toISOString(),
			totalInstallations,
			monthlyActive: Math.floor(totalInstallations * 0.6),
			iCloudDocker: Math.floor(totalInstallations * 0.55),
			haBouncie: Math.floor(totalInstallations * 0.45),
			countryToCount: []
		};
	};

	describe('calculateGrowthRate', () => {
		it('should calculate positive growth rate correctly', () => {
			const current = createSnapshot(0, 1100);
			const previous = createSnapshot(1, 1000);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBeCloseTo(10); // 10% growth
			expect(result.absolute).toBe(100);
			expect(result.isPositive).toBe(true);
			expect(result.period).toBe('24h');
		});

		it('should calculate negative growth rate correctly', () => {
			const current = createSnapshot(0, 900);
			const previous = createSnapshot(1, 1000);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBeCloseTo(-10); // -10% growth
			expect(result.absolute).toBe(-100);
			expect(result.isPositive).toBe(false);
		});

		it('should handle zero previous value', () => {
			const current = createSnapshot(0, 1000);
			const previous = createSnapshot(1, 0);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBe(0);
			expect(result.absolute).toBe(1000);
		});

		it('should handle no change', () => {
			const current = createSnapshot(0, 1000);
			const previous = createSnapshot(1, 1000);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBe(0);
			expect(result.absolute).toBe(0);
			expect(result.isPositive).toBe(true);
		});
	});

	describe('calculateDailyGrowthRate', () => {
		it('should calculate daily growth rate', () => {
			const snapshots: DataSnapshot[] = [
				createSnapshot(7, 1000),
				createSnapshot(6, 1010),
				createSnapshot(5, 1020),
				createSnapshot(4, 1030),
				createSnapshot(3, 1040),
				createSnapshot(2, 1050),
				createSnapshot(1, 1060),
				createSnapshot(0, 1070)
			];

			const result = calculateDailyGrowthRate(snapshots);

			expect(result).not.toBeNull();
			expect(result!.period).toBe('24h');
			expect(result!.value).toBeGreaterThan(0);
		});

		it('should return null with insufficient data', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1000)];

			const result = calculateDailyGrowthRate(snapshots);

			expect(result).toBeNull();
		});

		it('should return null with empty array', () => {
			const result = calculateDailyGrowthRate([]);
			expect(result).toBeNull();
		});
	});

	describe('calculateWeeklyGrowthRate', () => {
		it('should calculate weekly growth rate', () => {
			const snapshots: DataSnapshot[] = [];
			for (let i = 30; i >= 0; i--) {
				snapshots.push(createSnapshot(i, 1000 + i * 10));
			}

			const result = calculateWeeklyGrowthRate(snapshots);

			expect(result).not.toBeNull();
			expect(result!.period).toBe('7d');
		});

		it('should return null with insufficient data', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1000)];

			const result = calculateWeeklyGrowthRate(snapshots);

			expect(result).toBeNull();
		});
	});

	describe('calculateMonthlyGrowthRate', () => {
		it('should calculate monthly growth rate', () => {
			const snapshots: DataSnapshot[] = [];
			for (let i = 60; i >= 0; i--) {
				snapshots.push(createSnapshot(i, 1000 + i * 10));
			}

			const result = calculateMonthlyGrowthRate(snapshots);

			expect(result).not.toBeNull();
			expect(result!.period).toBe('30d');
		});

		it('should return null with insufficient data', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1000)];

			const result = calculateMonthlyGrowthRate(snapshots);

			expect(result).toBeNull();
		});
	});

	describe('calculateGrowthVelocity', () => {
		it('should calculate growth velocity with accelerating trend', () => {
			const snapshots: DataSnapshot[] = [];
			// Create accelerating growth: slow at first, then rapid
			// 60 days ago to 8 days ago: 5 installs/day (slow growth)
			for (let i = 60; i >= 8; i--) {
				snapshots.push(createSnapshot(i, 1000 + (60 - i) * 5));
			}
			// 7 days ago to now: 50 installs/day (rapid growth)
			const baseInstalls = 1000 + (60 - 7) * 5;
			for (let i = 7; i >= 0; i--) {
				snapshots.push(createSnapshot(i, baseInstalls + (7 - i) * 50));
			}

			const result = calculateGrowthVelocity(snapshots);

			expect(result).not.toBeNull();
			expect(result!.currentRate).toBeGreaterThan(0);
			expect(result!.averageRate).toBeGreaterThan(0);
			// Current rate (50/day) should be much higher than average
			expect(result!.currentRate).toBeGreaterThan(result!.averageRate * 1.5);
			expect(result!.trend).toBe('accelerating');
		});

		it('should calculate growth velocity with decelerating trend', () => {
			const snapshots: DataSnapshot[] = [];
			// Create decelerating growth: fast at first, then slow
			// 60 days ago to 8 days ago: 50 installs/day (rapid growth)
			for (let i = 60; i >= 8; i--) {
				snapshots.push(createSnapshot(i, 1000 + (60 - i) * 50));
			}
			// 7 days ago to now: 5 installs/day (slow growth)
			const baseInstalls = 1000 + (60 - 7) * 50;
			for (let i = 7; i >= 0; i--) {
				snapshots.push(createSnapshot(i, baseInstalls + (7 - i) * 5));
			}

			const result = calculateGrowthVelocity(snapshots);

			expect(result).not.toBeNull();
			// Current rate (5/day) should be much lower than average
			expect(result!.currentRate).toBeLessThan(result!.averageRate * 0.5);
			expect(result!.trend).toBe('decelerating');
		});

		it('should calculate growth velocity with steady trend', () => {
			const snapshots: DataSnapshot[] = [];
			// Steady growth: 10 per day
			for (let i = 30; i >= 0; i--) {
				snapshots.push(createSnapshot(i, 1000 + (30 - i) * 10));
			}

			const result = calculateGrowthVelocity(snapshots);

			expect(result).not.toBeNull();
			expect(result!.trend).toBe('steady');
		});

		it('should return null with insufficient data', () => {
			const snapshots: DataSnapshot[] = [
				createSnapshot(1, 1000),
				createSnapshot(0, 1100)
			];

			const result = calculateGrowthVelocity(snapshots);

			expect(result).toBeNull();
		});
	});

	describe('projectMilestone', () => {
		it('should project milestone date correctly', () => {
			const snapshots: DataSnapshot[] = [];
			// Linear growth: 10 installations per day
			for (let i = 30; i >= 0; i--) {
				snapshots.push(createSnapshot(i, 1000 + (30 - i) * 10));
			}

			const result = projectMilestone(snapshots, 1500);

			expect(result).not.toBeNull();
			expect(result!.daysToMilestone).toBeGreaterThan(0);
			expect(result!.confidence).toBe('high'); // More than 30 data points
			expect(result!.projectedDate).toBeTruthy();
		});

		it('should return null if milestone already reached', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1500)];

			const result = projectMilestone(snapshots, 1000);

			expect(result).toBeNull();
		});

		it('should return null with insufficient data', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1000)];

			const result = projectMilestone(snapshots, 2000);

			expect(result).toBeNull();
		});

		it('should return null with negative growth', () => {
			const snapshots: DataSnapshot[] = [
				createSnapshot(30, 1500),
				createSnapshot(0, 1000)
			];

			const result = projectMilestone(snapshots, 2000);

			expect(result).toBeNull();
		});

		it('should set confidence based on data points', () => {
			// Test high confidence (> 30 data points)
			const highConfSnapshots: DataSnapshot[] = [];
			for (let i = 40; i >= 0; i--) {
				highConfSnapshots.push(createSnapshot(i, 1000 + (40 - i) * 10));
			}
			const highConfResult = projectMilestone(highConfSnapshots, 1500);
			expect(highConfResult).not.toBeNull();
			expect(highConfResult?.confidence).toBe('high');

			// Test medium confidence (15-30 data points)
			const mediumConfSnapshots: DataSnapshot[] = [];
			for (let i = 20; i >= 0; i--) {
				mediumConfSnapshots.push(createSnapshot(i, 1000 + (20 - i) * 10));
			}
			const mediumConfResult = projectMilestone(mediumConfSnapshots, 1300);
			expect(mediumConfResult).not.toBeNull();
			expect(mediumConfResult?.confidence).toBe('medium');

			// Test low confidence (< 15 data points)
			const lowConfSnapshots: DataSnapshot[] = [];
			for (let i = 10; i >= 0; i--) {
				lowConfSnapshots.push(createSnapshot(i, 1000 + (10 - i) * 10));
			}
			const lowConfResult = projectMilestone(lowConfSnapshots, 1150);
			expect(lowConfResult).not.toBeNull();
			expect(lowConfResult?.confidence).toBe('low');
		});
	});

	describe('calculateAllGrowthMetrics', () => {
		it('should calculate all growth metrics at once', () => {
			const snapshots: DataSnapshot[] = [];
			for (let i = 60; i >= 0; i--) {
				snapshots.push(createSnapshot(i, 1000 + i * 10));
			}

			const result = calculateAllGrowthMetrics(snapshots);

			expect(result).toHaveProperty('daily');
			expect(result).toHaveProperty('weekly');
			expect(result).toHaveProperty('monthly');
			expect(result).toHaveProperty('velocity');
		});

		it('should return null values with insufficient data', () => {
			const snapshots: DataSnapshot[] = [createSnapshot(0, 1000)];

			const result = calculateAllGrowthMetrics(snapshots);

			expect(result.daily).toBeNull();
			expect(result.weekly).toBeNull();
			expect(result.monthly).toBeNull();
			expect(result.velocity).toBeNull();
		});

		it('should handle empty snapshots array', () => {
			const result = calculateAllGrowthMetrics([]);

			expect(result.daily).toBeNull();
			expect(result.weekly).toBeNull();
			expect(result.monthly).toBeNull();
			expect(result.velocity).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('should handle snapshots with same timestamp', () => {
			const timestamp = new Date().toISOString();
			const snapshots: DataSnapshot[] = [
				{
					timestamp,
					totalInstallations: 1000,
					monthlyActive: 600,
					iCloudDocker: 555,
					haBouncie: 445,
					countryToCount: []
				},
				{
					timestamp,
					totalInstallations: 1100,
					monthlyActive: 660,
					iCloudDocker: 605,
					haBouncie: 495,
					countryToCount: []
				}
			];

			const result = calculateDailyGrowthRate(snapshots);
			// Should handle gracefully without errors
			expect(result).toBeDefined();
		});

		it('should handle very large numbers', () => {
			const current = createSnapshot(0, 1000000000);
			const previous = createSnapshot(1, 900000000);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBeCloseTo(11.11, 1);
			expect(result.absolute).toBe(100000000);
		});

		it('should handle very small numbers', () => {
			const current = createSnapshot(0, 10);
			const previous = createSnapshot(1, 1);

			const result = calculateGrowthRate(current, previous, '24h');

			expect(result.value).toBe(900); // 900% growth
			expect(result.absolute).toBe(9);
		});
	});
});
