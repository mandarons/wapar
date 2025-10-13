import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getRelativeTime,
	calculateDataFreshness,
	REFRESH_INTERVALS,
	getFreshnessColor,
	getFreshnessIndicator
} from './refresh';
import type { DataFreshness } from './refresh';

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

	it('returns valid DataFreshness type values', () => {
		const now = new Date();
		vi.setSystemTime(now);

		const results: DataFreshness[] = [
			calculateDataFreshness(new Date(now.getTime() - 1000)),
			calculateDataFreshness(new Date(now.getTime() - 300000)),
			calculateDataFreshness(new Date(now.getTime() - 900000))
		];

		results.forEach((result) => {
			expect(['fresh', 'moderate', 'stale']).toContain(result);
		});
	});
});

describe('Refresh intervals', () => {
	it('validates refresh interval values', () => {
		expect(REFRESH_INTERVALS.FIVE_MIN).toBe(5 * 60 * 1000);
		expect(REFRESH_INTERVALS.FIFTEEN_MIN).toBe(15 * 60 * 1000);
		expect(REFRESH_INTERVALS.THIRTY_MIN).toBe(30 * 60 * 1000);
		expect(REFRESH_INTERVALS.ONE_HOUR).toBe(60 * 60 * 1000);
	});
});

describe('Data freshness indicator colors', () => {
	it('maps freshness states to correct colors', () => {
		expect(getFreshnessColor('fresh')).toBe('text-green-600');
		expect(getFreshnessColor('moderate')).toBe('text-yellow-600');
		expect(getFreshnessColor('stale')).toBe('text-red-600');
	});

	it('maps freshness states to correct emojis', () => {
		expect(getFreshnessIndicator('fresh')).toBe('🟢');
		expect(getFreshnessIndicator('moderate')).toBe('🟡');
		expect(getFreshnessIndicator('stale')).toBe('🔴');
	});
});
