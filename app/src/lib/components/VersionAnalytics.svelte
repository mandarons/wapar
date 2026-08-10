<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend
	} from 'chart.js';

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend
	);

	export let versionDistribution: Array<{
		version: string;
		count: number;
		percentage: number;
	}> = [];
	export let latestVersion: string | null = null;
	export let outdatedInstallations: number = 0;
	export let newInstallRate: { last7Days: number; last30Days: number } = {
		last7Days: 0,
		last30Days: 0
	};
	export let upgradeAnalytics: {
		upgradeFlows: Array<{ from: string; to: string; count: number }>;
		skipLevelUpgrades: { count: number; rate: number };
		downgradeRate: number;
		upgradeThenStale30d: { count: number; rate: number };
		upgradesLast7d: number;
		upgradesLast30d: number;
	} | null = null;
	export let adoptionTimeline: Array<{ date: string; version: string; newInstalls: number }> = [];
	export let adoptionGaps: Array<{ from: string; to: string; days: number }> = [];
	export let title: string = 'App Version Distribution';

	let adoptionCanvas: HTMLCanvasElement;
	let adoptionChart: Chart | null = null;
	let adoptionPeriod: '30d' | '90d' = '30d';
	let showDataTable = false;
	let reducedMotion = false;

	$: maxCount =
		versionDistribution.length > 0 ? Math.max(...versionDistribution.map((v) => v.count)) : 1;

	// Derive top versions for the chart (max 5 to avoid legend noise)
	$: topVersions = versionDistribution.slice(0, 5).map((v) => v.version);

	// Build datasets for the adoption curve chart
	$: adoptionDatasets = buildAdoptionDatasets(adoptionTimeline, topVersions, adoptionPeriod);

	function buildAdoptionDatasets(
		timeline: Array<{ date: string; version: string; newInstalls: number }>,
		versions: string[],
		period: string
	) {
		if (timeline.length === 0 || versions.length === 0) return { labels: [], datasets: [] };

		// Filter to the selected period
		const daysAgo = period === '90d' ? 90 : 30;
		const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const filtered = timeline.filter((e) => e.date >= cutoff);

		// Collect all unique dates, sorted
		const dateSet = new Set<string>();
		for (const entry of filtered) dateSet.add(entry.date);
		const labels = Array.from(dateSet).sort();

		// Build a map: version -> { date -> newInstalls }
		const versionDateMap = new Map<string, Map<string, number>>();
		for (const v of versions) versionDateMap.set(v, new Map());
		for (const entry of filtered) {
			const vMap = versionDateMap.get(entry.version);
			if (vMap) {
				vMap.set(entry.date, (vMap.get(entry.date) || 0) + entry.newInstalls);
			}
		}

		const palette = [
			'rgba(59, 130, 246, 0.8)',
			'rgba(16, 185, 129, 0.8)',
			'rgba(245, 158, 11, 0.8)',
			'rgba(239, 68, 68, 0.8)',
			'rgba(139, 92, 246, 0.8)'
		];
		const paletteBg = [
			'rgba(59, 130, 246, 0.1)',
			'rgba(16, 185, 129, 0.1)',
			'rgba(245, 158, 11, 0.1)',
			'rgba(239, 68, 68, 0.1)',
			'rgba(139, 92, 246, 0.1)'
		];

		const datasets = versions.map((v, i) => ({
			label: v,
			data: labels.map((d) => versionDateMap.get(v)?.get(d) || 0),
			borderColor: palette[i % palette.length],
			backgroundColor: paletteBg[i % paletteBg.length],
			fill: true,
			tension: 0.3,
			pointRadius: 2,
			pointHoverRadius: 5
		}));

		return { labels, datasets };
	}

	function createAdoptionChart() {
		if (!adoptionCanvas || adoptionDatasets.labels.length === 0) return;
		if (adoptionChart) adoptionChart.destroy();

		const ctx = adoptionCanvas.getContext('2d');
		if (!ctx) return;

		adoptionChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: adoptionDatasets.labels,
				datasets: adoptionDatasets.datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: reducedMotion ? false : { duration: 300 },
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							font: { family: "'Inter', sans-serif", size: 12 },
							usePointStyle: true,
							padding: 16
						}
					},
					tooltip: {
						titleFont: { family: "'Inter', sans-serif" },
						bodyFont: { family: "'Inter', sans-serif" },
						callbacks: {
							title: (items) => `Date: ${items[0].label}`,
							label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} new installs`
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Date',
							font: { family: "'Inter', sans-serif", size: 12 }
						},
						ticks: {
							font: { family: "'Inter', sans-serif", size: 10 },
							maxRotation: 45,
							autoSkip: true,
							maxTicksLimit: 15
						}
					},
					y: {
						title: {
							display: true,
							text: 'New Installs',
							font: { family: "'Inter', sans-serif", size: 12 }
						},
						beginAtZero: true,
						ticks: {
							font: { family: "'Inter', sans-serif", size: 10 },
							precision: 0
						}
					}
				}
			}
		});
	}

	function toggleDataTable() {
		showDataTable = !showDataTable;
	}

	function switchPeriod(p: '30d' | '90d') {
		adoptionPeriod = p;
	}

	function isOutdated(version: string): boolean {
		if (!latestVersion || version === latestVersion) return false;
		return version !== latestVersion;
	}

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	}

	function exportData() {
		const data = {
			versionDistribution,
			latestVersion,
			outdatedInstallations,
			newInstallRate,
			adoptionTimeline,
			adoptionGaps,
			exportedAt: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `version-analytics-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	$: if (adoptionCanvas && adoptionDatasets.labels.length > 0) {
		createAdoptionChart();
	}

	onMount(() => {
		reducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (adoptionCanvas && adoptionDatasets.labels.length > 0) {
			createAdoptionChart();
		}
	});

	onDestroy(() => {
		if (adoptionChart) {
			adoptionChart.destroy();
			adoptionChart = null;
		}
	});
</script>

<div
	class="version-analytics-container"
	data-testid="version-analytics"
	role="region"
	aria-labelledby="version-analytics-title"
>
	<div class="header">
		<h3 id="version-analytics-title" class="title">{title}</h3>
		<button
			class="export-button"
			on:click={exportData}
			aria-label="Export version analytics data"
			title="Export version analytics data as JSON"
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
				aria-hidden="true"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="7 10 12 15 17 10"></polyline>
				<line x1="12" y1="15" x2="12" y2="3"></line>
			</svg>
			Export
		</button>
	</div>

	{#if versionDistribution.length === 0}
		<div class="empty-state" data-testid="version-analytics-empty">
			<p class="text-lg font-medium text-gray-500">No version data available</p>
			<p class="text-sm text-gray-400 mt-2">Install data will appear here once available</p>
		</div>
	{:else}
		<div class="version-bars" role="list" aria-label="Version distribution chart">
			{#each versionDistribution as version (version.version)}
				{@const barWidth = (version.count / maxCount) * 100}
				{@const isOldVersion = isOutdated(version.version)}
				<div
					class="version-item"
					role="listitem"
					aria-label="{version.version}: {version.count} installations, {version.percentage}% of total"
				>
					<div class="version-info">
						<span class="version-label">
							{version.version}
							{#if version.version === latestVersion}
								<span class="latest-badge" aria-label="Latest version">Latest</span>
							{/if}
							{#if isOldVersion}
								<span
									class="outdated-badge"
									aria-label="Warning: Outdated version"
									title="Consider upgrading"
								>
									Outdated
								</span>
							{/if}
						</span>
					</div>
					<div class="bar-container">
						<div
							class="bar {isOldVersion ? 'outdated' : ''}"
							style="width: {barWidth}%"
							role="progressbar"
							aria-valuenow={version.percentage}
							aria-valuemin="0"
							aria-valuemax="100"
							aria-label="Usage percentage"
						></div>
						<span class="bar-label">
							{version.percentage}% ({formatNumber(version.count)})
						</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="stats-footer" role="region" aria-label="Version statistics summary">
			<div class="stat-item">
				<span class="stat-label">Latest Version:</span>
				<span class="stat-value">{latestVersion || 'N/A'}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Outdated Installations:</span>
				<span class="stat-value">{formatNumber(outdatedInstallations)}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">New Installs (7d / 30d):</span>
				<span class="stat-value">
					{formatNumber(newInstallRate.last7Days)} / {formatNumber(newInstallRate.last30Days)}
				</span>
			</div>
			{#if upgradeAnalytics}
				<div class="stat-item">
					<span class="stat-label">Upgrades (7d / 30d):</span>
					<span class="stat-value">
						{formatNumber(upgradeAnalytics.upgradesLast7d)} / {formatNumber(
							upgradeAnalytics.upgradesLast30d
						)}
					</span>
				</div>
				{#if upgradeAnalytics.skipLevelUpgrades.count > 0}
					<div class="stat-item">
						<span class="stat-label">Skip-level Upgrades:</span>
						<span class="stat-value">{upgradeAnalytics.skipLevelUpgrades.rate}%</span>
					</div>
				{/if}
				{#if upgradeAnalytics.downgradeRate > 0}
					<div class="stat-item">
						<span class="stat-label">Downgrade Rate:</span>
						<span class="stat-value">{upgradeAnalytics.downgradeRate}%</span>
					</div>
				{/if}
			{/if}
		</div>
		{#if upgradeAnalytics && upgradeAnalytics.upgradeFlows.length > 0}
			<div class="upgrade-paths" role="region" aria-label="Most common upgrade paths">
				<h4 class="upgrade-paths-title">Most common upgrade paths</h4>
				<div class="upgrade-paths-list">
					{#each upgradeAnalytics.upgradeFlows.slice(0, 5) as flow}
						<div class="upgrade-path-item">
							<span class="upgrade-from">{flow.from}</span>
							<span class="upgrade-arrow" aria-hidden="true">&rarr;</span>
							<span class="upgrade-to">{flow.to}</span>
							<span class="upgrade-count">{flow.count}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if adoptionTimeline.length > 0}
			<div class="adoption-curve" role="region" aria-labelledby="adoption-curve-title">
				<div class="adoption-header">
					<h4 id="adoption-curve-title" class="adoption-title">Version Adoption Curve</h4>
					<div class="adoption-controls">
						<div class="period-toggle" role="radiogroup" aria-label="Time period">
							<button
								class="period-btn"
								class:active={adoptionPeriod === '30d'}
								on:click={() => switchPeriod('30d')}
								role="radio"
								aria-checked={adoptionPeriod === '30d'}
							>
								30d
							</button>
							<button
								class="period-btn"
								class:active={adoptionPeriod === '90d'}
								on:click={() => switchPeriod('90d')}
								role="radio"
								aria-checked={adoptionPeriod === '90d'}
							>
								90d
							</button>
						</div>
						<button
							class="data-table-toggle"
							on:click={toggleDataTable}
							aria-label={showDataTable ? 'Hide data table' : 'Show data table'}
							aria-expanded={showDataTable}
						>
							{showDataTable ? 'Hide Table' : 'Show Table'}
						</button>
					</div>
				</div>

				<p class="sr-only" aria-live="polite">
					Version adoption curve showing new installs per version over the last {adoptionPeriod ===
					'30d'
						? '30'
						: '90'} days.
					{#if adoptionGaps.length > 0}
						Data gaps detected: {adoptionGaps.length}.
					{/if}
				</p>

				{#if adoptionGaps.length > 0}
					<div class="gap-alert" role="alert">
						<span class="gap-icon" aria-hidden="true">⚠</span>
						Data gaps detected ({adoptionGaps.length}) — some periods may have no reported installs.
					</div>
				{/if}

				<div class="chart-container">
					<canvas bind:this={adoptionCanvas} aria-describedby="adoption-chart-desc" tabindex="0"
					></canvas>
					<p id="adoption-chart-desc" class="sr-only">
						Line chart displaying new installation counts per version over time. Use the Show Table
						button for a tabular view.
					</p>
				</div>

				{#if showDataTable}
					<div class="data-table-wrapper" role="region" aria-label="Adoption timeline data table">
						<table class="data-table">
							<caption class="sr-only">Version adoption timeline data</caption>
							<thead>
								<tr>
									<th scope="col">Date</th>
									<th scope="col">Version</th>
									<th scope="col">New Installs</th>
								</tr>
							</thead>
							<tbody>
								{#each adoptionTimeline.slice(0, 100) as entry}
									<tr>
										<td>{entry.date}</td>
										<td>{entry.version}</td>
										<td>{entry.newInstalls}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.version-analytics-container {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.export-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: #3b82f6;
		background: white;
		border: 1px solid #3b82f6;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.export-button:hover {
		background: #eff6ff;
	}

	.export-button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;
	}

	.version-bars {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.version-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.version-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.latest-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #059669;
		background: #d1fae5;
		border-radius: 0.25rem;
	}

	.outdated-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #d97706;
		background: #fef3c7;
		border-radius: 0.25rem;
	}

	.bar-container {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.bar {
		height: 2rem;
		background: #3b82f6;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
		min-width: 2rem;
	}

	.bar.outdated {
		background: #f59e0b;
	}

	.bar-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		white-space: nowrap;
	}

	.stats-footer {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.upgrade-paths {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.upgrade-paths-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.75rem 0;
	}

	.upgrade-paths-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.upgrade-path-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.upgrade-from {
		color: #6b7280;
		font-family: monospace;
	}

	.upgrade-arrow {
		color: #9ca3af;
	}

	.upgrade-to {
		color: #1f2937;
		font-weight: 500;
		font-family: monospace;
	}

	.upgrade-count {
		margin-left: auto;
		color: #6b7280;
		font-size: 0.75rem;
	}

	@media (max-width: 640px) {
		.version-analytics-container {
			padding: 1rem;
		}

		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.stats-footer {
			grid-template-columns: 1fr;
		}
	}

	.adoption-curve {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.adoption-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.adoption-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.adoption-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.period-toggle {
		display: flex;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		overflow: hidden;
	}

	.period-btn {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		background: white;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.period-btn.active {
		background: #3b82f6;
		color: white;
	}

	.period-btn:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.data-table-toggle {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.data-table-toggle:hover {
		background: #f9fafb;
	}

	.data-table-toggle:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.gap-alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		font-size: 0.75rem;
		color: #92400e;
		background: #fef3c7;
		border: 1px solid #fcd34d;
		border-radius: 0.375rem;
	}

	.gap-icon {
		flex-shrink: 0;
	}

	.chart-container {
		position: relative;
		height: 280px;
		width: 100%;
	}

	.data-table-wrapper {
		margin-top: 1rem;
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.data-table th {
		font-weight: 600;
		color: #374151;
		background: #f9fafb;
	}

	.data-table td {
		color: #6b7280;
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
