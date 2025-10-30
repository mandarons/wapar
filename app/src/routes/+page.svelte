<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import 'svgmap/dist/svgMap.min.css';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import GeographicAppAnalysis from '$lib/components/GeographicAppAnalysis.svelte';
	import MarketShareChart from '$lib/components/MarketShareChart.svelte';
	import VersionAnalytics from '$lib/components/VersionAnalytics.svelte';
	import RecentInstallations from '$lib/components/RecentInstallations.svelte';
	import { buildOverviewMetrics, describeUpdate, deriveLastSynced } from '$lib/utils/overview';

	type VersionAnalyticsPayload = {
		versionDistribution: Array<{
			version: string;
			count: number;
			percentage: number;
		}>;
		latestVersion: string | null;
		outdatedInstallations: number;
		upgradeRate: { last7Days: number; last30Days: number };
	};

	type RecentInstallationsPayload = {
		installations: Array<{
			id: string;
			appName: string;
			appVersion: string;
			countryCode: string | null;
			region: string | null;
			createdAt: string;
		}>;
		total: number;
		limit: number;
		offset: number;
		installationsLast24h: number;
		installationsLast7d: number;
	};

	export let data: {
		totalInstallations: number;
		monthlyActive: number;
		createdAt: string | null;
		countryToCount: { countryCode: string; count: number }[];
		iCloudDocker: { total: number };
		haBouncie: { total: number };
		versionAnalytics?: VersionAnalyticsPayload;
		recentInstallations?: RecentInstallationsPayload;
	};

	interface SvgMapInstance {
		destroy?: () => void;
	}

	const modalStore = getModalStore();
	const API_URL = 'https://wapar-api.mandarons.com';
	let mapObj: SvgMapInstance | null = null;
	let svgMapConstructor: (typeof import('svgmap'))['default'] | null = null;
	let isRefreshing = false;
	let fetchError: string | null = null;
	let lastSyncedIso: string | null = data.createdAt ?? null;
	let chartType: 'pie' | 'doughnut' | 'bar' = 'pie';
	let marketShareChartRef: MarketShareChart | null = null;
	let mapInitialized = false;

	const fallbackVersions: VersionAnalyticsPayload = {
		versionDistribution: [],
		latestVersion: null,
		outdatedInstallations: 0,
		upgradeRate: { last7Days: 0, last30Days: 0 }
	};

	const fallbackRecent: RecentInstallationsPayload = {
		installations: [],
		total: 0,
		limit: 20,
		offset: 0,
		installationsLast24h: 0,
		installationsLast7d: 0
	};

	const tabConfig = [
		{
			id: 'overview',
			label: 'Overview',
			description: 'Install totals, summary text, and manual refresh controls.'
		},
		{
			id: 'distribution',
			label: 'Distribution',
			description: 'Market share comparison between iCloud Docker and HA Bouncie.'
		},
		{
			id: 'geography',
			label: 'Geography',
			description: 'Regional coverage, top countries, and world map.'
		},
		{
			id: 'versions',
			label: 'Versions',
			description: 'Release adoption, outdated installs, and upgrade rate.'
		},
		{
			id: 'recent',
			label: 'Recent installs',
			description: 'Latest installation activity captured by WAPAR.'
		},
		{
			id: 'insights',
			label: 'Insights',
			description: 'Supplementary geographic insights derived from proportional estimates.'
		}
	] as const;

	type TabId = (typeof tabConfig)[number]['id'];
	const MAP_TAB_ID: TabId = 'geography';

	let activeTab: TabId = 'overview';
	let activeTabIndex = 0;
	let tabRefs: Array<HTMLButtonElement | null> = [];

	$: visibleTabs = tabConfig.filter((tab) => {
		if (tab.id === 'versions') {
			return Boolean(data.versionAnalytics);
		}
		if (tab.id === 'recent') {
			return Boolean(data.recentInstallations);
		}
		return true;
	});

	$: tabRefs.length = visibleTabs.length;

	$: {
		const index = visibleTabs.findIndex((tab) => tab.id === activeTab);
		if (index === -1 && visibleTabs.length > 0) {
			activeTab = visibleTabs[0].id;
			activeTabIndex = 0;
		} else if (index !== -1) {
			activeTabIndex = index;
		}
	}

	$: activeTabDetails = visibleTabs[activeTabIndex];

	async function setActiveTab(index: number) {
		if (visibleTabs.length === 0) return;
		if (index < 0) {
			index = visibleTabs.length - 1;
		} else if (index >= visibleTabs.length) {
			index = 0;
		}
		const tab = visibleTabs[index];
		if (!tab) return;
		const previousTabId = activeTab;
		if (previousTabId !== tab.id && previousTabId === MAP_TAB_ID) {
			destroyMap();
		}
		activeTab = tab.id;
		activeTabIndex = index;
		await tick();
		const node = tabRefs[index];
		if (node) {
			node.focus();
		}
		if (tab.id === MAP_TAB_ID && !mapInitialized) {
			await initialiseMap();
		}
	}

	function handleTabKeydown(event: KeyboardEvent, index: number) {
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				setActiveTab(index + 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				setActiveTab(index - 1);
				break;
			case 'Home':
				event.preventDefault();
				setActiveTab(0);
				break;
			case 'End':
				event.preventDefault();
				setActiveTab(visibleTabs.length - 1);
				break;
		}
	}

	function handleTabClick(index: number) {
		setActiveTab(index);
	}

	async function getSvgMapConstructor() {
		if (!svgMapConstructor) {
			const module = await import('svgmap');
			svgMapConstructor = module.default;
		}
		return svgMapConstructor;
	}
	async function initialiseMap() {
		if (typeof document === 'undefined') return;
		const svgMap = await getSvgMapConstructor();

		if (mapObj?.destroy) {
			mapObj.destroy();
		}

		mapObj = new svgMap({
			targetElementID: 'svgMap',
			minZoom: 1,
			maxZoom: 3,
			initialZoom: 1,
			showContinentSelector: false,
			zoomScaleSensitivity: 1,
			showZoomReset: false,
			mouseWheelZoomEnabled: true,
			flagType: 'emoji',
			noDataText: 'No installations detected',
			colorMax: '#050000',
			colorMin: '#c7d2fe',
			data: {
				data: {
					installations: {
						name: 'Installations',
						format: '{0}',
						thousandSeparator: ',',
						thresholdMax: 50000,
						thresholdMin: 0
					}
				},
				applyData: 'installations',
				values: Object.fromEntries(
					new Map(
						data.countryToCount.map(({ countryCode, count }) => [
							countryCode,
							{ installations: count }
						])
					)
				)
		},
		callback: (id: string) => handleCountryClick(id)
	});
	mapInitialized = true;
}

