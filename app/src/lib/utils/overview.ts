import { getRelativeTime } from './refresh';

const numberFormatter = new Intl.NumberFormat(undefined);

export interface OverviewMetric {
	label: string;
	value: string;
	testId: string;
	subtitle?: string;
}

export interface OverviewMetricInput {
	totalInstallations: number;
	activeInstallations: number;
	staleInstallations: number;
	iCloudDockerTotal: number;
	haBouncieTotal: number;
	activityThresholdDays: number;
	createdAt: string | null;
}

export interface OverviewSummaryInput {
	totalInstallations: number;
	activeInstallations: number;
	countryCount: number;
	installationsLast24h: number | null;
	installationsLast7d: number | null;
	createdAt: string | null;
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
	const metrics = [
		{
			label: 'Active installations',
			value: formatInstallCount(input.activeInstallations),
			testId: 'active-installations',
			subtitle: `Heartbeat within last ${input.activityThresholdDays} days`
		},
		{
			label: 'Total installations',
			value: formatInstallCount(input.totalInstallations),
			testId: 'total-installations',
			subtitle: input.createdAt ? `Since ${new Date(input.createdAt).toLocaleDateString()}` : 'All time'
		},
		{
			label: 'Stale installations',
			value: formatInstallCount(input.staleInstallations),
			testId: 'stale-installations',
			subtitle: `No heartbeat in ${input.activityThresholdDays}+ days`
		}
	];
	
	return metrics;
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
		'Tracking adoption for iCloud Docker and HA Bouncie integrations.'
	];

	const createdDate = input.createdAt ? new Date(input.createdAt).toLocaleDateString() : 'the beginning';
	segments.push(
		`${formatInstallCount(input.activeInstallations)} active installations (${formatInstallCount(input.totalInstallations)} total since ${createdDate}) across ${input.countryCount} ${
			input.countryCount === 1 ? 'country' : 'countries'
		}.`
	);

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
