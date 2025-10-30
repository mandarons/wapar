import { getRelativeTime } from './refresh';

const numberFormatter = new Intl.NumberFormat(undefined);

export interface OverviewMetric {
	label: string;
	value: string;
	testId: string;
}

export interface OverviewMetricInput {
	totalInstallations: number;
	iCloudDockerTotal: number;
	haBouncieTotal: number;
}

export interface OverviewSummaryInput {
	totalInstallations: number;
	countryCount: number;
	installationsLast24h: number | null;
	installationsLast7d: number | null;
}

export interface LastSyncedMeta {
	relative: string;
	absolute: string;
	isKnown: boolean;
}

export function formatInstallCount(value: number): string {
	return numberFormatter.format(Math.max(0, Math.trunc(value)));
}

export function buildOverviewMetrics(input: OverviewMetricInput): OverviewMetric[] {
	return [
		{
			label: 'Total installations',
			value: formatInstallCount(input.totalInstallations),
			testId: 'total-installations'
		},
		{
			label: 'iCloud Docker',
			value: formatInstallCount(input.iCloudDockerTotal),
			testId: 'icloud-drive-docker-total-installations'
		},
		{
			label: 'Home Assistant – Bouncie',
			value: formatInstallCount(input.haBouncieTotal),
			testId: 'ha-bouncie-total-installations'
		}
	];
}

function formatChangeDescriptor(label: string, value: number | null): string | null {
	if (value === null || Number.isNaN(value)) {
		return null;
	}

	const normalised = Math.max(0, Math.round(value));
	return `${formatInstallCount(normalised)} new in the last ${label}`;
}

export function describeUpdate(input: OverviewSummaryInput): string {
	const segments: string[] = [
		'Tracking adoption for iCloud Docker and HA Bouncie integrations.',
		`${formatInstallCount(input.totalInstallations)} total installations across ${input.countryCount} ${
			input.countryCount === 1 ? 'country' : 'countries'
		}.`
	];

	const daily = formatChangeDescriptor('24 hours', input.installationsLast24h);
	const weekly = formatChangeDescriptor('7 days', input.installationsLast7d);

	if (daily && weekly) {
		segments.push(`${daily} and ${weekly}.`);
	} else if (daily) {
		segments.push(`${daily}.`);
	} else if (weekly) {
		segments.push(`${weekly}.`);
	}

	return segments.join(' ');
}

export function deriveLastSynced(isoString: string | null | undefined): LastSyncedMeta {
	if (!isoString) {
		return {
			relative: 'time unavailable',
			absolute: 'Last sync time not provided',
			isKnown: false
		};
	}

	const timestamp = new Date(isoString);

	if (Number.isNaN(timestamp.getTime())) {
		return {
			relative: 'time unavailable',
			absolute: 'Last sync time not provided',
			isKnown: false
		};
	}

	return {
		relative: getRelativeTime(timestamp),
		absolute: timestamp.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}),
		isKnown: true
	};
}
