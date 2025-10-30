import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
	buildOverviewMetrics,
	describeUpdate,
	deriveLastSynced,
	formatInstallCount
} from './overview';

const baseDate = new Date('2025-01-15T12:00:00Z');

describe('formatInstallCount', () => {
	it('formats positive integers with localisation', () => {
		expect(formatInstallCount(12345)).toMatch(/12,345|12\u00a0345/);
	});

	it('normalises negative values to zero', () => {
		expect(formatInstallCount(-50)).toBe('0');
	});

	it('truncates decimals before formatting', () => {
		expect(formatInstallCount(42.9)).toBe('42');
	});
});

describe('buildOverviewMetrics', () => {
	it('returns formatted metric entries with stable test ids', () => {
		const metrics = buildOverviewMetrics({
			totalInstallations: 2488,
			iCloudDockerTotal: 1400,
			haBouncieTotal: 1088
		});

		expect(metrics).toHaveLength(3);
		expect(metrics[0]).toEqual(
			expect.objectContaining({
				label: 'Total installations',
				testId: 'total-installations'
			})
		);
		expect(metrics[1]).toEqual(
			expect.objectContaining({
				value: expect.stringMatching(/1,400|1\u00a0400/),
				testId: 'icloud-drive-docker-total-installations'
			})
		);
		expect(metrics[2].label).toBe('Home Assistant – Bouncie');
	});
});

describe('describeUpdate', () => {
	it('summarises total installations and country coverage', () => {
		const summary = describeUpdate({
			totalInstallations: 2500,
			countryCount: 35,
			installationsLast24h: null,
			installationsLast7d: null
		});

		expect(summary).toMatch(/2(,|\u00a0)?500/);
		expect(summary).toContain('35 countries');
	});

	it('mentions daily and weekly changes when provided', () => {
		const summary = describeUpdate({
			totalInstallations: 2500,
			countryCount: 8,
			installationsLast24h: 12,
			installationsLast7d: 58
		});

		expect(summary).toMatch(/12(,|\u00a0)?/);
		expect(summary).toContain('last 24 hours');
		expect(summary).toContain('last 7 days');
	});

	it('mentions only daily changes when weekly data missing', () => {
		const summary = describeUpdate({
			totalInstallations: 100,
			countryCount: 4,
			installationsLast24h: 5,
			installationsLast7d: null
		});

		expect(summary).toContain('last 24 hours');
		expect(summary).not.toContain('last 7 days');
	});

	it('mentions only weekly changes when daily data missing', () => {
		const summary = describeUpdate({
			totalInstallations: 100,
			countryCount: 4,
			installationsLast24h: null,
			installationsLast7d: 15
		});

		expect(summary).toContain('last 7 days');
		expect(summary).not.toContain('last 24 hours');
	});

	it('handles singular country phrasing', () => {
		const summary = describeUpdate({
			totalInstallations: 12,
			countryCount: 1,
			installationsLast24h: null,
			installationsLast7d: null
		});

		expect(summary).toContain('1 country');
	});
});

describe('deriveLastSynced', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(baseDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns unknown metadata when timestamp is missing', () => {
		const result = deriveLastSynced(null);

		expect(result.isKnown).toBe(false);
		expect(result.relative).toBe('time unavailable');
	});

	it('returns unknown metadata when timestamp is invalid', () => {
		const result = deriveLastSynced('not-a-date');

		expect(result.isKnown).toBe(false);
	});

	it('returns relative and absolute strings for valid timestamps', () => {
		const result = deriveLastSynced('2025-01-15T11:00:00Z');

		expect(result.isKnown).toBe(true);
		expect(result.relative).toBe('1 hour ago');
		expect(result.absolute).toMatch(/Jan|2025/);
	});
});
