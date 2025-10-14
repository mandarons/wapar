import { describe, it, expect } from 'vitest';
import {
	calculateInstallToActivityRate,
	calculateGeographicDiversityIndex,
	calculateEngagementQualityScore,
	calculateMarketPenetrationScore,
	getPerformanceRating,
	getDiversityRating,
	calculateAllMetrics,
	formatPercentage,
	formatScore,
	type CountryData
} from './analytics';

describe('calculateInstallToActivityRate', () => {
	it('should calculate correct conversion rate', () => {
		expect(calculateInstallToActivityRate(600, 1000)).toBe(60);
		expect(calculateInstallToActivityRate(250, 1000)).toBe(25);
		expect(calculateInstallToActivityRate(100, 1000)).toBe(10);
	});

	it('should handle zero total installations', () => {
		expect(calculateInstallToActivityRate(100, 0)).toBe(0);
	});

	it('should handle zero monthly active', () => {
		expect(calculateInstallToActivityRate(0, 1000)).toBe(0);
	});

	it('should handle both zero', () => {
		expect(calculateInstallToActivityRate(0, 0)).toBe(0);
	});

	it('should handle perfect conversion (100%)', () => {
		expect(calculateInstallToActivityRate(1000, 1000)).toBe(100);
	});

	it('should handle decimal results', () => {
		expect(calculateInstallToActivityRate(333, 1000)).toBeCloseTo(33.3);
	});
});

describe('calculateGeographicDiversityIndex', () => {
	it('should return 0 for single country (complete concentration)', () => {
		const data: CountryData[] = [{ countryCode: 'US', count: 1000 }];
		const result = calculateGeographicDiversityIndex(data, 1000);
		expect(result).toBe(0);
	});

	it('should return high value for equal distribution', () => {
		const data: CountryData[] = [
			{ countryCode: 'US', count: 250 },
			{ countryCode: 'GB', count: 250 },
			{ countryCode: 'DE', count: 250 },
			{ countryCode: 'FR', count: 250 }
		];
		const result = calculateGeographicDiversityIndex(data, 1000);
		// For 4 equal countries: HHI = 4 * (0.25^2) = 0.25, diversity = 1 - 0.25 = 0.75
		expect(result).toBeCloseTo(0.75);
	});

	it('should return higher value for more distributed markets', () => {
		const concentrated: CountryData[] = [
			{ countryCode: 'US', count: 800 },
			{ countryCode: 'GB', count: 200 }
		];
		const distributed: CountryData[] = [
			{ countryCode: 'US', count: 250 },
			{ countryCode: 'GB', count: 250 },
			{ countryCode: 'DE', count: 250 },
			{ countryCode: 'FR', count: 250 }
		];
		const concentratedIndex = calculateGeographicDiversityIndex(concentrated, 1000);
		const distributedIndex = calculateGeographicDiversityIndex(distributed, 1000);
		expect(distributedIndex).toBeGreaterThan(concentratedIndex);
	});

	it('should handle zero total installations', () => {
		const data: CountryData[] = [{ countryCode: 'US', count: 0 }];
		expect(calculateGeographicDiversityIndex(data, 0)).toBe(0);
	});

	it('should handle empty country data', () => {
		expect(calculateGeographicDiversityIndex([], 1000)).toBe(0);
	});

	it('should calculate correctly for realistic distribution', () => {
		const data: CountryData[] = [
			{ countryCode: 'US', count: 350 },
			{ countryCode: 'GB', count: 150 },
			{ countryCode: 'DE', count: 100 },
			{ countryCode: 'CA', count: 80 },
			{ countryCode: 'FR', count: 70 },
			{ countryCode: 'AU', count: 60 },
			{ countryCode: 'NL', count: 50 },
			{ countryCode: 'SE', count: 40 },
			{ countryCode: 'BE', count: 35 },
			{ countryCode: 'CH', count: 30 },
			{ countryCode: 'AT', count: 25 },
			{ countryCode: 'ES', count: 10 }
		];
		const total = data.reduce((sum, c) => sum + c.count, 0);
		const result = calculateGeographicDiversityIndex(data, total);
		// Should be between 0 and 1, closer to high end due to multiple countries
		expect(result).toBeGreaterThan(0.6);
		expect(result).toBeLessThan(0.9);
	});

	it('should approach 1 for many equal countries', () => {
		// Create 100 countries with equal distribution
		const data: CountryData[] = Array.from({ length: 100 }, (_, i) => ({
			countryCode: `C${i}`,
			count: 10
		}));
		const result = calculateGeographicDiversityIndex(data, 1000);
		// For 100 equal countries: HHI = 100 * (0.01^2) = 0.01, diversity = 0.99
		expect(result).toBeCloseTo(0.99, 2);
	});
});

