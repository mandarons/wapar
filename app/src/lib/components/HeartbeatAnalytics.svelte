<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Chart,
		DoughnutController,
		LineController,
		ArcElement,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';

	// Register Chart.js components
	Chart.register(
		DoughnutController,
		LineController,
		ArcElement,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend,
		Filler
	);

	export let activeUsers: {
		daily: number;
		weekly: number;
		monthly: number;
		dau_mau_ratio: number;
	} = { daily: 0, weekly: 0, monthly: 0, dau_mau_ratio: 0 };

	export let engagementLevels: {
		highlyActive: { count: number; description: string };
		active: { count: number; description: string };
		occasional: { count: number; description: string };
		dormant: { count: number; description: string };
	} = {
		highlyActive: { count: 0, description: '>7 heartbeats/week' },
		active: { count: 0, description: '1-7 heartbeats/week' },
		occasional: { count: 0, description: 'Active in last 30d but not last 7d' },
		dormant: { count: 0, description: 'No heartbeat in 30 days' }
	};

	export let timeline: Array<{
		date: string;
		activeUsers: number;
		totalHeartbeats: number;
	}> = [];

	export let churnRisk: {
		usersInactive7Days: number;
		usersInactive14Days: number;
		usersInactive30Days: number;
	} = { usersInactive7Days: 0, usersInactive14Days: 0, usersInactive30Days: 0 };

	export let healthMetrics: {
		avgHeartbeatsPerUser: number;
		avgTimeBetweenHeartbeats: string;
		heartbeatFailureRate: number;
	} = { avgHeartbeatsPerUser: 0, avgTimeBetweenHeartbeats: '0 hours', heartbeatFailureRate: 0 };

	export let title: string = 'Active Usage Analytics';

	let engagementChart: Chart | null = null;
	let timelineChart: Chart | null = null;
	let engagementCanvas: HTMLCanvasElement;
	let timelineCanvas: HTMLCanvasElement;

	// Calculate engagement quality based on DAU/MAU ratio
	$: engagementQuality =
		activeUsers.dau_mau_ratio > 0.2
			? 'Excellent'
			: activeUsers.dau_mau_ratio > 0.1
				? 'Good'
				: 'Needs Improvement';

	// Determine quality color
	$: engagementQualityColor =
		activeUsers.dau_mau_ratio > 0.2
			? 'text-success-600'
			: activeUsers.dau_mau_ratio > 0.1
				? 'text-primary-600'
				: 'text-warning-600';

	onMount(() => {
		// Create engagement distribution chart
		if (engagementCanvas) {
			const ctx = engagementCanvas.getContext('2d');
			if (ctx) {
				engagementChart = new Chart(ctx, {
					type: 'doughnut',
					data: {
						labels: ['Highly Active', 'Active', 'Occasional', 'Dormant'],
						datasets: [
							{
								data: [
									engagementLevels.highlyActive.count,
									engagementLevels.active.count,
									engagementLevels.occasional.count,
									engagementLevels.dormant.count
								],
								backgroundColor: [
									'rgb(34, 197, 94)', // green-500
									'rgb(59, 130, 246)', // blue-500
									'rgb(234, 179, 8)', // yellow-500
									'rgb(239, 68, 68)' // red-500
								],
								borderWidth: 0
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: true,
						plugins: {
							legend: {
								position: 'bottom',
								labels: {
									color: 'rgb(148, 163, 184)', // slate-400
									padding: 12,
									font: { size: 12 }
								}
							},
							tooltip: {
								backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900 with opacity
								titleColor: 'rgb(248, 250, 252)', // slate-50
								bodyColor: 'rgb(226, 232, 240)', // slate-200
								borderColor: 'rgb(51, 65, 85)', // slate-700
								borderWidth: 1,
								padding: 12,
								displayColors: true
							}
						}
					}
				});
			}
		}

		// Create timeline chart
		if (timelineCanvas && timeline.length > 0) {
			const ctx = timelineCanvas.getContext('2d');
			if (ctx) {
				// Sort timeline by date (oldest first for proper display)
				const sortedTimeline = [...timeline].sort(
					(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
				);

				timelineChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: sortedTimeline.map((t) => t.date),
						datasets: [
							{
								label: 'Active Users',
								data: sortedTimeline.map((t) => t.activeUsers),
								borderColor: 'rgb(59, 130, 246)', // blue-500
								backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
								fill: true,
								tension: 0.4,
								pointRadius: 3,
								pointHoverRadius: 5
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: true,
						plugins: {
							legend: {
								display: false
							},
							tooltip: {
								backgroundColor: 'rgba(15, 23, 42, 0.95)',
								titleColor: 'rgb(248, 250, 252)',
								bodyColor: 'rgb(226, 232, 240)',
								borderColor: 'rgb(51, 65, 85)',
								borderWidth: 1,
								padding: 12
							}
						},
						scales: {
							y: {
								beginAtZero: true,
								grid: {
									color: 'rgba(148, 163, 184, 0.1)' // slate-400 with low opacity
								},
								ticks: {
									color: 'rgb(148, 163, 184)' // slate-400
								}
							},
							x: {
								grid: {
									color: 'rgba(148, 163, 184, 0.1)'
								},
								ticks: {
									color: 'rgb(148, 163, 184)',
									maxRotation: 45,
									minRotation: 45
								}
							}
						}
					}
				});
			}
		}

		return () => {
			if (engagementChart) {
				engagementChart.destroy();
			}
			if (timelineChart) {
				timelineChart.destroy();
			}
		};
	});

	// Format large numbers
	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	}

	// Get engagement level color
	function getEngagementColor(level: string): string {
		switch (level) {
			case 'highlyActive':
				return 'text-success-600';
			case 'active':
				return 'text-primary-600';
			case 'occasional':
				return 'text-warning-600';
			case 'dormant':
				return 'text-error-600';
			default:
				return '';
		}
	}

	// Export data
	function exportData() {
		const data = {
			activeUsers,
			engagementLevels,
			timeline,
			healthMetrics,
			churnRisk,
			exportedAt: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `heartbeat-analytics-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<div
	class="heartbeat-analytics-container card p-6"
	data-testid="heartbeat-analytics"
	role="region"
	aria-labelledby="heartbeat-analytics-title"
>
	<div class="header flex justify-between items-center mb-6">
		<h3 id="heartbeat-analytics-title" class="h3">{title}</h3>
		<button
			class="btn btn-sm variant-ghost-surface"
			on:click={exportData}
			aria-label="Export heartbeat analytics data"
			title="Export heartbeat analytics data as JSON"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			<span class="ml-2">Export</span>
		</button>
	</div>

	<!-- Active Users Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Daily Active (DAU)</div>
			<div class="text-3xl font-bold">{formatNumber(activeUsers.daily)}</div>
		</div>

		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Weekly Active (WAU)</div>
			<div class="text-3xl font-bold">{formatNumber(activeUsers.weekly)}</div>
		</div>

		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Monthly Active (MAU)</div>
			<div class="text-3xl font-bold">{formatNumber(activeUsers.monthly)}</div>
		</div>

		<div class="card variant-filled-primary p-4">
			<div class="text-sm opacity-75 mb-1">DAU/MAU Ratio</div>
			<div class="text-3xl font-bold">{(activeUsers.dau_mau_ratio * 100).toFixed(1)}%</div>
			<div class="text-xs mt-1 {engagementQualityColor}">{engagementQuality}</div>
		</div>
	</div>

	<!-- Engagement Breakdown and Timeline -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
		<!-- Engagement Distribution Chart -->
		<div>
			<h4 class="h4 mb-3">Engagement Distribution</h4>
			<div class="card p-4">
				<canvas bind:this={engagementCanvas} style="max-height: 300px;"></canvas>
			</div>
		</div>

		<!-- User Segments -->
		<div>
			<h4 class="h4 mb-3">User Segments</h4>
			<div class="space-y-3">
				{#each Object.entries(engagementLevels) as [level, data]}
					<div class="card variant-filled-surface p-3 flex justify-between items-center">
						<div>
							<div class="font-semibold {getEngagementColor(level)}">
								{formatNumber(data.count)} users
							</div>
							<div class="text-sm opacity-75">{data.description}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Activity Timeline -->
	{#if timeline.length > 0}
		<div class="mb-6">
			<h4 class="h4 mb-3">Daily Active Users Trend (Last 30 Days)</h4>
			<div class="card p-4">
				<canvas bind:this={timelineCanvas} style="max-height: 250px;"></canvas>
			</div>
		</div>
	{/if}

	<!-- Health Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Avg Heartbeats/User</div>
			<div class="text-2xl font-bold">{healthMetrics.avgHeartbeatsPerUser.toFixed(1)}</div>
		</div>

		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Avg Time Between Heartbeats</div>
			<div class="text-2xl font-bold">{healthMetrics.avgTimeBetweenHeartbeats}</div>
		</div>

		<div class="card variant-filled-surface p-4">
			<div class="text-sm opacity-75 mb-1">Failure Rate</div>
			<div class="text-2xl font-bold">{(healthMetrics.heartbeatFailureRate * 100).toFixed(1)}%</div>
		</div>
	</div>

	<!-- Churn Risk Alerts -->
	{#if churnRisk.usersInactive7Days > 0}
		<div class="alert variant-filled-warning">
			<div class="alert-message">
				<h4 class="h4">⚠️ Churn Risk Alert</h4>
				<ul class="list-disc list-inside mt-2">
					<li>{churnRisk.usersInactive7Days} users inactive for 7+ days</li>
					<li>{churnRisk.usersInactive14Days} users inactive for 14+ days</li>
					<li>{churnRisk.usersInactive30Days} users inactive for 30+ days</li>
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.heartbeat-analytics-container {
		margin-bottom: 2rem;
	}
</style>
