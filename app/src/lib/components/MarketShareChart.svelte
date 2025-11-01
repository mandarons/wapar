<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		type ChartConfiguration,
		DoughnutController,
		PieController,
		BarController,
		ArcElement,
		BarElement,
		CategoryScale,
		LinearScale,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';
	import ChartDataLabels from 'chartjs-plugin-datalabels';

	// Register Chart.js components
	Chart.register(
		DoughnutController,
		PieController,
		BarController,
		ArcElement,
		BarElement,
		CategoryScale,
		LinearScale,
		Title,
		Tooltip,
		Legend,
		ChartDataLabels
	);

	export let iCloudDockerTotal: number;
	export let haBouncieTotal: number;
	export let chartType: 'pie' | 'doughnut' | 'bar' = 'pie';
	export let showLegend = true;
	export let title = 'Market Share Distribution';

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let showDataTable = false;

	$: totalInstallations = iCloudDockerTotal + haBouncieTotal;
	$: iCloudPercentage = totalInstallations > 0 ? (iCloudDockerTotal / totalInstallations) * 100 : 0;
	$: bounciePercentage = totalInstallations > 0 ? (haBouncieTotal / totalInstallations) * 100 : 0;

	// Accessibility: Generate textual summary
	$: chartSummary = `Market share chart showing ${chartType} visualization.
iCloud Docker has ${iCloudDockerTotal.toLocaleString()} installations (${iCloudPercentage.toFixed(1)}%),
and Home Assistant Bouncie has ${haBouncieTotal.toLocaleString()} installations (${bounciePercentage.toFixed(1)}%).
Total installations: ${totalInstallations.toLocaleString()}.`;

	// Check for reduced motion preference
	let prefersReducedMotion = false;
	if (typeof window !== 'undefined') {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function createChart() {
		if (!canvas) return;

		// Destroy existing chart
		if (chart) {
			chart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const config: ChartConfiguration = {
			type: chartType,
			data: {
				labels: ['iCloud Docker', 'Home Assistant - Bouncie'],
				datasets: [
					{
						label: 'Installations',
						data: [iCloudDockerTotal, haBouncieTotal],
						backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)'],
						borderColor: ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)'],
						borderWidth: 2
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
						display: showLegend,
						position: 'bottom',
						labels: {
							font: {
								size: 12,
								family: "'Inter', sans-serif"
							},
							padding: 15,
							usePointStyle: true,
							pointStyle: 'circle'
						}
					},
					title: {
						display: !!title,
						text: title,
						font: {
							size: 16,
							weight: 'bold',
							family: "'Inter', sans-serif"
						},
						padding: {
							top: 10,
							bottom: 20
						}
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleFont: {
							size: 14,
							family: "'Inter', sans-serif"
						},
						bodyFont: {
							size: 13,
							family: "'Inter', sans-serif"
						},
						padding: 12,
						cornerRadius: 8,
						displayColors: true,
						callbacks: {
							label: function (context) {
								const label = context.label || '';
								const value = context.parsed || 0;
								const percentage = ((value / totalInstallations) * 100).toFixed(1);
								return `${label}: ${value.toLocaleString()} (${percentage}%)`;
							}
						}
					},
					datalabels: {
						color: '#fff',
						font: {
							size: 14,
							weight: 'bold',
							family: "'Inter', sans-serif"
						},
						formatter: (value: number) => {
							const percentage = ((value / totalInstallations) * 100).toFixed(1);
							return `${percentage}%`;
						},
						display: chartType !== 'bar'
					}
				},
				...(chartType === 'bar' && {
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								font: {
									size: 12,
									family: "'Inter', sans-serif"
								}
							},
							grid: {
								color: 'rgba(0, 0, 0, 0.05)'
							}
						},
						x: {
							ticks: {
								font: {
									size: 12,
									family: "'Inter', sans-serif"
								}
							},
							grid: {
								display: false
							}
						}
					}
				})
			}
		};

		chart = new Chart(ctx, config);
	}

	// Export chart as image
	export function exportChart(filename = 'market-share-chart.png') {
		if (!chart) return;

		const url = chart.toBase64Image();
		const link = document.createElement('a');
		link.download = filename;
		link.href = url;
		link.click();
	}

	// Recreate chart when chartType, iCloudDockerTotal, or haBouncieTotal changes
	$: if (
		canvas &&
		chartType !== undefined &&
		iCloudDockerTotal !== undefined &&
		haBouncieTotal !== undefined
	) {
		createChart();
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});

	function toggleDataTable() {
		showDataTable = !showDataTable;
	}

	// Keyboard navigation for canvas
	// Note: Space key preventDefault is safe here as the event only fires when canvas has focus
	function handleCanvasKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			if (event.key === ' ') {
				event.preventDefault();
			}
			toggleDataTable();
		}
	}
</script>

<div class="w-full h-full" data-testid="market-share-chart">
	<!-- Accessibility: Screen reader description -->
	<div class="sr-only" id="chart-description" aria-live="polite">
		{chartSummary}
	</div>

	<!-- Chart canvas -->
	<div role="img" aria-label="Market share distribution chart" aria-describedby="chart-description">
		<canvas
			bind:this={canvas}
			tabindex="0"
			on:keydown={handleCanvasKeydown}
			aria-label="Press Enter to toggle data table view"
		></canvas>
	</div>

	<!-- Toggle button for data table -->
	<div class="mt-4 text-center">
		<button
			on:click={toggleDataTable}
			class="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
			aria-expanded={showDataTable}
			aria-controls="chart-data-table"
		>
			{showDataTable ? 'Hide' : 'Show'} data table
		</button>
	</div>

	<!-- Accessible data table alternative -->
	{#if showDataTable}
		<div
			id="chart-data-table"
			class="mt-4 overflow-x-auto"
			role="table"
			aria-label="Market share data"
		>
			<table class="min-w-full border border-gray-300 bg-white">
				<thead class="bg-gray-100">
					<tr>
						<th
							class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
						>
							Application
						</th>
						<th
							class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
						>
							Installations
						</th>
						<th
							class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
						>
							Percentage
						</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b border-gray-200">
						<td class="px-4 py-2 text-sm text-gray-900">
							<span class="inline-flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true"></span>
								iCloud Docker
							</span>
						</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">
							{iCloudDockerTotal.toLocaleString()}
						</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">
							{iCloudPercentage.toFixed(1)}%
						</td>
					</tr>
					<tr class="border-b border-gray-200">
						<td class="px-4 py-2 text-sm text-gray-900">
							<span class="inline-flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-green-500" aria-hidden="true"></span>
								Home Assistant - Bouncie
							</span>
						</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">
							{haBouncieTotal.toLocaleString()}
						</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">
							{bounciePercentage.toFixed(1)}%
						</td>
					</tr>
					<tr class="bg-gray-50 font-semibold">
						<td class="px-4 py-2 text-sm text-gray-900">Total</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">
							{totalInstallations.toLocaleString()}
						</td>
						<td class="px-4 py-2 text-sm text-gray-900 text-right">100.0%</td>
					</tr>
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	div {
		position: relative;
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