describe('calculateEngagementQualityScore', () => {
	it('should calculate correct quality score with low diversity', () => {
		// 60% engagement, 0 diversity (single country)
		const result = calculateEngagementQualityScore(600, 1000, 0);
		// (600/1000) * (1 + 0) = 0.6 * 1 = 0.6
		expect(result).toBeCloseTo(0.6);
	});

	it('should calculate correct quality score with high diversity', () => {
		// 60% engagement, 0.75 diversity
		const result = calculateEngagementQualityScore(600, 1000, 0.75);
		// (600/1000) * (1 + 0.75) = 0.6 * 1.75 = 1.05
		expect(result).toBeCloseTo(1.05);
	});

	it('should show diversity bonus improves quality score', () => {
		const lowDiversity = calculateEngagementQualityScore(600, 1000, 0);
		const highDiversity = calculateEngagementQualityScore(600, 1000, 0.75);
		expect(highDiversity).toBeGreaterThan(lowDiversity);
	});

	it('should handle zero installations', () => {
		expect(calculateEngagementQualityScore(0, 0, 0.5)).toBe(0);
	});

	it('should handle zero engagement', () => {
		const result = calculateEngagementQualityScore(0, 1000, 0.5);
		expect(result).toBe(0);
	});

	it('should calculate realistic scenario', () => {
		// 45% engagement, 0.7 diversity
		const result = calculateEngagementQualityScore(450, 1000, 0.7);
		// (450/1000) * (1 + 0.7) = 0.45 * 1.7 = 0.765
		expect(result).toBeCloseTo(0.765);
	});

	it('should never exceed 2.0 (maximum possible)', () => {
		// 100% engagement, 1.0 diversity
		const result = calculateEngagementQualityScore(1000, 1000, 1.0);
		// (1000/1000) * (1 + 1.0) = 1 * 2 = 2.0
		expect(result).toBeCloseTo(2.0);
		expect(result).toBeLessThanOrEqual(2.0);
	});
});