function destroyMap() {
	if (mapObj?.destroy) {
		mapObj.destroy();
	}
	mapObj = null;
	mapInitialized = false;
}

onMount(() => {
	if (activeTab === MAP_TAB_ID) {
		initialiseMap();
	}
});

onDestroy(() => {
	destroyMap();
});	async function fetchWithFallback<T>(url: string, fallback: T): Promise<T> {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Request failed: ${response.status}`);
			}
			return (await response.json()) as T;
		} catch (error) {
			console.warn(`Failed to fetch ${url}`, error);
			return fallback;
		}
	}

	async function refreshData() {
		try {
			isRefreshing = true;
			const usageRes = await fetch(`${API_URL}/api/usage`);
			if (!usageRes.ok) {
				throw new Error(`Usage request failed: ${usageRes.status}`);
			}
			const usageData = await usageRes.json();
			const haRes = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
			if (!haRes.ok) {
				throw new Error(`Home Assistant request failed: ${haRes.status}`);
			}
			const haData = await haRes.json();
			const versionAnalytics = await fetchWithFallback(
				`${API_URL}/api/version-analytics`,
				fallbackVersions
			);
			const recentInstallations = await fetchWithFallback(
				`${API_URL}/api/recent-installations?limit=20`,
				fallbackRecent
			);

			data = {
				...usageData,
				totalInstallations: haData.bouncie.total + usageData.iCloudDocker.total,
				haBouncie: haData.bouncie,
				versionAnalytics,
				recentInstallations
			};
			lastSyncedIso = usageData.createdAt ?? new Date().toISOString();
			fetchError = null;
			if (activeTab === MAP_TAB_ID) {
				await initialiseMap();
			} else if (mapInitialized) {
				destroyMap();
			}
		} catch (error) {
			console.error('Error refreshing usage data', error);
			fetchError = 'Unable to refresh data right now. Please try again later.';
		} finally {
			isRefreshing = false;
		}
	}

	async function handleManualRefresh() {
		await refreshData();
	}

	$: overviewMetrics = buildOverviewMetrics({
		totalInstallations: data.totalInstallations,
		iCloudDockerTotal: data.iCloudDocker.total,
		haBouncieTotal: data.haBouncie.total
	});

	$: overviewSummary = describeUpdate({
		totalInstallations: data.totalInstallations,
		countryCount: data.countryToCount.length,
		installationsLast24h: data.recentInstallations?.installationsLast24h ?? null,
		installationsLast7d: data.recentInstallations?.installationsLast7d ?? null
	});

	$: lastSyncedMeta = deriveLastSynced(lastSyncedIso);
	$: sortedCountries = [...data.countryToCount].sort((a, b) => b.count - a.count);
	$: top10Countries = sortedCountries.slice(0, 10);

	function formatPercentage(count: number, total: number): string {
		if (total === 0) return '0%';
		return `${((count / total) * 100).toFixed(1)}%`;
	}

	function getCountryName(code: string): string {
		const countryNames: Record<string, string> = {
			US: 'United States',
			GB: 'United Kingdom',
			DE: 'Germany',
			FR: 'France',
			CA: 'Canada',
			AU: 'Australia',
			NL: 'Netherlands',
			SE: 'Sweden',
			NO: 'Norway',
			DK: 'Denmark',
			FI: 'Finland',
			BE: 'Belgium',
			CH: 'Switzerland',
			AT: 'Austria',
			ES: 'Spain',
			IT: 'Italy',
			PL: 'Poland',
			RU: 'Russia',
			BR: 'Brazil',
			IN: 'India',
			CN: 'China',
			JP: 'Japan',
			KR: 'South Korea',
			SG: 'Singapore',
			NZ: 'New Zealand',
			IE: 'Ireland',
			PT: 'Portugal',
			GR: 'Greece',
			CZ: 'Czech Republic',
			RO: 'Romania',
			HU: 'Hungary'
		};
		return countryNames[code] || code;
	}

	function showCountryDetails(countryCode: string) {
		const countryData = data.countryToCount.find((entry) => entry.countryCode === countryCode);
		if (!countryData) return;

		const countryName = getCountryName(countryCode);
		const percentage = formatPercentage(countryData.count, data.totalInstallations);
		const ranking = sortedCountries.findIndex((entry) => entry.countryCode === countryCode) + 1;

		const modal: ModalSettings = {
			type: 'alert',
			title: `${countryName} (${countryCode})`,
			body: `
<div class="space-y-3">
<div class="flex justify-between">
<span class="font-semibold">Total installations:</span>
<span>${countryData.count.toLocaleString()}</span>
</div>
<div class="flex justify-between">
<span class="font-semibold">Share of global total:</span>
<span>${percentage}</span>
</div>
<div class="flex justify-between">
<span class="font-semibold">Ranking:</span>
<span>#${ranking} of ${data.countryToCount.length}</span>
</div>
</div>
`,
			modalClasses:
				'!bg-white !text-slate-900 rounded-2xl shadow-xl border border-slate-200 px-6 py-6',
			backdropClasses: '!bg-black/40 backdrop-blur-sm',
			buttonTextCancel: 'Close'
		};

		modalStore.trigger(modal);
	}

	function handleCountryClick(countryCode: string) {
		showCountryDetails(countryCode);
	}

	function highlightCountryOnMap(countryCode: string) {
		if (!/^[A-Za-z0-9]{2,3}$/.test(countryCode)) {
			return;
		}
		const svgElement = document.querySelector(`[data-id="${countryCode}"]`);
		if (svgElement) {
			document.querySelectorAll('.svgMap-country').forEach((el) => {
				el.classList.remove('country-highlighted');
			});
			svgElement.classList.add('country-highlighted');
			showCountryDetails(countryCode);
		}
	}

	$: lastSyncedTitle = lastSyncedMeta.isKnown
		? `Data timestamp: ${lastSyncedMeta.absolute}`
		: undefined;

	function handleExportChart() {
		if (!marketShareChartRef) return;
		const timestamp = new Date().toISOString().split('T')[0];
		marketShareChartRef.exportChart(`market-share-${timestamp}.png`);
	}
</script>

<section class="bg-gray-50 border-b border-gray-200">
	<div class="container mx-auto px-5 py-8">
		{#if fetchError}
			<div
				class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
				role="alert"
			>
				{fetchError}
			</div>
		{/if}
	<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Install dashboard</h1>
			<p class="text-sm text-gray-600">
				Navigate between focused analytics panels to explore adoption from different angles.
			</p>
		</div>
		{#if activeTabDetails}
			<p class="text-sm text-gray-500 md:max-w-sm">
				<strong class="font-semibold text-gray-700">{activeTabDetails.label}:</strong>
				{activeTabDetails.description}
			</p>
		{/if}
	</div>

	<div
		class="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
		role="tablist"
		aria-label="Dashboard sections"
	>
		{#each visibleTabs as tab, index}
			<button
				bind:this={tabRefs[index]}
				id={`dashboard-tab-${tab.id}`}
				class={`flex flex-col rounded-md border px-4 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:gap-2 ${		{#each visibleTabs as tab}
			<div
				id={`dashboard-panel-${tab.id}`}
				role="tabpanel"
				aria-labelledby={`dashboard-tab-${tab.id}`}
				tabindex="0"
				class={`mt-8 ${activeTab === tab.id ? '' : 'hidden'}`}
			>
				{#if tab.id === 'overview'}
					<div
						class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
						data-testid="overview-card"
					>
						<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div class="space-y-2">
								<h2 class="text-xl font-semibold text-gray-900">Install overview</h2>
								<p class="text-sm text-gray-600" data-testid="overview-summary">{overviewSummary}</p>
								<p class="text-xs text-gray-500">
									Data combined from WAPAR Worker API and Home Assistant telemetry.
								</p>
							</div>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
								<div class="text-xs text-gray-600" data-testid="last-synced" title={lastSyncedTitle}>
									<span class="font-medium text-gray-700">Last synced:</span>
									<span class="ml-1">{lastSyncedMeta.relative}</span>
								</div>
								<button
									class="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
									on:click={handleManualRefresh}
									disabled={isRefreshing}
									data-testid="manual-refresh-button"
								>
									{#if isRefreshing}
										<span class="mr-2 inline-block animate-spin" aria-hidden="true">⏳</span>
										Refreshing
									{:else}
										Refresh data
									{/if}
								</button>
							</div>
						</div>
						<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							{#each overviewMetrics as metric}
								<div
									class="rounded-md border border-gray-200 p-4"
									data-testid={`overview-metric-${metric.testId}`}
								>
									<p class="text-xs font-medium uppercase tracking-wide text-gray-500">
										{metric.label}
									</p>
									<p class="mt-2 text-3xl font-semibold text-gray-900" data-testid={metric.testId}>
										{metric.value}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{:else if tab.id === 'distribution'}
					<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<div class="mb-6 text-center">
							<h2 class="text-xl font-semibold text-gray-900">Distribution insights</h2>
							<p class="mt-2 text-sm text-gray-600">
								Comparison of installation share between supported integrations.
							</p>
						</div>
						<div
							class="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<h3 class="text-lg font-semibold text-gray-900">Market share visualisation</h3>
							<div class="flex flex-wrap items-center gap-3">
								<div class="flex items-center gap-2">
									<label for="chart-type" class="text-sm font-medium text-gray-700"
										>Chart type</label
									>
									<select
										id="chart-type"
										bind:value={chartType}
										class="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700"
										data-testid="chart-type-selector"
									>
										<option value="pie">Pie</option>
										<option value="doughnut">Doughnut</option>
										<option value="bar">Bar</option>
									</select>
								</div>
								<button
									on:click={handleExportChart}
									class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
									data-testid="export-chart-button"
								>
									Export chart
								</button>
							</div>
						</div>
						<div class="mx-auto w-full max-w-2xl" style="height: 400px;">
							<MarketShareChart
								bind:this={marketShareChartRef}
								iCloudDockerTotal={data.iCloudDocker.total}
								haBouncieTotal={data.haBouncie.total}
								{chartType}
								showLegend={true}
								title=""
							/>
						</div>
					</div>
				{:else if tab.id === MAP_TAB_ID}
					<div class="space-y-6">
						<div class="text-center">
							<h2 class="text-xl font-semibold text-gray-900">Geographic coverage</h2>
							<p class="mt-2 text-sm text-gray-600">
								Top countries by combined installation count and interactive world map.
							</p>
						</div>
						<div class="flex flex-col gap-6 lg:flex-row">
							<div class="w-full lg:w-1/3">
								<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
									<h3 class="text-base font-semibold text-gray-900">Top 10 countries</h3>
									<div class="mt-4 space-y-2">
										{#each top10Countries as country, index}
											<button
												on:click={() => highlightCountryOnMap(country.countryCode)}
												class="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
												data-testid={`country-item-${country.countryCode}`}
											>
												<span class="flex items-center gap-2">
													<span class="font-semibold text-gray-500">#{index + 1}</span>
													<span>{getCountryName(country.countryCode)}</span>
												</span>
												<span class="text-right">
													<span class="block font-semibold text-gray-900"
														>{country.count.toLocaleString()}</span
													>
													<span class="block text-xs text-gray-500"
														>{formatPercentage(country.count, data.totalInstallations)}</span
													>
												</span>
											</button>
										{/each}
									</div>
								</div>
							</div>

							<div class="w-full lg:w-2/3">
								<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
									<div
										id="svgMap"
										class="w-full"
										data-testid="interactive-map"
										aria-label="World map showing installation density"
									></div>
								</div>
							</div>
						</div>
					</div>
				{:else if tab.id === 'versions' && data.versionAnalytics}
					<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<VersionAnalytics
							versionDistribution={data.versionAnalytics.versionDistribution}
							latestVersion={data.versionAnalytics.latestVersion}
							outdatedInstallations={data.versionAnalytics.outdatedInstallations}
							upgradeRate={data.versionAnalytics.upgradeRate}
						/>
					</div>
				{:else if tab.id === 'recent' && data.recentInstallations}
					<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<RecentInstallations
							installations={data.recentInstallations.installations}
							total={data.recentInstallations.total}
							limit={data.recentInstallations.limit}
							offset={data.recentInstallations.offset}
							installationsLast24h={data.recentInstallations.installationsLast24h}
							installationsLast7d={data.recentInstallations.installationsLast7d}
						/>
					</div>
				{:else if tab.id === 'insights'}
					<GeographicAppAnalysis
						iCloudDockerTotal={data.iCloudDocker.total}
						haBouncieTotal={data.haBouncie.total}
						countryToCount={data.countryToCount}
					/>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	:global(.country-highlighted) {
		stroke: #1f2937 !important;
		stroke-width: 2 !important;
		filter: brightness(1.1);
	}

	:global(.svgMap-country) {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.svgMap-country:hover) {
		filter: brightness(1.05);
		stroke: #1f2937;
		stroke-width: 1.5;
	}

	:global(.modal .card) {
		background: #ffffff !important;
		border-radius: 1.25rem !important;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		border: none !important;
	}
</style>
