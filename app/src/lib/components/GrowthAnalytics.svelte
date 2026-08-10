<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		type ChartConfiguration,
		BarController,
		BarElement,
		CategoryScale,
		LinearScale,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';
	import { getCountryName } from '$lib/utils/countries';

	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

	export let summary: {
		totalNew: number;
		totalReinstalls: number;
		newUserRate: number;
		period: string;
	} = { totalNew: 0, totalReinstalls: 0, newUserRate: 0, period: '30d' };

	export let timeline: Array<{
		date: string;
		newUsers: number;
		reinstalls: number;
		total: number;
	}> = [];

	export let topCountriesNewUsers: Array<{
		countryCode: string;
		count: number;
		percentage: number;
	}> = [];

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let showDataTable = false;
	let showCountriesDataTable = false;

	$: totalInstalls = summary.totalNew + summary.totalReinstalls;
	$: reinstallRate = totalInstalls > 0 ? 100 - summary.newUserRate : 0;
	$: topCountry = topCountriesNewUsers.length > 0 ? topCountriesNewUsers[0] : null;

	$: chartSummary = `Growth analytics for the last ${summary.period}. Total new installations: ${summary.totalNew.toLocaleString()}, reinstalls: ${summary.totalReinstalls.toLocaleString()}. New user rate: ${summary.newUserRate.toFixed(1)}%. Top acquisition country: ${topCountry ? `${getCountryName(topCountry.countryCode)} (${topCountry.percentage.toFixed(1)}%)` : 'N/A'}.`;

	let prefersReducedMotion = false;
	if (typeof window !== 'undefined') {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function createChart() {
		if (!canvas || timeline.length === 0) return;

		if (chart) {
			chart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const sortedTimeline = [...timeline].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);

		const config: ChartConfiguration = {
			type: 'bar',
			data: {
				labels: sortedTimeline.map((t) => {
					const date = new Date(t.date);
					return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
				}),
				datasets: [
					{
						label: 'New Users',
						data: sortedTimeline.map((t) => t.newUsers),
						backgroundColor: 'rgba(59, 130, 246, 0.8)',
						borderColor: 'rgba(59, 130, 246, 1)',
						borderWidth: 1
					},
					{
						label: 'Reinstalls',
						data: sortedTimeline.map((t) => t.reinstalls),
						backgroundColor: 'rgba(16, 185, 129, 0.8)',
						borderColor: 'rgba(16, 185, 129, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				animation: prefersReducedMotion
					? false
					: {
							duration: 750,
							easing: 'easeInOutQuart'
						},
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							font: { size: 12, family: "'Inter', sans-serif" },
							padding: 15,
							usePointStyle: true,
							pointStyle: 'circle'
						}
					},
					title: {
						display: false
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleFont: { size: 14, family: "'Inter', sans-serif" },
						bodyFont: { size: 13, family: "'Inter', sans-serif" },
						padding: 12,
						cornerRadius: 8,
						displayColors: true,
						callbacks: {
							footer: function (tooltipItems) {
								const total = tooltipItems.reduce((sum, item) => sum + (item.parsed.y || 0), 0);
								return `Total: ${total}`;
							}
						}
					}
				},
				scales: {
					x: {
						stacked: true,
						grid: { display: false },
						ticks: {
							font: { size: 11, family: "'Inter', sans-serif" },
							maxRotation: 45,
							minRotation: 45
						}
					},
					y: {
						stacked: true,
						beginAtZero: true,
						grid: { color: 'rgba(0, 0, 0, 0.05)' },
						ticks: {
							font: { size: 12, family: "'Inter', sans-serif" }
						}
					}
				}
			}
		};

		chart = new Chart(ctx, config);
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});

	$: if (canvas && timeline) {
		createChart();
	}

	function toggleDataTable() {
		showDataTable = !showDataTable;
	}

	function toggleCountriesDataTable() {
		showCountriesDataTable = !showCountriesDataTable;
	}

	function handleCanvasKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			if (event.key === ' ') {
				event.preventDefault();
			}
			toggleDataTable();
		}
	}
</script>

<div
	class="growth-analytics-container"
	data-testid="growth-analytics"
	role="region"
	aria-labelledby="growth-analytics-title"