describe('calculateMarketPenetrationScore', () => {
	it('should score excellent engagement (>50%) in 90-100 range', () => {
		const score60 = calculateMarketPenetrationScore(600, 1000); // 60%
		const score75 = calculateMarketPenetrationScore(750, 1000); // 75%
		const score100 = calculateMarketPenetrationScore(1000, 1000); // 100%

		expect(score60).toBeGreaterThanOrEqual(90);
		expect(score75).toBeGreaterThan(score60);
		expect(score100).toBe(100);
	});

	it('should score good engagement (25-50%) in 60-89 range', () => {
		const score30 = calculateMarketPenetrationScore(300, 1000); // 30%
		const score40 = calculateMarketPenetrationScore(400, 1000); // 40%
		const score49 = calculateMarketPenetrationScore(490, 1000); // 49%

		expect(score30).toBeGreaterThanOrEqual(60);
		expect(score30).toBeLessThan(90);
		expect(score40).toBeGreaterThan(score30);
		expect(score49).toBeLessThan(90);
	});

	it('should score poor engagement (<25%) in 0-59 range', () => {
		const score10 = calculateMarketPenetrationScore(100, 1000); // 10%
		const score20 = calculateMarketPenetrationScore(200, 1000); // 20%
		const score24 = calculateMarketPenetrationScore(240, 1000); // 24%

		expect(score10).toBeGreaterThanOrEqual(0);
		expect(score10).toBeLessThan(60);
		expect(score20).toBeGreaterThan(score10);
		expect(score24).toBeLessThan(60);
	});

	it('should handle zero installations', () => {
		expect(calculateMarketPenetrationScore(0, 0)).toBe(0);
	});

	it('should handle zero engagement', () => {
		expect(calculateMarketPenetrationScore(0, 1000)).toBe(0);
	});

	it('should score boundary values correctly', () => {
		const score25 = calculateMarketPenetrationScore(250, 1000); // 25%
		const score50 = calculateMarketPenetrationScore(500, 1000); // 50%

		// 25% should be around 60
		expect(score25).toBeCloseTo(60, 0);
		// 50% should be around 89-90
		expect(score50).toBeGreaterThanOrEqual(89);
		expect(score50).toBeLessThan(91);
	});
});

describe('getPerformanceRating', () => {
	it('should return Excellent for score >= 80', () => {
		const rating90 = getPerformanceRating(90);
		const rating80 = getPerformanceRating(80);

		expect(rating90.label).toBe('Excellent');
		expect(rating90.indicator).toBe('🟢');
		expect(rating80.label).toBe('Excellent');
	});

	it('should return Good for score 60-79', () => {
		const rating70 = getPerformanceRating(70);
		const rating60 = getPerformanceRating(60);

		expect(rating70.label).toBe('Good');
		expect(rating70.indicator).toBe('🟡');
		expect(rating60.label).toBe('Good');
	});

	it('should return Fair for score 40-59', () => {
		const rating50 = getPerformanceRating(50);
		const rating40 = getPerformanceRating(40);

		expect(rating50.label).toBe('Fair');
		expect(rating50.indicator).toBe('🟠');
		expect(rating40.label).toBe('Fair');
	});

	it('should return Needs Improvement for score < 40', () => {
		const rating30 = getPerformanceRating(30);
		const rating0 = getPerformanceRating(0);

		expect(rating30.label).toBe('Needs Improvement');
		expect(rating30.indicator).toBe('🔴');
		expect(rating0.label).toBe('Needs Improvement');
	});

	it('should include color and description', () => {
		const rating = getPerformanceRating(85);
		expect(rating.color).toBeDefined();
		expect(rating.bgColor).toBeDefined();
		expect(rating.description).toBeDefined();
		expect(rating.color).toContain('green');
	});
});

describe('getDiversityRating', () => {
	it('should return Excellent for diversity >= 0.8', () => {
		const rating = getDiversityRating(0.85);
		expect(rating.label).toBe('Excellent');
		expect(rating.color).toContain('green');
	});

	it('should return Good for diversity 0.6-0.79', () => {
		const rating = getDiversityRating(0.7);
		expect(rating.label).toBe('Good');
		expect(rating.color).toContain('yellow');
	});

	it('should return Moderate for diversity 0.4-0.59', () => {
		const rating = getDiversityRating(0.5);
		expect(rating.label).toBe('Moderate');
		expect(rating.color).toContain('orange');
	});

	it('should return Low for diversity < 0.4', () => {
		const rating = getDiversityRating(0.2);
		expect(rating.label).toBe('Low');
		expect(rating.color).toContain('red');
	});

	it('should include description', () => {
		const rating = getDiversityRating(0.9);
		expect(rating.description).toBeDefined();
		expect(rating.description.length).toBeGreaterThan(0);
	});
});

