import { describe, it, expect } from 'vitest';
import {
	calculateMarketShare,
	calculateMarketShareDifference,
	determineMarketLeader,
	calculateGrowthRate,
	formatMarketShare,
	getMarketShareChartData
} from './marketShare';

describe('calculateMarketShare', () => {
	it('should calculate correct market share percentage', () => {
		expect(calculateMarketShare(60, 100)).toBe(60);
		expect(calculateMarketShare(40, 100)).toBe(40);
		expect(calculateMarketShare(75, 150)).toBe(50);
	});

	it('should handle zero total market', () => {
		expect(calculateMarketShare(50, 0)).toBe(0);
	});

	it('should handle zero app total', () => {
		expect(calculateMarketShare(0, 100)).toBe(0);
	});

	it('should handle 100% market share', () => {
		expect(calculateMarketShare(100, 100)).toBe(100);
	});

	it('should handle decimal results', () => {
		expect(calculateMarketShare(333, 1000)).toBeCloseTo(33.3);
		expect(calculateMarketShare(666, 1000)).toBeCloseTo(66.6);
	});
});

describe('calculateMarketShareDifference', () => {
	it('should calculate positive difference when app1 leads', () => {
		expect(calculateMarketShareDifference(60, 40)).toBeCloseTo(20);
		expect(calculateMarketShareDifference(75, 25)).toBeCloseTo(50);
	});

	it('should calculate negative difference when app2 leads', () => {
		expect(calculateMarketShareDifference(40, 60)).toBeCloseTo(-20);
		expect(calculateMarketShareDifference(25, 75)).toBeCloseTo(-50);
	});

	it('should return 0 for equal market share', () => {
		expect(calculateMarketShareDifference(50, 50)).toBe(0);
		expect(calculateMarketShareDifference(100, 100)).toBe(0);
	});

	it('should handle zero totals', () => {
		expect(calculateMarketShareDifference(0, 0)).toBe(0);
		expect(calculateMarketShareDifference(0, 100)).toBeCloseTo(-100);
		expect(calculateMarketShareDifference(100, 0)).toBeCloseTo(100);
	});
});

describe('determineMarketLeader', () => {
	it('should identify app1 as leader when it has more installations', () => {
		const result = determineMarketLeader(600, 'App A', 400, 'App B');
		expect(result.leader).toBe('App A');
		expect(result.margin).toBeCloseTo(20);
		expect(result.isTie).toBe(false);
	});

	it('should identify app2 as leader when it has more installations', () => {
		const result = determineMarketLeader(400, 'App A', 600, 'App B');
		expect(result.leader).toBe('App B');
		expect(result.margin).toBeCloseTo(20);
		expect(result.isTie).toBe(false);
	});

	it('should identify tie when installations are equal', () => {
		const result = determineMarketLeader(500, 'App A', 500, 'App B');
		expect(result.leader).toBe('Tie');
		expect(result.margin).toBe(0);
		expect(result.isTie).toBe(true);
	});

	it('should calculate correct margin for large differences', () => {
		const result = determineMarketLeader(900, 'App A', 100, 'App B');
		expect(result.leader).toBe('App A');
		expect(result.margin).toBeCloseTo(80);
		expect(result.isTie).toBe(false);
	});
});

describe('calculateGrowthRate', () => {
	it('should calculate positive growth rate', () => {
		expect(calculateGrowthRate(120, 100)).toBeCloseTo(20);
		expect(calculateGrowthRate(150, 100)).toBeCloseTo(50);
		expect(calculateGrowthRate(200, 100)).toBeCloseTo(100);
	});

	it('should calculate negative growth rate', () => {
		expect(calculateGrowthRate(80, 100)).toBeCloseTo(-20);
		expect(calculateGrowthRate(50, 100)).toBeCloseTo(-50);
	});

	it('should handle no growth', () => {
		expect(calculateGrowthRate(100, 100)).toBe(0);
	});

	it('should handle zero previous value', () => {
		expect(calculateGrowthRate(100, 0)).toBe(100);
		expect(calculateGrowthRate(0, 0)).toBe(null);
	});

	it('should handle decimal values', () => {
		expect(calculateGrowthRate(105.5, 100)).toBeCloseTo(5.5);
		expect(calculateGrowthRate(92.3, 100)).toBeCloseTo(-7.7);
	});
});

describe('formatMarketShare', () => {
	it('should format with default 1 decimal place', () => {
		expect(formatMarketShare(60.5)).toBe('60.5%');
		expect(formatMarketShare(33.3333)).toBe('33.3%');
	});

	it('should format with custom decimal places', () => {
		expect(formatMarketShare(60.555, 2)).toBe('60.55%');
		expect(formatMarketShare(33.3333, 0)).toBe('33%');
		expect(formatMarketShare(25.123456, 3)).toBe('25.123%');
	});

	it('should handle whole numbers', () => {
		expect(formatMarketShare(50)).toBe('50.0%');
		expect(formatMarketShare(100, 0)).toBe('100%');
	});

	it('should handle zero', () => {
		expect(formatMarketShare(0)).toBe('0.0%');
	});
});

describe('getMarketShareChartData', () => {
	it('should generate correct chart data structure', () => {
		const result = getMarketShareChartData(600, 'iCloud Docker', 400, 'HA Bouncie');

		expect(result.labels).toEqual(['iCloud Docker', 'HA Bouncie']);
		expect(result.data).toEqual([600, 400]);
		expect(result.percentages).toHaveLength(2);
		expect(result.percentages[0]).toBeCloseTo(60);
		expect(result.percentages[1]).toBeCloseTo(40);
	});

	it('should handle equal distribution', () => {
		const result = getMarketShareChartData(500, 'App A', 500, 'App B');

		expect(result.labels).toEqual(['App A', 'App B']);
		expect(result.data).toEqual([500, 500]);
		expect(result.percentages[0]).toBe(50);
		expect(result.percentages[1]).toBe(50);
	});

	it('should handle zero values', () => {
		const result = getMarketShareChartData(0, 'App A', 0, 'App B');

		expect(result.labels).toEqual(['App A', 'App B']);
		expect(result.data).toEqual([0, 0]);
		expect(result.percentages[0]).toBe(0);
		expect(result.percentages[1]).toBe(0);
	});

	it('should handle one app with zero installations', () => {
		const result = getMarketShareChartData(1000, 'App A', 0, 'App B');

		expect(result.labels).toEqual(['App A', 'App B']);
		expect(result.data).toEqual([1000, 0]);
		expect(result.percentages[0]).toBe(100);
		expect(result.percentages[1]).toBe(0);
	});
});
