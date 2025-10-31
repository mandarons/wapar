<script lang="ts">
	import type { GrowthRate, GrowthVelocity } from '../trendAnalysis';

	export let daily: GrowthRate | null;
	export let weekly: GrowthRate | null;
	export let monthly: GrowthRate | null;
	export let velocity: GrowthVelocity | null;

	function formatGrowthRate(rate: GrowthRate | null): string {
		if (!rate) return 'N/A';
		const sign = rate.isPositive ? '+' : '';
		return `${sign}${rate.value.toFixed(1)}%`;
	}

	function formatAbsolute(rate: GrowthRate | null): string {
		if (!rate) return '';
		const sign = rate.isPositive ? '+' : '';
		return `${sign}${rate.absolute.toLocaleString()}`;
	}

	function getGrowthColor(rate: GrowthRate | null): string {
		if (!rate) return 'text-gray-500';
		return rate.isPositive ? 'text-green-600' : 'text-red-600';
	}

	function getGrowthIcon(rate: GrowthRate | null): string {
		if (!rate) return '➖';
		return rate.isPositive ? '📈' : '📉';
	}

	function getGrowthIconLabel(rate: GrowthRate | null): string {
		if (!rate) return 'No change';
		return rate.isPositive ? 'Increasing trend' : 'Decreasing trend';
	}

	function getTrendIcon(velocity: GrowthVelocity | null): string {
		if (!velocity) return '➖';
		if (velocity.trend === 'accelerating') return '🚀';
		if (velocity.trend === 'decelerating') return '🐌';
		return '➡️';
	}

	function getTrendIconLabel(velocity: GrowthVelocity | null): string {
		if (!velocity) return 'Unknown trend';
		if (velocity.trend === 'accelerating') return 'Accelerating';
		if (velocity.trend === 'decelerating') return 'Decelerating';
		return 'Steady';
	}

	function getTrendLabel(velocity: GrowthVelocity | null): string {
		if (!velocity) return 'Unknown';
		if (velocity.trend === 'accelerating') return 'Accelerating';
		if (velocity.trend === 'decelerating') return 'Decelerating';
		return 'Steady';
	}

	function getTrendColor(velocity: GrowthVelocity | null): string {
		if (!velocity) return 'text-gray-500';
		if (velocity.trend === 'accelerating') return 'text-green-600';
		if (velocity.trend === 'decelerating') return 'text-orange-600';
		return 'text-blue-600';
	}
</script>

