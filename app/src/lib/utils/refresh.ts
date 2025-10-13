// Refresh interval constants (in milliseconds)
export const REFRESH_INTERVALS = {
	FIVE_MIN: 300000,
	FIFTEEN_MIN: 900000,
	THIRTY_MIN: 1800000,
	ONE_HOUR: 3600000
} as const;

// Data freshness thresholds (in minutes)
export const FRESHNESS_THRESHOLDS = {
	FRESH: 5,
	MODERATE: 15
} as const;

export type DataFreshness = 'fresh' | 'moderate' | 'stale';

/**
 * Get a human-readable relative time string from a date
 * @param date - The date to convert to relative time
 * @returns A string like "just now", "2 minutes ago", "1 hour ago", etc.
 */
export function getRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMinutes < 1) return 'just now';
	if (diffMinutes === 1) return '1 minute ago';
	if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
	if (diffHours === 1) return '1 hour ago';
	if (diffHours < 24) return `${diffHours} hours ago`;
	if (diffDays === 1) return '1 day ago';
	return `${diffDays} days ago`;
}

/**
 * Calculate data freshness based on when it was last updated
 * @param lastUpdated - The date when data was last updated
 * @returns 'fresh' (< 5 min), 'moderate' (5-14 min), or 'stale' (15+ min)
 */
export function calculateDataFreshness(lastUpdated: Date): DataFreshness {
	const now = new Date();
	const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);

	if (diffMinutes < FRESHNESS_THRESHOLDS.FRESH) return 'fresh';
	if (diffMinutes < FRESHNESS_THRESHOLDS.MODERATE) return 'moderate';
	return 'stale';
}

/**
 * Get the color class for a given freshness state
 */
export function getFreshnessColor(freshness: DataFreshness): string {
	const colorMap: Record<DataFreshness, string> = {
		fresh: 'text-green-600',
		moderate: 'text-yellow-600',
		stale: 'text-red-600'
	};
	return colorMap[freshness];
}

/**
 * Get the emoji indicator for a given freshness state
 */
export function getFreshnessIndicator(freshness: DataFreshness): string {
	const emojiMap: Record<DataFreshness, string> = {
		fresh: '🟢',
		moderate: '🟡',
		stale: '🔴'
	};
	return emojiMap[freshness];
}