describe('calculateAllMetrics', () => {
	it('should calculate all metrics correctly', () => {
		const countryData: CountryData[] = [
			{ countryCode: 'US', count: 500 },
			{ countryCode: 'GB', count: 300 },
			{ countryCode: 'DE', count: 200 }
		];
		const metrics = calculateAllMetrics(600, 1000, countryData);

		expect(metrics.installToActivityRate).toBe(60);
		expect(metrics.geographicDiversityIndex).toBeGreaterThan(0);
		expect(metrics.engagementQualityScore).toBeGreaterThan(0);
		expect(metrics.marketPenetrationScore).toBeGreaterThan(0);
	});

	it('should return all metrics as numbers', () => {
		const countryData: CountryData[] = [{ countryCode: 'US', count: 1000 }];
		const metrics = calculateAllMetrics(500, 1000, countryData);

		expect(typeof metrics.installToActivityRate).toBe('number');
		expect(typeof metrics.geographicDiversityIndex).toBe('number');
		expect(typeof metrics.engagementQualityScore).toBe('number');
		expect(typeof metrics.marketPenetrationScore).toBe('number');
	});

	it('should handle edge case with no data', () => {
		const metrics = calculateAllMetrics(0, 0, []);

		expect(metrics.installToActivityRate).toBe(0);
		expect(metrics.geographicDiversityIndex).toBe(0);
		expect(metrics.engagementQualityScore).toBe(0);
		expect(metrics.marketPenetrationScore).toBe(0);
	});

	it('should produce consistent metrics for realistic data', () => {
		const countryData: CountryData[] = [
			{ countryCode: 'US', count: 350 },
			{ countryCode: 'GB', count: 150 },
			{ countryCode: 'DE', count: 100 },
			{ countryCode: 'CA', count: 80 },
			{ countryCode: 'FR', count: 70 },
			{ countryCode: 'AU', count: 60 },
			{ countryCode: 'NL', count: 50 },
			{ countryCode: 'SE', count: 40 },
			{ countryCode: 'BE', count: 35 },
			{ countryCode: 'CH', count: 30 },
			{ countryCode: 'AT', count: 25 },
			{ countryCode: 'ES', count: 10 }
		];
		const metrics = calculateAllMetrics(600, 1000, countryData);

		// All metrics should be reasonable
		expect(metrics.installToActivityRate).toBe(60);
		expect(metrics.geographicDiversityIndex).toBeGreaterThan(0.6);
		expect(metrics.geographicDiversityIndex).toBeLessThan(0.9);
		expect(metrics.engagementQualityScore).toBeGreaterThan(0.6);
		expect(metrics.engagementQualityScore).toBeLessThan(1.2);
		expect(metrics.marketPenetrationScore).toBeGreaterThanOrEqual(90);
	});
});

describe('formatPercentage', () => {
	it('should format with default 1 decimal place', () => {
		expect(formatPercentage(45.67)).toBe('45.7%');
		expect(formatPercentage(10.2)).toBe('10.2%');
	});

	it('should format with custom decimal places', () => {
		expect(formatPercentage(45.678, 2)).toBe('45.68%');
		expect(formatPercentage(45.678, 0)).toBe('46%');
	});

	it('should handle zero', () => {
		expect(formatPercentage(0)).toBe('0.0%');
	});

	it('should handle 100', () => {
		expect(formatPercentage(100)).toBe('100.0%');
	});
});

describe('formatScore', () => {
	it('should format score with 1 decimal place', () => {
		expect(formatScore(87.65)).toBe('87.7');
		expect(formatScore(45.2)).toBe('45.2');
	});

	it('should handle zero', () => {
		expect(formatScore(0)).toBe('0.0');
	});

	it('should handle 100', () => {
		expect(formatScore(100)).toBe('100.0');
	});

	it('should round correctly', () => {
		expect(formatScore(45.44)).toBe('45.4');
		expect(formatScore(45.45)).toBe('45.5');
		expect(formatScore(45.46)).toBe('45.5');
	});
});
