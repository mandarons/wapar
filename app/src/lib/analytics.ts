/**
 * Advanced Analytics Calculation Library
 *
 * Provides sophisticated analytics calculations for app performance metrics,
 * market penetration analysis, and growth patterns.
 */

/**
 * Data structure for country installation counts
 */
export interface CountryData {
	countryCode: string;
	count: number;
}

/**
 * Analytics metrics result
 */
export interface AnalyticsMetrics {
	installToActivityRate: number;
	geographicDiversityIndex: number;
	engagementQualityScore: number;
	marketPenetrationScore: number;
}

/**
 * Calculate Install-to-Activity Conversion Rate
 *
 * Measures what percentage of total installations are monthly active users.
 * Higher percentages indicate better user retention and engagement.
 *
 * @param monthlyActive - Number of monthly active users
 * @param totalInstallations - Total number of installations
 * @returns Conversion rate as a percentage (0-100)
 */
export function calculateInstallToActivityRate(
	monthlyActive: number,
	totalInstallations: number
): number {
	if (totalInstallations === 0) {
		return 0;
	}
	return (monthlyActive / totalInstallations) * 100;
}

/**
 * Calculate Geographic Diversity Index using Herfindahl-Hirschman Index (HHI)
 *
 * Measures market distribution concentration across countries.
 * - 0: Complete concentration (one country has all installations)
 * - 1: Perfect distribution (all countries have equal shares)
 *
 * Higher values indicate better geographic distribution and lower market risk.
 *
 * @param countryData - Array of country installation data
 * @param totalInstallations - Total number of installations
 * @returns Diversity index (0-1)
 */
export function calculateGeographicDiversityIndex(
	countryData: CountryData[],
	totalInstallations: number
): number {
	if (totalInstallations === 0 || countryData.length === 0) {
		return 0;
	}

	// Calculate squared sum of market shares
	const herfindahlIndex = countryData.reduce((sum, country) => {
		const share = country.count / totalInstallations;
		return sum + share * share;
	}, 0);

	// Convert to diversity index (1 - HHI)
	return 1 - herfindahlIndex;
}

/**
 * Calculate Engagement Quality Score
 *
 * A composite metric combining engagement rate with geographic diversity.
 * Provides a holistic view of app health considering both user activity
 * and market distribution.
 *
 * Formula: (engagementRate / 100) * (1 + diversityIndex)
 *
 * @param monthlyActive - Number of monthly active users
 * @param totalInstallations - Total number of installations
 * @param diversityIndex - Geographic diversity index (0-1)
 * @returns Quality score (0-2, typically 0-1.5)
 */
export function calculateEngagementQualityScore(
	monthlyActive: number,
	totalInstallations: number,
	diversityIndex: number
): number {
	if (totalInstallations === 0) {
		return 0;
	}

	const engagementRate = monthlyActive / totalInstallations;
	// Diversity bonus: 1 + diversityIndex (ranges from 1 to 2)
	const diversityBonus = 1 + diversityIndex;

	return engagementRate * diversityBonus;
}

/**
 * Calculate Market Penetration Score
 *
 * Compares engagement rate against industry benchmarks for SaaS applications.
 * - Excellent: >50% engagement (above industry average)
 * - Good: 25-50% engagement (industry average)
 * - Needs Improvement: <25% engagement (below industry average)
 *
 * @param monthlyActive - Number of monthly active users
 * @param totalInstallations - Total number of installations
 * @returns Score from 0-100 representing performance vs benchmarks
 */
export function calculateMarketPenetrationScore(
	monthlyActive: number,
	totalInstallations: number
): number {
	if (totalInstallations === 0) {
		return 0;
	}

	const engagementRate = (monthlyActive / totalInstallations) * 100;

	// Score against industry benchmarks
	// >50%: Excellent (score 90-100)
	// 25-50%: Good (score 60-89)
	// <25%: Needs improvement (score 0-59)

	if (engagementRate >= 50) {
		// Linear scale from 90 to 100 for 50% to 100% engagement
		return 90 + Math.min(((engagementRate - 50) / 50) * 10, 10);
	} else if (engagementRate >= 25) {
		// Linear scale from 60 to 89 for 25% to 50% engagement
		return 60 + ((engagementRate - 25) / 25) * 29;
	} else {
		// Linear scale from 0 to 59 for 0% to 25% engagement
		return (engagementRate / 25) * 60;
	}
}

/**
 * Get performance rating based on a score
 *
 * @param score - Score from 0-100
 * @returns Object with rating label, color, and description
 */
export function getPerformanceRating(score: number): {
	label: string;
	color: string;
	bgColor: string;
	indicator: string;
	description: string;
} {
	if (score >= 80) {
		return {
			label: 'Excellent',
			color: 'text-green-600',
			bgColor: 'bg-green-100',
			indicator: '🟢',
			description: 'Outstanding performance'
		};
	} else if (score >= 60) {
		return {
			label: 'Good',
			color: 'text-yellow-600',
			bgColor: 'bg-yellow-100',
			indicator: '🟡',
			description: 'Above average performance'
		};
	} else if (score >= 40) {
		return {
			label: 'Fair',
			color: 'text-orange-600',
			bgColor: 'bg-orange-100',
			indicator: '🟠',
			description: 'Average performance'
		};
	} else {
		return {
			label: 'Needs Improvement',
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			indicator: '🔴',
			description: 'Below average performance'
		};
	}
}

/**
 * Get diversity rating description
 *
 * @param diversityIndex - Diversity index (0-1)
 * @returns Object with rating label and description
 */
export function getDiversityRating(diversityIndex: number): {
	label: string;
	description: string;
	color: string;
} {
	if (diversityIndex >= 0.8) {
		return {
			label: 'Excellent',
			description: 'Highly distributed across many countries',
			color: 'text-green-600'
		};
	} else if (diversityIndex >= 0.6) {
		return {
			label: 'Good',
			description: 'Well distributed across multiple countries',
			color: 'text-yellow-600'
		};
	} else if (diversityIndex >= 0.4) {
		return {
			label: 'Moderate',
			description: 'Concentrated in several key countries',
			color: 'text-orange-600'
		};
	} else {
		return {
			label: 'Low',
			description: 'Highly concentrated in few countries',
			color: 'text-red-600'
		};
	}
}

/**
 * Calculate all analytics metrics at once
 *
 * @param monthlyActive - Number of monthly active users
 * @param totalInstallations - Total number of installations
 * @param countryData - Array of country installation data
 * @returns Object containing all calculated metrics
 */
export function calculateAllMetrics(
	monthlyActive: number,
	totalInstallations: number,
	countryData: CountryData[]
): AnalyticsMetrics {
	const installToActivityRate = calculateInstallToActivityRate(monthlyActive, totalInstallations);
	const geographicDiversityIndex = calculateGeographicDiversityIndex(
		countryData,
		totalInstallations
	);
	const engagementQualityScore = calculateEngagementQualityScore(
		monthlyActive,
		totalInstallations,
		geographicDiversityIndex
	);
	const marketPenetrationScore = calculateMarketPenetrationScore(monthlyActive, totalInstallations);

	return {
		installToActivityRate,
		geographicDiversityIndex,
		engagementQualityScore,
		marketPenetrationScore
	};
}

/**
 * Format a number as a percentage with specified decimal places
 *
 * @param value - Numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return value.toFixed(decimals) + '%';
}

/**
 * Format a score (0-100) with one decimal place
 *
 * @param score - Score value
 * @returns Formatted score string
 */
export function formatScore(score: number): string {
	return score.toFixed(1);
}
