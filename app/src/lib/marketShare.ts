/**
 * Market Share Comparison Utilities
 *
 * Provides utilities for calculating and analyzing market share between applications.
 */

/**
 * Calculate market share percentage for an application
 *
 * @param appTotal - Total installations for the specific app
 * @param totalMarket - Total installations across all apps
 * @returns Market share as a percentage (0-100)
 */
export function calculateMarketShare(appTotal: number, totalMarket: number): number {
	if (totalMarket === 0) {
		return 0;
	}
	return (appTotal / totalMarket) * 100;
}

/**
 * Calculate market share difference between two apps
 *
 * @param app1Total - Total installations for app 1
 * @param app2Total - Total installations for app 2
 * @returns Difference in market share percentage (positive if app1 leads)
 */
export function calculateMarketShareDifference(app1Total: number, app2Total: number): number {
	const totalMarket = app1Total + app2Total;
	if (totalMarket === 0) {
		return 0;
	}
	const app1Share = calculateMarketShare(app1Total, totalMarket);
	const app2Share = calculateMarketShare(app2Total, totalMarket);
	return app1Share - app2Share;
}

/**
 * Determine market leader between two apps
 *
 * @param app1Total - Total installations for app 1
 * @param app1Name - Name of app 1
 * @param app2Total - Total installations for app 2
 * @param app2Name - Name of app 2
 * @returns Object with leader name and margin
 */
export function determineMarketLeader(
	app1Total: number,
	app1Name: string,
	app2Total: number,
	app2Name: string
): { leader: string; margin: number; isTie: boolean } {
	if (app1Total === app2Total) {
		return { leader: 'Tie', margin: 0, isTie: true };
	}

	const difference = Math.abs(calculateMarketShareDifference(app1Total, app2Total));

	return {
		leader: app1Total > app2Total ? app1Name : app2Name,
		margin: difference,
		isTie: false
	};
}

/**
 * Calculate growth rate between two periods
 *
 * @param currentValue - Current period value
 * @param previousValue - Previous period value
 * @returns Growth rate as percentage (positive for growth, negative for decline)
 */
export function calculateGrowthRate(currentValue: number, previousValue: number): number | null {
	if (previousValue === 0) {
		return currentValue > 0 ? 100 : null;
	}
	return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Format market share for display
 *
 * @param percentage - Market share percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with % symbol
 */
export function formatMarketShare(percentage: number, decimals: number = 1): string {
	return percentage.toFixed(decimals) + '%';
}

/**
 * Get chart data for market share visualization
 *
 * @param app1Total - Total installations for app 1
 * @param app1Name - Name of app 1
 * @param app2Total - Total installations for app 2
 * @param app2Name - Name of app 2
 * @returns Object with labels and data arrays for Chart.js
 */
export function getMarketShareChartData(
	app1Total: number,
	app1Name: string,
	app2Total: number,
	app2Name: string
): { labels: string[]; data: number[]; percentages: number[] } {
	const totalMarket = app1Total + app2Total;
	const app1Share = calculateMarketShare(app1Total, totalMarket);
	const app2Share = calculateMarketShare(app2Total, totalMarket);

	return {
		labels: [app1Name, app2Name],
		data: [app1Total, app2Total],
		percentages: [app1Share, app2Share]
	};
}
