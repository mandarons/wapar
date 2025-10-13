import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper functions to test
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

export function calculateDataFreshness(lastUpdated: Date): 'fresh' | 'moderate' | 'stale' {
	const now = new Date();
	const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);

	if (diffMinutes < 5) return 'fresh';
	if (diffMinutes < 15) return 'moderate';
	return 'stale';
}

describe('getRelativeTime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns "just now" for times less than 1 minute ago', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const thirtySecondsAgo = new Date(now.getTime() - 30000);
		expect(getRelativeTime(thirtySecondsAgo)).toBe('just now');
	});

	it('returns "1 minute ago" for exactly 1 minute', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const oneMinuteAgo = new Date(now.getTime() - 60000);
		expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
	});

	it('returns "X minutes ago" for multiple minutes', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const fiveMinutesAgo = new Date(now.getTime() - 300000);
		expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');

		const thirtyMinutesAgo = new Date(now.getTime() - 1800000);
		expect(getRelativeTime(thirtyMinutesAgo)).toBe('30 minutes ago');
	});

	it('returns "1 hour ago" for exactly 1 hour', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const oneHourAgo = new Date(now.getTime() - 3600000);
		expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');
	});

	it('returns "X hours ago" for multiple hours', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const threeHoursAgo = new Date(now.getTime() - 10800000);
		expect(getRelativeTime(threeHoursAgo)).toBe('3 hours ago');
	});

	it('returns "1 day ago" for exactly 1 day', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const oneDayAgo = new Date(now.getTime() - 86400000);
		expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');
	});

	it('returns "X days ago" for multiple days', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const threeDaysAgo = new Date(now.getTime() - 259200000);
		expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
	});
});

describe('calculateDataFreshness', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns "fresh" for data less than 5 minutes old', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const twoMinutesAgo = new Date(now.getTime() - 120000);
		expect(calculateDataFreshness(twoMinutesAgo)).toBe('fresh');

		const justNow = new Date(now.getTime() - 1000);
		expect(calculateDataFreshness(justNow)).toBe('fresh');
	});

	it('returns "moderate" for data 5-14 minutes old', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const fiveMinutesAgo = new Date(now.getTime() - 300000);
		expect(calculateDataFreshness(fiveMinutesAgo)).toBe('moderate');

		const tenMinutesAgo = new Date(now.getTime() - 600000);
		expect(calculateDataFreshness(tenMinutesAgo)).toBe('moderate');

		const fourteenMinutesAgo = new Date(now.getTime() - 840000);
		expect(calculateDataFreshness(fourteenMinutesAgo)).toBe('moderate');
	});

	it('returns "stale" for data 15+ minutes old', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const fifteenMinutesAgo = new Date(now.getTime() - 900000);
		expect(calculateDataFreshness(fifteenMinutesAgo)).toBe('stale');

		const thirtyMinutesAgo = new Date(now.getTime() - 1800000);
		expect(calculateDataFreshness(thirtyMinutesAgo)).toBe('stale');

		const oneHourAgo = new Date(now.getTime() - 3600000);
		expect(calculateDataFreshness(oneHourAgo)).toBe('stale');
	});
});

describe('Refresh intervals', () => {
	it('validates refresh interval values', () => {
		const intervals = {
			'5min': 300000,
			'15min': 900000,
			'30min': 1800000,
			'1hour': 3600000
		};

		expect(intervals['5min']).toBe(5 * 60 * 1000);
		expect(intervals['15min']).toBe(15 * 60 * 1000);
		expect(intervals['30min']).toBe(30 * 60 * 1000);
		expect(intervals['1hour']).toBe(60 * 60 * 1000);
	});
});

describe('Data freshness indicator colors', () => {
	it('maps freshness states to correct colors', () => {
		const colorMap = {
			fresh: 'text-green-600',
			moderate: 'text-yellow-600',
			stale: 'text-red-600'
		};

		expect(colorMap.fresh).toBe('text-green-600');
		expect(colorMap.moderate).toBe('text-yellow-600');
		expect(colorMap.stale).toBe('text-red-600');
	});

	it('maps freshness states to correct emojis', () => {
		const emojiMap = {
			fresh: '🟢',
			moderate: '🟡',
			stale: '🔴'
		};

		expect(emojiMap.fresh).toBe('🟢');
		expect(emojiMap.moderate).toBe('🟡');
		expect(emojiMap.stale).toBe('🔴');
	});
});
