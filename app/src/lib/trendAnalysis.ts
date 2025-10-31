/**
 * Trend Analysis Module
 *
 * Provides growth rate calculations, trend projections, and velocity metrics
 * for historical analytics data.
 */

import type { DataSnapshot } from './historicalData';

/**
 * Growth rate calculation result
 */
export interface GrowthRate {
	value: number; // Percentage change
	period: string; // Time period (e.g., "24h", "7d", "30d")
	absolute: number; // Absolute change in installations
	isPositive: boolean;
}

/**
 * Growth velocity metrics
 */
export interface GrowthVelocity {
	currentRate: number; // Current growth rate (installations per day)
	averageRate: number; // Historical average growth rate
	acceleration: number; // Change in growth rate (positive = accelerating)
	trend: 'accelerating' | 'decelerating' | 'steady';
}

/**
 * Trend projection
 */
export interface TrendProjection {
	projectedDate: string; // When milestone will be reached
	daysToMilestone: number;
	confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate growth rate between two snapshots
 */
export function calculateGrowthRate(
	currentSnapshot: DataSnapshot,
	previousSnapshot: DataSnapshot,
	periodLabel: string
): GrowthRate {
	const currentValue = currentSnapshot.totalInstallations;
	const previousValue = previousSnapshot.totalInstallations;

	const absolute = currentValue - previousValue;
	const percentageChange = previousValue > 0 ? (absolute / previousValue) * 100 : 0;

	return {
		value: percentageChange,
		period: periodLabel,
		absolute,
		isPositive: absolute >= 0
	};
}

/**
 * Calculate daily growth rate
 */
export function calculateDailyGrowthRate(snapshots: DataSnapshot[]): GrowthRate | null {
	if (snapshots.length < 2) {
		return null;
	}

	const latest = snapshots[snapshots.length - 1];
	const oneDayAgo = findSnapshotNearDate(
		snapshots,
		new Date(new Date(latest.timestamp).getTime() - 24 * 60 * 60 * 1000)
	);

	if (!oneDayAgo) {
		return null;
	}

	return calculateGrowthRate(latest, oneDayAgo, '24h');
}

/**
 * Calculate weekly growth rate
 */
export function calculateWeeklyGrowthRate(snapshots: DataSnapshot[]): GrowthRate | null {
	if (snapshots.length < 2) {
		return null;
	}

	const latest = snapshots[snapshots.length - 1];
	const oneWeekAgo = findSnapshotNearDate(
		snapshots,
		new Date(new Date(latest.timestamp).getTime() - 7 * 24 * 60 * 60 * 1000)
	);

	if (!oneWeekAgo) {
		return null;
	}

	return calculateGrowthRate(latest, oneWeekAgo, '7d');
}

/**
 * Calculate monthly growth rate
 */
export function calculateMonthlyGrowthRate(snapshots: DataSnapshot[]): GrowthRate | null {
	if (snapshots.length < 2) {
		return null;
	}

	const latest = snapshots[snapshots.length - 1];
	const latestDate = new Date(latest.timestamp);

	// Calculate one month ago
	const oneMonthAgo = new Date(latestDate);
	oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

	const monthAgoSnapshot = findSnapshotNearDate(snapshots, oneMonthAgo);

	if (!monthAgoSnapshot) {
		return null;
	}

	return calculateGrowthRate(latest, monthAgoSnapshot, '30d');
}

/**
 * Find snapshot closest to a target date
 */
function findSnapshotNearDate(snapshots: DataSnapshot[], targetDate: Date): DataSnapshot | null {
	if (snapshots.length === 0) {
		return null;
	}

	let closest: DataSnapshot | null = null;
	let minDiff = Infinity;

	for (const snapshot of snapshots) {
		const snapshotDate = new Date(snapshot.timestamp);
		const diff = Math.abs(snapshotDate.getTime() - targetDate.getTime());

		if (diff < minDiff) {
			minDiff = diff;
			closest = snapshot;
		}
	}

	return closest;
}

/**
 * Calculate growth velocity and acceleration
 */
export function calculateGrowthVelocity(snapshots: DataSnapshot[]): GrowthVelocity | null {
	if (snapshots.length < 3) {
		return null;
	}

	// Calculate current rate (last 7 days)
	const latest = snapshots[snapshots.length - 1];
	const oneWeekAgo = findSnapshotNearDate(
		snapshots,
		new Date(new Date(latest.timestamp).getTime() - 7 * 24 * 60 * 60 * 1000)
	);

	if (!oneWeekAgo) {
		return null;
	}

	const daysDiff =
		(new Date(latest.timestamp).getTime() - new Date(oneWeekAgo.timestamp).getTime()) /
		(1000 * 60 * 60 * 24);
	const currentRate =
		daysDiff > 0 ? (latest.totalInstallations - oneWeekAgo.totalInstallations) / daysDiff : 0;

	// Calculate historical average rate
	const oldest = snapshots[0];
	const totalDays =
		(new Date(latest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) /
		(1000 * 60 * 60 * 24);
	const averageRate =
		totalDays > 0 ? (latest.totalInstallations - oldest.totalInstallations) / totalDays : 0;

	// Calculate acceleration (change in growth rate)
	const acceleration = currentRate - averageRate;
	const accelerationThreshold = averageRate * 0.1; // 10% threshold

	let trend: 'accelerating' | 'decelerating' | 'steady';
	if (acceleration > accelerationThreshold) {
		trend = 'accelerating';
	} else if (acceleration < -accelerationThreshold) {
		trend = 'decelerating';
	} else {
		trend = 'steady';
	}

	return {
		currentRate,
		averageRate,
		acceleration,
		trend
	};
}

/**
 * Project when a milestone will be reached
 */
export function projectMilestone(
	snapshots: DataSnapshot[],
	targetInstallations: number
): TrendProjection | null {
	if (snapshots.length < 2) {
		return null;
	}

	const latest = snapshots[snapshots.length - 1];
	const currentInstallations = latest.totalInstallations;

	// Already reached
	if (currentInstallations >= targetInstallations) {
		return null;
	}

	// Calculate recent growth rate (last 30 days)
	const thirtyDaysAgo = findSnapshotNearDate(
		snapshots,
		new Date(new Date(latest.timestamp).getTime() - 30 * 24 * 60 * 60 * 1000)
	);

	if (!thirtyDaysAgo) {
		return null;
	}

	const daysDiff =
		(new Date(latest.timestamp).getTime() - new Date(thirtyDaysAgo.timestamp).getTime()) /
		(1000 * 60 * 60 * 24);
	const dailyGrowthRate =
		daysDiff > 0 ? (currentInstallations - thirtyDaysAgo.totalInstallations) / daysDiff : 0;

	// Avoid division by zero
	if (dailyGrowthRate <= 0) {
		return null;
	}

	// Calculate days to milestone
	const installationsNeeded = targetInstallations - currentInstallations;
	const daysToMilestone = Math.ceil(installationsNeeded / dailyGrowthRate);

	// Calculate confidence based on data availability and consistency
	const dataPoints = snapshots.length;
	const confidence: 'high' | 'medium' | 'low' =
		dataPoints > 30 ? 'high' : dataPoints > 14 ? 'medium' : 'low';

	// Project date
	const projectedDate = new Date(
		new Date(latest.timestamp).getTime() + daysToMilestone * 24 * 60 * 60 * 1000
	);

	return {
		projectedDate: projectedDate.toISOString(),
		daysToMilestone,
		confidence
	};
}

/**
 * Calculate all growth metrics at once
 */
export function calculateAllGrowthMetrics(snapshots: DataSnapshot[]): {
	daily: GrowthRate | null;
	weekly: GrowthRate | null;
	monthly: GrowthRate | null;
	velocity: GrowthVelocity | null;
} {
	return {
		daily: calculateDailyGrowthRate(snapshots),
		weekly: calculateWeeklyGrowthRate(snapshots),
		monthly: calculateMonthlyGrowthRate(snapshots),
		velocity: calculateGrowthVelocity(snapshots)
	};
}
