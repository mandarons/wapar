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

	$: totalInstallations = iCloudDockerTotal + haBouncieTotal;
	$: iCloudPercentage = totalInstallations > 0 ? (iCloudDockerTotal / totalInstallations) * 100 : 50;
	$: bounciePercentage = totalInstallations > 0 ? (haBouncieTotal / totalInstallations) * 100 : 50;

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
				labels: ['iCloud Drive Docker', 'Home Assistant - Bouncie'],
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

	// Recreate chart when type changes
	$: if (canvas && (chartType || iCloudDockerTotal || haBouncieTotal)) {
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
</script>

<div class="w-full h-full" data-testid="market-share-chart">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	div {
		position: relative;
	}
</style>
