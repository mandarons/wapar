<script lang="ts">
	import type { DataSnapshot } from '../historicalData';
	import { projectMilestone } from '../trendAnalysis';

	export let snapshots: DataSnapshot[];
	export let currentTotal: number;

	// Define milestones
	const milestones = [
		{ value: 1000, label: '1K', color: 'bg-blue-500', emoji: '🎉' },
		{ value: 5000, label: '5K', color: 'bg-purple-500', emoji: '🚀' },
		{ value: 10000, label: '10K', color: 'bg-green-500', emoji: '🌟' },
		{ value: 25000, label: '25K', color: 'bg-yellow-500', emoji: '🏆' },
		{ value: 50000, label: '50K', color: 'bg-orange-500', emoji: '💎' },
		{ value: 100000, label: '100K', color: 'bg-red-500', emoji: '👑' },
		{ value: 250000, label: '250K', color: 'bg-pink-500', emoji: '🌈' },
		{ value: 500000, label: '500K', color: 'bg-indigo-500', emoji: '🔥' },
		{ value: 1000000, label: '1M', color: 'bg-purple-700', emoji: '🎯' }
	];

	// Find current and next milestone
	$: currentMilestone = milestones.filter((m) => currentTotal >= m.value).pop();
	$: nextMilestone = milestones.find((m) => m.value > currentTotal);
	$: progress = nextMilestone
		? ((currentTotal - (currentMilestone?.value || 0)) /
				(nextMilestone.value - (currentMilestone?.value || 0))) *
			100
		: 100;

	// Project when next milestone will be reached
	$: projection =
		nextMilestone && snapshots.length > 2 ? projectMilestone(snapshots, nextMilestone.value) : null;

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDaysToMilestone(days: number): string {
		if (days < 1) return 'Today';
		if (days === 1) return '1 day';
		if (days < 30) return `${days} days`;
		const months = Math.floor(days / 30);
		if (months === 1) return '1 month';
		if (months < 12) return `${months} months`;
		const years = Math.floor(days / 365);
		return years === 1 ? '1 year' : `${years} years`;
	}
</script>

<div class="milestone-tracker" data-testid="milestone-tracker">
	<h3 class="text-lg font-semibold text-gray-800 mb-6">🎯 Milestone Progress</h3>

	<!-- Milestone Timeline -->
	<div class="milestone-timeline mb-8">
		{#each milestones as milestone}
			{@const isReached = currentTotal >= milestone.value}
			{@const isCurrent = milestone === nextMilestone}
			<div class="milestone-item {isReached ? 'reached' : ''} {isCurrent ? 'current' : ''}">
				<div class="milestone-marker {milestone.color} {isReached ? '' : 'opacity-30'}">
					<span class="milestone-emoji">{milestone.emoji}</span>
				</div>
				<div class="milestone-label">
					<div class="text-sm font-medium {isReached ? 'text-gray-900' : 'text-gray-500'}">
						{milestone.label}
					</div>
					{#if isReached}
						<div class="text-xs text-green-600">✓ Reached</div>
					{:else if isCurrent}
						<div class="text-xs text-blue-600">Next</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Current Progress -->
	{#if nextMilestone}
		<div class="progress-section">
			<div class="flex justify-between items-center mb-2">
				<div class="text-sm font-medium text-gray-700">
					Progress to {nextMilestone.label}
				</div>
				<div class="text-sm font-semibold text-blue-600">{Math.round(progress)}%</div>
			</div>

			<div class="progress-bar-container">
				<div class="progress-bar {nextMilestone.color}" style="width: {progress}%"></div>
			</div>

			<div class="flex justify-between items-center mt-2 text-xs text-gray-600">
				<div>{currentTotal.toLocaleString()} installs</div>
				<div>{nextMilestone.value.toLocaleString()} goal</div>
			</div>

			{#if projection}
				<div class="projection-card mt-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-2xl">{nextMilestone.emoji}</span>
						<div>
							<div class="text-sm font-semibold text-gray-800">
								Projected: {formatDate(projection.projectedDate)}
							</div>
							<div class="text-xs text-gray-600">
								{formatDaysToMilestone(projection.daysToMilestone)}
								{#if projection.confidence === 'high'}
									<span class="confidence-badge bg-green-100 text-green-800">High Confidence</span>
								{:else if projection.confidence === 'medium'}
									<span class="confidence-badge bg-yellow-100 text-yellow-800"
										>Medium Confidence</span
									>
								{:else}
									<span class="confidence-badge bg-gray-100 text-gray-800">Low Confidence</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="celebration-card">
			<div class="text-center">
				<div class="text-4xl mb-2">🎊 🏆 🎊</div>
				<div class="text-xl font-bold text-gray-800 mb-1">All Milestones Reached!</div>
				<div class="text-sm text-gray-600">
					{currentTotal.toLocaleString()} installations and counting
				</div>
			</div>
		</div>
	{/if}

	<!-- Recently Achieved -->
	{#if currentMilestone}
		<div class="achievement-badge mt-6">
			<div class="flex items-center gap-3">
				<div class="achievement-icon {currentMilestone.color}">
					<span class="text-2xl">{currentMilestone.emoji}</span>
				</div>
				<div>
					<div class="text-sm font-semibold text-gray-800">Latest Achievement</div>
					<div class="text-xs text-gray-600">{currentMilestone.label} Installations</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.milestone-tracker {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.milestone-timeline {
		display: flex;
		overflow-x: auto;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.milestone-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 80px;
		position: relative;
	}

	.milestone-item.reached::after {
		content: '';
		position: absolute;
		top: 20px;
		right: -0.25rem;
		width: calc(100% + 0.5rem);
		height: 3px;
		background: #e5e7eb;
		z-index: -1;
	}

	.milestone-item:last-child::after {
		display: none;
	}

	.milestone-marker {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.5rem;
		transition: all 0.3s ease;
		border: 3px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.milestone-item.current .milestone-marker {
		animation: pulse 2s ease-in-out infinite;
		box-shadow:
			0 0 0 4px rgba(59, 130, 246, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.milestone-emoji {
		font-size: 1.5rem;
	}

	.milestone-label {
		text-align: center;
	}

	.progress-bar-container {
		width: 100%;
		height: 12px;
		background: #e5e7eb;
		border-radius: 9999px;
		overflow: hidden;
		position: relative;
	}

	.progress-bar {
		height: 100%;
		border-radius: 9999px;
		transition:
			width 0.5s ease,
			background-color 0.3s ease;
		background: #22c55e;
	}

	.projection-card {
		background: #f9fafb;
		border: 1px solid #bae6fd;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.celebration-card {
		background: #f9fafb;
		border: 2px solid #fbbf24;
		border-radius: 0.5rem;
		padding: 2rem;
		animation: celebrate 1s ease-in-out;
	}

	.achievement-badge {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #d1d5db;
	}

	.achievement-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.confidence-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.625rem;
		font-weight: 600;
		margin-left: 0.5rem;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	@keyframes celebrate {
		0%,
		100% {
			transform: scale(1);
		}
		25%,
		75% {
			transform: scale(1.05) rotate(1deg);
		}
		50% {
			transform: scale(1.05) rotate(-1deg);
		}
	}
</style>