<div class="growth-metrics" data-testid="growth-metrics">
	<h3 class="text-lg font-semibold text-gray-800 mb-6">
		<span aria-hidden="true">📊</span>
		<span class="sr-only">Chart icon:</span>
		Growth Analysis
	</h3>

	<div class="metrics-grid">
		<!-- Daily Growth -->
		<div class="metric-card" data-testid="daily-growth-card">
			<div class="metric-header">
				<span class="metric-icon" aria-hidden="true">{getGrowthIcon(daily)}</span>
				<span class="sr-only">{getGrowthIconLabel(daily)}:</span>
				<span class="metric-label">Daily Growth</span>
			</div>
			<div class="metric-value {getGrowthColor(daily)}">
				{formatGrowthRate(daily)}
			</div>
			{#if daily}
				<div class="metric-detail">{formatAbsolute(daily)} installs</div>
			{/if}
		</div>

		<!-- Weekly Growth -->
		<div class="metric-card" data-testid="weekly-growth-card">
			<div class="metric-header">
				<span class="metric-icon" aria-hidden="true">{getGrowthIcon(weekly)}</span>
				<span class="sr-only">{getGrowthIconLabel(weekly)}:</span>
				<span class="metric-label">Weekly Growth</span>
			</div>
			<div class="metric-value {getGrowthColor(weekly)}">
				{formatGrowthRate(weekly)}
			</div>
			{#if weekly}
				<div class="metric-detail">{formatAbsolute(weekly)} installs</div>
			{/if}
		</div>

		<!-- Monthly Growth -->
		<div class="metric-card" data-testid="monthly-growth-card">
			<div class="metric-header">
				<span class="metric-icon" aria-hidden="true">{getGrowthIcon(monthly)}</span>
				<span class="sr-only">{getGrowthIconLabel(monthly)}:</span>
				<span class="metric-label">Monthly Growth</span>
			</div>
			<div class="metric-value {getGrowthColor(monthly)}">
				{formatGrowthRate(monthly)}
			</div>
			{#if monthly}
				<div class="metric-detail">{formatAbsolute(monthly)} installs</div>
			{/if}
		</div>

		<!-- Growth Velocity -->
		<div class="metric-card velocity-card" data-testid="velocity-card">
			<div class="metric-header">
				<span class="metric-icon" aria-hidden="true">{getTrendIcon(velocity)}</span>
				<span class="sr-only">{getTrendIconLabel(velocity)}:</span>
				<span class="metric-label">Growth Trend</span>
			</div>
			<div class="metric-value {getTrendColor(velocity)}">
				{getTrendLabel(velocity)}
			</div>
			{#if velocity}
				<div class="metric-detail">
					Current: {velocity.currentRate.toFixed(1)}/day
				</div>
				<div class="metric-detail text-xs">
					Avg: {velocity.averageRate.toFixed(1)}/day
				</div>
			{/if}
		</div>
	</div>

	<!-- Velocity Details -->
	{#if velocity}
		<div class="velocity-details mt-6">
			<div class="velocity-bar-container">
				<div class="velocity-label">
					<span class="text-sm font-medium text-gray-700">Current Rate</span>
					<span class="text-sm font-semibold text-blue-600"
						>{velocity.currentRate.toFixed(1)}/day</span
					>
				</div>
				<div class="velocity-bar-track">
					<div
						class="velocity-bar velocity-current"
						style="width: {Math.min(
							(velocity.currentRate / Math.max(velocity.averageRate * 2, 1)) * 100,
							100
						)}%"
					></div>
				</div>
			</div>

			<div class="velocity-bar-container mt-3">
				<div class="velocity-label">
					<span class="text-sm font-medium text-gray-700">Average Rate</span>
					<span class="text-sm font-semibold text-gray-600"
						>{velocity.averageRate.toFixed(1)}/day</span
					>
				</div>
				<div class="velocity-bar-track">
					<div
						class="velocity-bar velocity-average"
						style="width: {Math.min(
							(velocity.averageRate / Math.max(velocity.averageRate * 2, 1)) * 100,
							100
						)}%"
					></div>
				</div>
			</div>

			{#if velocity.acceleration !== 0}
				<div class="acceleration-badge mt-4">
					<span class="text-sm font-medium">
						{velocity.acceleration > 0 ? 'Acceleration' : 'Deceleration'}:
					</span>
					<span
						class="text-sm font-semibold {velocity.acceleration > 0
							? 'text-green-600'
							: 'text-orange-600'}"
					>
						{Math.abs(velocity.acceleration).toFixed(2)} installs/day
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.growth-metrics {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.metric-card {
		background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.25rem;
		transition: all 0.2s ease;
	}

	.metric-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.velocity-card {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border-color: #bfdbfe;
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.metric-icon {
		font-size: 1.25rem;
	}

	.metric-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	.metric-value {
		font-size: 1.875rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.metric-detail {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.velocity-details {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.velocity-bar-container {
		margin-bottom: 0.5rem;
	}

	.velocity-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.velocity-bar-track {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 9999px;
		overflow: hidden;
	}

	.velocity-bar {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.5s ease;
	}

	.velocity-current {
		background: linear-gradient(to right, #3b82f6, #60a5fa);
	}

	.velocity-average {
		background: linear-gradient(to right, #6b7280, #9ca3af);
	}

	.acceleration-badge {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 0.75rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	/* Screen reader only class */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