>
	<div class="sr-only" id="growth-chart-description" aria-live="polite">
		{chartSummary}
	</div>

	<h3 id="growth-analytics-title" class="text-xl font-semibold text-gray-900 mb-6">
		Growth & Acquisition
	</h3>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="rounded-md border border-blue-200 bg-blue-50 p-4" data-testid="growth-total-new">
			<p class="text-xs font-medium uppercase tracking-wide text-blue-700">New Users</p>
			<p class="mt-2 text-3xl font-semibold text-blue-900">{summary.totalNew.toLocaleString()}</p>
			<p class="mt-1 text-xs text-blue-600">Last {summary.period}</p>
		</div>
		<div class="rounded-md border border-green-200 bg-green-50 p-4" data-testid="growth-reinstalls">
			<p class="text-xs font-medium uppercase tracking-wide text-green-700">Reinstalls</p>
			<p class="mt-2 text-3xl font-semibold text-green-900">
				{summary.totalReinstalls.toLocaleString()}
			</p>
			<p class="mt-1 text-xs text-green-600">{reinstallRate.toFixed(1)}% of total</p>
		</div>
		<div
			class="rounded-md border border-indigo-200 bg-indigo-50 p-4"
			data-testid="growth-new-user-rate"
		>
			<p class="text-xs font-medium uppercase tracking-wide text-indigo-700">New User Rate</p>
			<p class="mt-2 text-3xl font-semibold text-indigo-900">{summary.newUserRate.toFixed(1)}%</p>
			<p class="mt-1 text-xs text-indigo-600">Acquisition efficiency</p>
		</div>
		<div
			class="rounded-md border border-purple-200 bg-purple-50 p-4"
			data-testid="growth-top-country"
		>
			<p class="text-xs font-medium uppercase tracking-wide text-purple-700">
				Top Acquisition Country
			</p>
			<p class="mt-2 text-3xl font-semibold text-purple-900">
				{topCountry ? getCountryName(topCountry.countryCode) : 'N/A'}
			</p>
			<p class="mt-1 text-xs text-purple-600">
				{topCountry ? `${topCountry.percentage.toFixed(1)}% of new users` : 'No data'}
			</p>
		</div>
	</div>

	<!-- Timeline Chart -->
	{#if timeline.length > 0}
		<div class="mb-6">
			<h4 class="text-lg font-semibold text-gray-900 mb-3">
				Daily New vs Reinstall (Last 30 Days)
			</h4>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div
					role="img"
					aria-label="Stacked bar chart showing new users vs reinstalls over time"
					aria-describedby="growth-chart-description"
				>
					<canvas
						bind:this={canvas}
						tabindex="0"
						on:keydown={handleCanvasKeydown}
						aria-label="Press Enter to toggle data table view"
					></canvas>
				</div>

				<div class="mt-4 text-center">
					<button
						on:click={toggleDataTable}
						class="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
						aria-expanded={showDataTable}
						aria-controls="growth-data-table"
					>
						{showDataTable ? 'Hide' : 'Show'} data table
					</button>
				</div>

				{#if showDataTable}
					<div
						id="growth-data-table"
						class="mt-4 overflow-x-auto max-h-96"
						role="table"
						aria-label="Growth timeline data"
					>
						<table class="min-w-full border border-gray-300 bg-white">
							<thead class="bg-gray-100 sticky top-0">
								<tr>
									<th
										class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Date</th
									>
									<th
										class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
										>New Users</th
									>
									<th
										class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Reinstalls</th
									>
									<th
										class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Total</th
									>
								</tr>
							</thead>
							<tbody>
								{#each [...timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as day}
									<tr class="border-b border-gray-200 hover:bg-gray-50">
										<td class="px-4 py-2 text-sm text-gray-900">{day.date}</td>
										<td class="px-4 py-2 text-sm text-gray-900 text-right"
											>{day.newUsers.toLocaleString()}</td
										>
										<td class="px-4 py-2 text-sm text-gray-900 text-right"
											>{day.reinstalls.toLocaleString()}</td
										>
										<td class="px-4 py-2 text-sm text-gray-900 text-right"
											>{day.total.toLocaleString()}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Top Acquisition Countries -->
	{#if topCountriesNewUsers.length > 0}
		<div>
			<h4 class="text-lg font-semibold text-gray-900 mb-3">Top Acquisition Countries</h4>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div class="space-y-3" role="list" aria-label="Top countries by new user acquisitions">
					{#each topCountriesNewUsers as country, index}
						{@const maxPercentage = topCountriesNewUsers[0]?.percentage || 1}
						<div
							class="flex items-center justify-between"
							role="listitem"
							data-testid={`growth-country-${country.countryCode}`}
						>
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<span class="text-sm font-semibold text-gray-500 w-6">#{index + 1}</span>
								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between mb-1">
										<span class="text-sm font-medium text-gray-900 truncate"
											>{getCountryName(country.countryCode)}</span
										>
										<span class="text-sm text-gray-600 ml-2">{country.count.toLocaleString()}</span>
									</div>
									<div class="w-full bg-gray-200 rounded-full h-2">
										<div
											class="bg-indigo-500 h-2 rounded-full transition-all duration-300"
											style="width: {(country.percentage / maxPercentage) * 100}%"
											role="progressbar"
											aria-valuenow={country.percentage}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${getCountryName(country.countryCode)}: ${country.percentage.toFixed(1)}% of new users`}
										></div>
									</div>
								</div>
							</div>
							<span class="text-sm font-semibold text-indigo-600 ml-4"
								>{country.percentage.toFixed(1)}%</span
							>
						</div>
					{/each}
				</div>

				<div class="mt-4 text-center">
					<button
						on:click={toggleCountriesDataTable}
						class="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
						aria-expanded={showCountriesDataTable}
						aria-controls="growth-countries-data-table"
					>
						{showCountriesDataTable ? 'Hide' : 'Show'} data table
					</button>
				</div>

				{#if showCountriesDataTable}
					<div
						id="growth-countries-data-table"
						class="mt-4 overflow-x-auto"
						role="table"
						aria-label="Top acquisition countries data"
					>
						<table class="min-w-full border border-gray-300 bg-white">
							<thead class="bg-gray-100">
								<tr>
									<th
										class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Rank</th
									>
									<th
										class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Country</th
									>
									<th
										class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
										>New Users</th
									>
									<th
										class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
										>Share</th
									>
								</tr>
							</thead>
							<tbody>
								{#each topCountriesNewUsers as country, index}
									<tr class="border-b border-gray-200 hover:bg-gray-50">
										<td class="px-4 py-2 text-sm text-gray-600">#{index + 1}</td>
										<td class="px-4 py-2 text-sm text-gray-900"
											>{getCountryName(country.countryCode)} ({country.countryCode})</td
										>
										<td class="px-4 py-2 text-sm text-gray-900 text-right"
											>{country.count.toLocaleString()}</td
										>
										<td class="px-4 py-2 text-sm text-gray-900 text-right"
											>{country.percentage.toFixed(1)}%</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.growth-analytics-container {
		margin-bottom: 1.5rem;
	}

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
