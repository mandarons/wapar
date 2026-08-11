<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import 'svgmap/dist/svgMap.min.css';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import GeographicAppAnalysis from '$lib/components/GeographicAppAnalysis.svelte';
	import MarketShareChart from '$lib/components/MarketShareChart.svelte';
	import VersionAnalytics from '$lib/components/VersionAnalytics.svelte';
	import RecentInstallations from '$lib/components/RecentInstallations.svelte';
	import HeartbeatAnalytics from '$lib/components/HeartbeatAnalytics.svelte';
	import GrowthAnalytics from '$lib/components/GrowthAnalytics.svelte';
	import { Button, Card } from '$lib/components/ui';
	import {
		buildOverviewMetrics,
		describeUpdate,
		deriveLastSynced,
		formatInstallCount,
		formatStalePercentage
	} from '$lib/utils/overview';
	import { getCountryName } from '$lib/utils/countries';
	import {
		getGeographyLayerData,
		sortCountriesDescending,
		getTopCountries,
		type GeographyLayer
	} from '$lib/utils/geographicMetrics';

	type VersionAnalyticsPayload = {
		versionDistribution: Array<{
			version: string;
			count: number;
			percentage: number;
		}>;
		latestVersion: string | null;
		outdatedInstallations: number;
		newInstallRate: { last7Days: number; last30Days: number };
		adoptionTimeline: Array<{ date: string; version: string; newInstalls: number }>;
		adoptionGaps: Array<{ from: string; to: string; days: number }>;
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
		appName?: string;
	};

	type HeartbeatAnalyticsPayload = {
		activeUsers: {
			daily: number;
			weekly: number;
			monthly: number;
			dau_mau_ratio: number;
		};
		engagementLevels: {
			highlyActive: { count: number; description: string };
			active: { count: number; description: string };
			occasional: { count: number; description: string };
			dormant: { count: number; description: string };
		};
		timeline: Array<{
			date: string;
			activeUsers: number;
			totalHeartbeats: number;
		}>;
		gaps: Array<{
			from: string;
			to: string;
			days: number;
		}>;
		healthMetrics: {
			avgHeartbeatsPerUser: number;
			avgTimeBetweenHeartbeats: string;
		};
		churnRisk: {
			usersInactive7Days: number;
			usersInactive14Days: number;
			usersInactive30Days: number;
		};
		retention: Array<{
			cohort: string;
			n: number;
			week1Active: number;
			week2Active: number;
			week3Active: number;
			week4Active: number;
		}>;
		syncHealth: {
			last7d: {
				installationsReporting: number;
				avgSyncDurationSec: number | null;
				errorRate: number;
				driveActiveCount: number;
				photosActiveCount: number;
			};
			last30d: {
				installationsReporting: number;
				avgSyncDurationSec: number | null;
				errorRate: number;
				driveActiveCount: number;
				photosActiveCount: number;
			};
		};
	};

	type NewInstallationsPayload = {
		summary: {
			totalNew: number;
			totalReinstalls: number;
			newUserRate: number;
			period: string;
		};
		timeline: Array<{
			date: string;
			newUsers: number;
			reinstalls: number;
			total: number;
		}>;
		gaps: Array<{
			from: string;
			to: string;
			days: number;
		}>;
		topCountriesNewUsers: Array<{
			countryCode: string;
			count: number;
			percentage: number;
		}>;
		reinstallPatterns: {
			reinstallRate: number;
		};
	};

	type CountryInsightsPayload = {
		countries: Array<{
			countryCode: string;
			new30d: number;
			new30dShare: number;
			active: number;
			activeRate: number;
			total: number;
		}>;
		period: string;
		activityThresholdDays: number;
		generatedAt: string;
	};

	type UpgradeAnalyticsPayload = {
		upgradeFlows: Array<{ from: string; to: string; count: number }>;
		skipLevelUpgrades: { count: number; rate: number };
		downgradeRate: number;
		upgradeThenStale30d: { count: number; rate: number };
		upgradesLast7d: number;
		upgradesLast30d: number;
	};

	export let data: {
		totalInstallations: number;
		activeInstallations: number;
		staleInstallations: number;
		monthlyActive: number;
		activityThresholdDays: number;
		createdAt: string | null;
		earliestInstallationDate: string | null;
		countryToCount: { countryCode: string; count: number }[];
		allTimeCountryToCount?: { countryCode: string; count: number }[];
		iCloudDocker: { total: number };
		haBouncie: { total: number };
		versionAnalytics?: VersionAnalyticsPayload;
		recentInstallations?: RecentInstallationsPayload;
		heartbeatAnalytics?: HeartbeatAnalyticsPayload;
		newInstallations?: NewInstallationsPayload;
		upgradeAnalytics?: UpgradeAnalyticsPayload;
		countryInsights?: CountryInsightsPayload;
		appName?: string | null;
	};

	interface SvgMapInstance {
		destroy?: () => void;
	}

	const modalStore = getModalStore();
	let mapObj: SvgMapInstance | null = null;
	let svgMapConstructor: (typeof import('svgmap'))['default'] | null = null;
	let isRefreshing = false;
	let fetchError: string | null = null;
	let lastSyncedIso: string | null = data.createdAt ?? null;
	let chartType: 'pie' | 'doughnut' | 'bar' = 'pie';
	let marketShareChartRef: MarketShareChart | null = null;
	let mapInitialized = false;
	let mapEventListeners: Array<{ element: Element; handler: (e: Event) => void }> = [];

	const tabConfig = [
		{
			id: 'overview',
			label: 'Overview',
			description: 'Active, total, and stale installation counts with summary statistics.'
		},
		{
			id: 'distribution',
			label: 'Distribution',
			description: 'Market share comparison between supported integrations.'
		},
		{
			id: 'geography',
			label: 'Geography',
			description:
				'Regional coverage, top countries, country health, and world map with Active/New/All-time layers.'
		},
		{
			id: 'versions',
			label: 'Versions',
			description:
				'Release adoption, outdated installs, and upgrade rate (active installations only).'
		},
		{
			id: 'growth',
			label: 'Growth',
			description: 'New user acquisition, reinstalls, and top countries driving growth.'
		},
		{
			id: 'heartbeat',
			label: 'Active Usage',
			description: 'User engagement metrics, DAU/WAU/MAU, churn risk, and sync health analysis.'
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
	const VALID_TAB_IDS = new Set<string>(tabConfig.map((t) => t.id));

	function getHashTab(): TabId {
		const hash = location.hash.replace(/^#/, '');
		if (hash && VALID_TAB_IDS.has(hash)) {
			return hash as TabId;
		}
		return 'overview';
	}

	function syncHashFromTab(tabId: TabId) {
		if (location.hash !== `#${tabId}`) {
			location.hash = tabId;
		}
	}

	let activeTab: TabId = 'overview';
	let activeTabIndex = 0;
	let tabRefs: Array<HTMLButtonElement | null> = [];

	$: visibleTabs = tabConfig.filter((tab) => {
		if (tab.id === 'versions') {
			return Boolean(data.versionAnalytics);
		}
		if (tab.id === 'growth') {
			return Boolean(data.newInstallations);
		}
		if (tab.id === 'recent') {
			return Boolean(data.recentInstallations);
		}
		if (tab.id === 'heartbeat') {
			return Boolean(data.heartbeatAnalytics);
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
		syncHashFromTab(tab.id);
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
	// Accessibility: Delay to allow third-party svgMap library to render countries before adding keyboard support
	const MAP_INITIALIZATION_DELAY_MS = 100;

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
						geographyLayerData.countries.map(({ countryCode, count }) => [
							countryCode,
							{ installations: count }
						])
					)
				)
			},
			callback: (id: string) => handleCountryClick(id)
		});
		mapInitialized = true;

		// Add keyboard accessibility to map countries
		if (typeof document !== 'undefined') {
			setTimeout(() => {
				const countries = document.querySelectorAll('.svgMap-country');
				countries.forEach((country) => {
					country.setAttribute('tabindex', '0');
					country.setAttribute('role', 'button');
					const countryId = country.getAttribute('data-id');
					if (countryId) {
						const countryName = getCountryName(countryId);
						const countryData = geographyLayerData.countries.find(
							(c) => c.countryCode === countryId
						);
						const installs = countryData ? countryData.count.toLocaleString() : '0';
						country.setAttribute(
							'aria-label',
							`${countryName}: ${installs} installations. Press Enter to view details.`
						);

						country.addEventListener('keydown', (e: Event) => {
							const event = e as KeyboardEvent;
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								handleCountryClick(countryId);
							}
						});
					}
				});
			}, MAP_INITIALIZATION_DELAY_MS);
		}
	}

	function destroyMap() {
		// Clean up event listeners to prevent memory leaks
		mapEventListeners.forEach(({ element, handler }) => {
			element.removeEventListener('keydown', handler);
		});
		mapEventListeners = [];

		if (mapObj?.destroy) {
			mapObj.destroy();
		}
		mapObj = null;
		mapInitialized = false;
	}

	function onHashChange() {
		const hashTab = getHashTab();
		if (hashTab !== activeTab) {
			const prevTab = activeTab;
			if (prevTab === MAP_TAB_ID) {
				destroyMap();
			}
			activeTab = hashTab;
		}
	}

	onMount(async () => {
		const hashTab = getHashTab();
		if (hashTab !== activeTab) {
			activeTab = hashTab;
		} else {
			syncHashFromTab(activeTab);
		}

		window.addEventListener('hashchange', onHashChange);

		if (activeTab === MAP_TAB_ID) {
			await initialiseMap();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('hashchange', onHashChange);
		}
		destroyMap();
	});

	async function handleManualRefresh() {
		try {
			isRefreshing = true;
			fetchError = null;
			await invalidateAll();
			lastSyncedIso = new Date().toISOString();
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

	$: overviewMetrics = buildOverviewMetrics({
		totalInstallations: data.totalInstallations,
		activeInstallations: data.activeInstallations,
		staleInstallations: data.staleInstallations,
		iCloudDockerTotal: data.iCloudDocker?.total ?? 0,
		haBouncieTotal: data.haBouncie?.total ?? 0,
		activityThresholdDays: data.activityThresholdDays,
		earliestInstallationDate: data.earliestInstallationDate
	});

	$: stalePercentage =
		data.totalInstallations > 0 ? (data.staleInstallations / data.totalInstallations) * 100 : 0;
	$: isHighStale = stalePercentage > 25;

	$: overviewSummary = describeUpdate({
		totalInstallations: data.totalInstallations,
		activeInstallations: data.activeInstallations,
		countryCount: data.countryToCount?.length ?? 0,
		installationsLast24h: data.recentInstallations?.installationsLast24h ?? null,
		installationsLast7d: data.recentInstallations?.installationsLast7d ?? null,
		earliestInstallationDate: data.earliestInstallationDate
	});

	$: lastSyncedMeta = deriveLastSynced(lastSyncedIso);

	$: newCountries = (data.newInstallations?.topCountriesNewUsers ?? []).map((c) => ({
		countryCode: c.countryCode,
		count: c.count
	}));
	$: geographyLayerData = getGeographyLayerData(
		selectedGeographyLayer,
		data.countryToCount ?? [],
		data.allTimeCountryToCount ?? [],
		newCountries
	);
	$: sortedCountries = sortCountriesDescending(geographyLayerData.countries);
	$: top10Countries = getTopCountries(geographyLayerData.countries);

	function formatPercentage(count: number, total: number): string {
		if (total === 0) return '0%';
		return `${((count / total) * 100).toFixed(1)}%`;
	}

	function getCountryButtonLabel(
		countryCode: string,
		count: number,
		totalInstallations: number
	): string {
		const name = getCountryName(countryCode);
		const installs = count.toLocaleString();
		const percentage = formatPercentage(count, totalInstallations);
		return `View ${name} on map: ${installs} installations, ${percentage}`;
	}

	function showCountryDetails(countryCode: string) {
		const countryData = geographyLayerData.countries.find(
			(entry) => entry.countryCode === countryCode
		);
		if (!countryData) return;

		const countryName = getCountryName(countryCode);
		const percentage = formatPercentage(countryData.count, geographyLayerData.totalCount);
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
<span>#${ranking} of ${geographyLayerData.countries.length}</span>
</div>
</div>
`,
			modalClasses:
				'!bg-white !text-slate-900 rounded-2xl shadow-xl border border-slate-200 px-6 py-6',
			backdropClasses: '!bg-black/40 backdrop-blur-sm',
			buttonTextCancel: 'Close',
			// Accessibility improvements for modal
			meta: {
				role: 'dialog',
				'aria-modal': 'true',
				'aria-labelledby': 'modal-title',
				'aria-describedby': 'modal-description'
			}
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

	// Map accessibility: toggle data table
	let showMapDataTable = false;
	function toggleMapDataTable() {
		showMapDataTable = !showMapDataTable;
	}

	// Geography layer toggle
	let selectedGeographyLayer: GeographyLayer = 'active';

	function setGeographyLayer(layer: GeographyLayer) {
		selectedGeographyLayer = layer;
		if (mapInitialized && mapObj) {
			mapObj.destroy?.();
			mapObj = null;
			mapInitialized = false;
			initialiseMap();
		}
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
					class={`flex flex-col rounded-md border px-4 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:gap-2 ${
						activeTab === tab.id
							? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
							: 'border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50'
					}`}
					role="tab"
					type="button"
					tabindex={activeTab === tab.id ? 0 : -1}
					aria-selected={activeTab === tab.id}
					aria-controls={`dashboard-panel-${tab.id}`}
					on:click={() => handleTabClick(index)}
					on:keydown={(event) => handleTabKeydown(event, index)}
					data-testid={`tab-${tab.id}`}
					title={tab.description}
				>
					<span>{tab.label}</span>
					{#if activeTab === tab.id}
						<span class="mt-1 text-xs font-normal text-indigo-100 sm:hidden">{tab.description}</span
						>
					{/if}
				</button>
			{/each}
		</div>

		{#each visibleTabs as tab}
			<div
				id={`dashboard-panel-${tab.id}`}
				role="tabpanel"
				aria-labelledby={`dashboard-tab-${tab.id}`}
				tabindex="0"
				class={`mt-8 ${activeTab === tab.id ? '' : 'hidden'}`}
			>
				{#if tab.id === 'overview'}
					<Card testId="overview-card" padding="lg">
						<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div class="space-y-2">
								<h2 class="text-xl font-semibold text-gray-900">Install overview</h2>
								<p class="text-sm text-gray-600" data-testid="overview-summary">
									{overviewSummary}
								</p>
								<p class="text-xs text-gray-500">
									Data combined from WAPAR Worker API and Home Assistant telemetry.
								</p>
							</div>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
								<div
									class="text-xs text-gray-600"
									data-testid="last-synced"
									title={lastSyncedTitle}
								>
									<span class="font-medium text-gray-700">Last synced:</span>
									<span class="ml-1">{lastSyncedMeta.relative}</span>
								</div>
								<Button
									variant="outline"
									disabled={isRefreshing}
									aria-busy={isRefreshing}
									testId="manual-refresh-button"
									on:click={handleManualRefresh}
								>
									{#if isRefreshing}
										Refreshing
									{:else}
										Refresh data
									{/if}
								</Button>
							</div>
						</div>
						<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							{#each overviewMetrics as metric}
								{@const isStaleCard = metric.testId === 'stale-installations'}
								<div
									class={`rounded-md border p-4 ${
										isStaleCard && isHighStale
											? 'border-amber-300 bg-amber-50'
											: metric.isPrimary
												? 'border-indigo-300 bg-indigo-50'
												: 'border-gray-200'
									}`}
									data-testid={`overview-metric-${metric.testId}`}
								>
									<div class="flex items-start justify-between">
										<p
											class={`text-xs font-medium uppercase tracking-wide ${
												isStaleCard && isHighStale
													? 'text-amber-700'
													: metric.isPrimary
														? 'text-indigo-700'
														: 'text-gray-500'
											}`}
										>
											{metric.label}
										</p>
										{#if isStaleCard && isHighStale}
											<span
												class="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800"
												title="High percentage of stale installations"
												role="status"
												aria-label={`Warning: ${formatStalePercentage(stalePercentage)} of installations are stale`}
											>
												⚠️ {formatStalePercentage(stalePercentage)}
											</span>
										{/if}
									</div>
									<p
										class={`mt-2 text-3xl font-semibold ${
											isStaleCard && isHighStale
												? 'text-amber-900'
												: metric.isPrimary
													? 'text-indigo-900'
													: 'text-gray-900'
										}`}
										data-testid={metric.testId}
									>
										{metric.value}
									</p>
									{#if metric.subtitle}
										<p
											class={`mt-1 text-xs ${
												isStaleCard && isHighStale
													? 'text-amber-600'
													: metric.isPrimary
														? 'text-indigo-600'
														: 'text-gray-500'
											}`}
										>
											{metric.subtitle}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</Card>
				{:else if tab.id === 'distribution'}
					<Card padding="lg">
						<div class="mb-6 text-center">
							<h2 class="text-xl font-semibold text-gray-900">Distribution insights</h2>
							<p class="mt-2 text-sm text-gray-600">
								Comparison of installation share between supported integrations.
							</p>
						</div>

						<!-- App totals cards -->
						<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="rounded-md border border-blue-200 bg-blue-50 p-4">
								<p class="text-xs font-medium uppercase tracking-wide text-blue-700">
									iCloud Docker
								</p>
								<p class="mt-2 text-3xl font-semibold text-blue-900">
									{formatInstallCount(data.iCloudDocker?.total ?? 0)}
								</p>
								<p class="mt-1 text-xs text-blue-600">
									{formatPercentage(data.iCloudDocker?.total ?? 0, data.totalInstallations)} of total
								</p>
							</div>
							<div class="rounded-md border border-purple-200 bg-purple-50 p-4">
								<p class="text-xs font-medium uppercase tracking-wide text-purple-700">
									Home Assistant – Bouncie
								</p>
								<p class="mt-2 text-3xl font-semibold text-purple-900">
									{formatInstallCount(data.haBouncie?.total ?? 0)}
								</p>
								<p class="mt-1 text-xs text-purple-600">
									{formatPercentage(data.haBouncie?.total ?? 0, data.totalInstallations)} of total
								</p>
							</div>
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
								<Button variant="outline" testId="export-chart-button" on:click={handleExportChart}>
									Export chart
								</Button>
							</div>
						</div>
						<div class="mx-auto w-full max-w-2xl" style="height: 400px;">
							<MarketShareChart
								bind:this={marketShareChartRef}
								iCloudDockerTotal={data.iCloudDocker?.total ?? 0}
								haBouncieTotal={data.haBouncie?.total ?? 0}
								{chartType}
								showLegend={true}
								title=""
							/>
						</div>
					</Card>
				{:else if tab.id === MAP_TAB_ID}
					<div class="space-y-6">
						<div class="text-center">
							<h2 class="text-xl font-semibold text-gray-900">Geographic coverage</h2>
							<p class="mt-2 text-sm text-gray-600">
								{geographyLayerData.description}
							</p>
						</div>

						<div class="flex justify-center">
							<div
								class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
								role="group"
								aria-label="Geography data layer"
							>
								<button
									on:click={() => setGeographyLayer('active')}
									class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedGeographyLayer ===
									'active'
										? 'bg-white text-indigo-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
									data-testid="layer-active"
									aria-pressed={selectedGeographyLayer === 'active'}>Active</button
								>
								<button
									on:click={() => setGeographyLayer('new-30d')}
									class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedGeographyLayer ===
									'new-30d'
										? 'bg-white text-indigo-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
									data-testid="layer-new-30d"
									aria-pressed={selectedGeographyLayer === 'new-30d'}>New (30d)</button
								>
								<button
									on:click={() => setGeographyLayer('all-time')}
									class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedGeographyLayer ===
									'all-time'
										? 'bg-white text-indigo-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
									data-testid="layer-all-time"
									aria-pressed={selectedGeographyLayer === 'all-time'}>All-time</button
								>
							</div>
						</div>
						<div class="flex flex-col gap-6 lg:flex-row">
							<div class="w-full lg:w-1/3">
								<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
									<h3 class="text-base font-semibold text-gray-900">Top 10 countries</h3>
									<div
										class="mt-4 space-y-2"
										role="list"
										aria-label="Top 10 countries by installations"
									>
										{#each top10Countries as country, index}
											<button
												on:click={() => highlightCountryOnMap(country.countryCode)}
												class="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
												data-testid={`country-item-${country.countryCode}`}
												aria-label={getCountryButtonLabel(
													country.countryCode,
													country.count,
													geographyLayerData.totalCount
												)}
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
														>{formatPercentage(country.count, geographyLayerData.totalCount)}</span
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
										role="img"
										aria-label="Interactive world map showing installation density by country"
										aria-describedby="map-description"
									></div>
									<div id="map-description" class="sr-only">
										World map visualization showing {geographyLayerData.countries.length} countries with
										{geographyLayerData.description.toLowerCase()}. Use keyboard navigation to
										explore countries or press the toggle button below to view the data table for
										detailed information.
									</div>

									<!-- Toggle button for map data table -->
									<div class="mt-4 text-center">
										<button
											on:click={toggleMapDataTable}
											class="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
											aria-expanded={showMapDataTable}
											aria-controls="map-data-table"
										>
											{showMapDataTable ? 'Hide' : 'Show'} country data table
										</button>
									</div>

									<!-- Accessible data table alternative for map -->
									{#if showMapDataTable}
										<div
											id="map-data-table"
											class="mt-4 overflow-x-auto max-h-96"
											role="table"
											aria-label="Country installation data"
										>
											<table class="min-w-full border border-gray-300 bg-white">
												<thead class="bg-gray-100 sticky top-0">
													<tr>
														<th
															class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
														>
															Rank
														</th>
														<th
															class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
														>
															Country
														</th>
														<th
															class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
														>
															Installations
														</th>
														<th
															class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
														>
															Share
														</th>
													</tr>
												</thead>
												<tbody>
													{#each sortedCountries as country, index}
														<tr class="border-b border-gray-200 hover:bg-gray-50">
															<td class="px-4 py-2 text-sm text-gray-600">
																#{index + 1}
															</td>
															<td class="px-4 py-2 text-sm text-gray-900">
																{getCountryName(country.countryCode)} ({country.countryCode})
															</td>
															<td class="px-4 py-2 text-sm text-gray-900 text-right">
																{country.count.toLocaleString()}
															</td>
															<td class="px-4 py-2 text-sm text-gray-900 text-right">
																{formatPercentage(country.count, geographyLayerData.totalCount)}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}
								</div>
							</div>
						</div>

						{#if data.countryInsights && data.countryInsights.countries.length > 0}
							{@const sortedInsights = [...data.countryInsights.countries].sort(
								(a, b) => b.new30d - a.new30d
							)}
							<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
								<h3 class="text-base font-semibold text-gray-900">Country health</h3>
								<p class="mt-1 text-sm text-gray-500">
									Registration volume vs active engagement — a low active rate may indicate proxy or
									datacenter registrations.
								</p>
								<div class="mt-4 overflow-x-auto" role="table" aria-label="Country health insights">
									<table class="min-w-full text-sm">
										<thead>
											<tr
												class="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
											>
												<th class="pb-2 pr-3" scope="col">Country</th>
												<th class="pb-2 pr-3 text-right" scope="col">New (30d)</th>
												<th class="pb-2 pr-3 text-right" scope="col">Share</th>
												<th class="pb-2 pr-3 text-right" scope="col">Active</th>
												<th class="pb-2 text-right" scope="col">Active rate</th>
											</tr>
										</thead>
										<tbody>
											{#each sortedInsights.slice(0, 10) as insight, index}
												<tr class="border-b border-gray-100 hover:bg-gray-50">
													<td class="py-2.5 pr-3 font-medium text-gray-900">
														<span class="mr-1.5 text-xs text-gray-400">#{index + 1}</span>
														{getCountryName(insight.countryCode)}
														<span class="ml-1 text-xs text-gray-400">({insight.countryCode})</span>
													</td>
													<td class="py-2.5 pr-3 text-right text-gray-700">
														{insight.new30d.toLocaleString()}
													</td>
													<td class="py-2.5 pr-3 text-right text-gray-500">
														{insight.new30dShare.toFixed(1)}%
													</td>
													<td class="py-2.5 pr-3 text-right text-gray-700">
														{insight.active.toLocaleString()}
													</td>
													<td class="py-2.5 text-right">
														{#if insight.new30d > 0}
															{@const rate = insight.activeRate}
															<span
																class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
																	{rate < 1
																	? 'bg-red-50 text-red-700'
																	: rate < 10
																		? 'bg-amber-50 text-amber-700'
																		: 'bg-green-50 text-green-700'}"
															>
																{rate.toFixed(1)}%
																{#if rate < 1}
																	<span class="sr-only">— low engagement</span>
																	<span aria-hidden="true" class="text-[10px]">!</span>
																{/if}
															</span>
														{:else}
															<span class="text-xs text-gray-400">—</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				{:else if tab.id === 'versions' && data.versionAnalytics}
					<Card padding="lg">
						<VersionAnalytics
							versionDistribution={data.versionAnalytics?.versionDistribution ?? []}
							latestVersion={data.versionAnalytics?.latestVersion ?? null}
							outdatedInstallations={data.versionAnalytics?.outdatedInstallations ?? 0}
							newInstallRate={data.versionAnalytics?.newInstallRate ?? {
								last7Days: 0,
								last30Days: 0
							}}
							upgradeAnalytics={data.upgradeAnalytics ?? null}
							adoptionTimeline={data.versionAnalytics?.adoptionTimeline ?? []}
							adoptionGaps={data.versionAnalytics?.adoptionGaps ?? []}
						/>
					</Card>
				{:else if tab.id === 'growth' && data.newInstallations}
					<Card padding="lg">
						<GrowthAnalytics
							summary={data.newInstallations?.summary ?? {
								totalNew: 0,
								totalReinstalls: 0,
								newUserRate: 0,
								period: '30d'
							}}
							timeline={data.newInstallations?.timeline ?? []}
							gaps={data.newInstallations?.gaps ?? []}
							topCountriesNewUsers={data.newInstallations?.topCountriesNewUsers ?? []}
						/>
					</Card>
				{:else if tab.id === 'heartbeat' && data.heartbeatAnalytics}
					<Card padding="lg">
						<HeartbeatAnalytics
							activeUsers={data.heartbeatAnalytics?.activeUsers ?? {
								daily: 0,
								weekly: 0,
								monthly: 0,
								dau_mau_ratio: 0
							}}
							engagementLevels={data.heartbeatAnalytics?.engagementLevels ?? {
								highlyActive: { count: 0, description: '>7 heartbeats/week' },
								active: { count: 0, description: '1-7 heartbeats/week' },
								occasional: { count: 0, description: 'Active in last 30d but not last 7d' },
								dormant: { count: 0, description: 'No heartbeat in 30 days' }
							}}
							timeline={data.heartbeatAnalytics?.timeline ?? []}
							gaps={data.heartbeatAnalytics?.gaps ?? []}
							healthMetrics={data.heartbeatAnalytics?.healthMetrics ?? {
								avgHeartbeatsPerUser: 0,
								avgTimeBetweenHeartbeats: '0 hours'
							}}
							churnRisk={data.heartbeatAnalytics?.churnRisk ?? {
								usersInactive7Days: 0,
								usersInactive14Days: 0,
								usersInactive30Days: 0
							}}
							syncHealth={data.heartbeatAnalytics?.syncHealth ?? {
								last7d: {
									installationsReporting: 0,
									avgSyncDurationSec: null,
									errorRate: 0,
									driveActiveCount: 0,
									photosActiveCount: 0
								},
								last30d: {
									installationsReporting: 0,
									avgSyncDurationSec: null,
									errorRate: 0,
									driveActiveCount: 0,
									photosActiveCount: 0
								}
							}}
							retention={data.heartbeatAnalytics?.retention ?? []}
						/>
					</Card>
				{:else if tab.id === 'recent' && data.recentInstallations}
					<Card padding="lg">
						<RecentInstallations
							installations={data.recentInstallations?.installations ?? []}
							total={data.recentInstallations?.total ?? 0}
							limit={data.recentInstallations?.limit ?? 20}
							offset={data.recentInstallations?.offset ?? 0}
							installationsLast24h={data.recentInstallations?.installationsLast24h ?? 0}
							installationsLast7d={data.recentInstallations?.installationsLast7d ?? 0}
							appName={data.recentInstallations?.appName ?? undefined}
						/>
					</Card>
				{:else if tab.id === 'insights'}
					<GeographicAppAnalysis
						iCloudDockerTotal={data.iCloudDocker?.total ?? 0}
						haBouncieTotal={data.haBouncie?.total ?? 0}
						countryToCount={data.countryToCount ?? []}
						appName={data.appName ?? null}
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

	:global(.svgMap-country:focus) {
		outline: 2px solid #4f46e5;
		outline-offset: 2px;
	}

	:global(.modal .card) {
		background: #ffffff !important;
		border-radius: 1.25rem !important;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		border: none !important;
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
