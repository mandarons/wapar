<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import 'svgmap/dist/svgMap.min.css';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import {
		getRelativeTime,
		calculateDataFreshness,
		getFreshnessColor,
		getFreshnessIndicator,
		REFRESH_INTERVALS,
		type DataFreshness
	} from '$lib/utils/refresh';
	import {
		calculateAllMetrics,
		getPerformanceRating,
		getDiversityRating,
		formatPercentage,
		formatScore
	} from '$lib/analytics';

	export let data: {
		totalInstallations: number;
		monthlyActive: number;
		createdAt: string;
		countryToCount: { countryCode: string; count: number }[];
		iCloudDocker: { total: number };
		haBouncie: { total: number };
	};

	// Minimal interface for svgmap object (add methods/properties as needed)
	interface SvgMap {
		// Add properties/methods as used in this file, e.g. destroy(), etc.
		destroy?: () => void;
		// Add more as needed
	}
	let mapObj: SvgMap | null = null;
	const modalStore = getModalStore();

	// Auto-refresh state
	let refreshInterval: number = REFRESH_INTERVALS.FIVE_MIN;
	let intervalId: number | null = null;
	let lastUpdated: Date = new Date();
	let isRefreshing = false;
	let isTabVisible = true;
	let dataFreshness: DataFreshness = 'fresh';
	let fetchError: string | null = null;

	// Fetch data from API
	async function fetchData() {
		try {
			isRefreshing = true;
			fetchError = null;
			const waparRes = await fetch('https://wapar-api.mandarons.com/api/usage');
			const waparData = await waparRes.json();
			const haRes = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
			const haData = await haRes.json();

			data = {
				...waparData,
				totalInstallations: haData.bouncie.total + waparData.iCloudDocker.total,
				haBouncie: haData.bouncie
			};

			lastUpdated = new Date();
			dataFreshness = calculateDataFreshness(lastUpdated);
		} catch (error) {
			console.error('Error fetching data:', error);
			fetchError = 'Failed to refresh data. Please try again later.';
		} finally {
			isRefreshing = false;
		}
	}

	// Manual refresh
	async function handleManualRefresh() {
		fetchError = null;
		await fetchData();
	}

	// Handle visibility change
	function handleVisibilityChange() {
		if (typeof document !== 'undefined') {
			isTabVisible = !document.hidden;
			if (isTabVisible && intervalId) {
				// Resume auto-refresh when tab becomes visible
				dataFreshness = calculateDataFreshness(lastUpdated);
			}
		}
	}

	// Start auto-refresh
	function startAutoRefresh() {
		if (intervalId) {
			clearInterval(intervalId);
		}

		intervalId = window.setInterval(() => {
			if (isTabVisible) {
				fetchData();
			}
			dataFreshness = calculateDataFreshness(lastUpdated);
		}, refreshInterval);
	}

	// Handle interval change
	function handleIntervalChange(newInterval: number) {
		refreshInterval = newInterval;
		startAutoRefresh();
	}

	// Calculate top countries and statistics
	$: sortedCountries = [...data.countryToCount].sort((a, b) => b.count - a.count);
	$: top10Countries = sortedCountries.slice(0, 10);

	// Calculate engagement health metrics
	$: engagementRatio =
		data.totalInstallations > 0 ? (data.monthlyActive / data.totalInstallations) * 100 : 0;
	$: healthStatus =
		engagementRatio > 50
			? {
					color: 'text-green-600',
					bgColor: 'bg-green-100',
					indicator: '🟢',
					label: 'Excellent',
					description: 'High user engagement'
				}
			: engagementRatio >= 25
				? {
						color: 'text-yellow-600',
						bgColor: 'bg-yellow-100',
						indicator: '🟡',
						label: 'Good',
						description: 'Moderate user engagement'
					}
				: {
						color: 'text-red-600',
						bgColor: 'bg-red-100',
						indicator: '🔴',
						label: 'Needs Attention',
						description: 'Low user engagement'
					};

	// Advanced Analytics Calculations
	$: advancedMetrics = calculateAllMetrics(
		data.monthlyActive,
		data.totalInstallations,
		data.countryToCount
	);
	$: penetrationRating = getPerformanceRating(advancedMetrics.marketPenetrationScore);
	$: diversityRating = getDiversityRating(advancedMetrics.geographicDiversityIndex);

	// Get country name from country code (using basic mapping for common codes)
	function getCountryName(code: string): string {
		const countryNames: { [key: string]: string } = {
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
		const countryData = data.countryToCount.find((c) => c.countryCode === countryCode);
		if (!countryData) return;

		const countryName = getCountryName(countryCode);
		const percentage = ((countryData.count / data.totalInstallations) * 100).toFixed(2);
		const ranking = sortedCountries.findIndex((c) => c.countryCode === countryCode) + 1;

		// Estimate monthly active users proportionally (since we don't have per-country data)
		const estimatedMonthlyActive = Math.round(
			(countryData.count / data.totalInstallations) * data.monthlyActive
		);
		const engagementRate =
			data.totalInstallations > 0
				? ((estimatedMonthlyActive / countryData.count) * 100).toFixed(1)
				: '0';

		const modal: ModalSettings = {
			type: 'alert',
			title: `${countryName} (${countryCode})`,
			body: `
				<div class="space-y-3">
					<div class="flex justify-between">
						<span class="font-semibold">Total Installations:</span>
						<span>${countryData.count.toLocaleString()}</span>
					</div>
					<div class="flex justify-between">
						<span class="font-semibold">Percentage of Global:</span>
						<span>${percentage}%</span>
					</div>
					<div class="flex justify-between">
						<span class="font-semibold">Est. Monthly Active:</span>
						<span>${estimatedMonthlyActive.toLocaleString()}</span>
					</div>
					<div class="flex justify-between">
						<span class="font-semibold">Engagement Rate:</span>
						<span>${engagementRate}%</span>
					</div>
					<div class="flex justify-between">
						<span class="font-semibold">Global Ranking:</span>
						<span>#${ranking} of ${data.countryToCount.length}</span>
					</div>
				</div>
			`,
			modalClasses:
				'!bg-white !text-slate-900 rounded-3xl shadow-2xl border border-slate-200 px-6 py-6',
			backdropClasses: '!bg-black/40 backdrop-blur-sm',
			buttonTextCancel: 'Close'
		};
		modalStore.trigger(modal);
	}

	function handleCountryClick(countryCode: string) {
		showCountryDetails(countryCode);
	}

	function highlightCountryOnMap(countryCode: string) {
		// Validate countryCode to prevent CSS injection
		if (!/^[A-Za-z0-9]{2,3}$/.test(countryCode)) {
			console.warn('Invalid country code:', countryCode);
			return;
		}
		// Find the SVG element for the country and add visual highlight
		const svgElement = document.querySelector(`[data-id="${countryCode}"]`);
		if (svgElement) {
			// Remove previous highlights
			document.querySelectorAll('.svgMap-country').forEach((el) => {
				el.classList.remove('country-highlighted');
			});
			// Add highlight to clicked country
			svgElement.classList.add('country-highlighted');
			showCountryDetails(countryCode);
		}
	}

	// Timer for updating relative time display
	let relativeTimeIntervalId: number | null = null;

	onMount(async () => {
		// Initialize auto-refresh
		document.addEventListener('visibilitychange', handleVisibilityChange);
		startAutoRefresh();
		dataFreshness = calculateDataFreshness(lastUpdated);

		// Update relative time display and freshness every 30 seconds
		relativeTimeIntervalId = window.setInterval(() => {
			dataFreshness = calculateDataFreshness(lastUpdated);
		}, 30000);

		// Initialize map
		if (!mapObj) {
			const module = await import('svgmap');
			const svgMap = module.default;
			mapObj = new svgMap({
				targetElementID: 'svgMap',
				minZoom: 1,
				maxZoom: 3,
				initialZoom: 1,
				showContinentSelector: false,
				zoomScaleSensitivity: 1,
				showZoomReset: false,
				mouseWheelZoomEnabled: true,
				mouseWheelZoomWithKey: false,
				mouseWheelZoomKeyMessage: 'Not enabled',
				mouseWheelKeyMessageMac: 'Not enabled',
				flagType: 'emoji',
				noDataText: 'No installations detected',
				colorMax: '#050000',
				colorMin: '#ffb3b3',
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
				callback: (id: string) => {
					handleCountryClick(id);
				}
			});
		}
	});

	onDestroy(() => {
		// Clean up auto-refresh
		if (intervalId) {
			clearInterval(intervalId);
		}
		if (relativeTimeIntervalId) {
			clearInterval(relativeTimeIntervalId);
		}
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		}
	});

	// Reactive values
	$: relativeTimeDisplay = getRelativeTime(lastUpdated);
	$: freshnessColor = getFreshnessColor(dataFreshness);
	$: freshnessIndicator = getFreshnessIndicator(dataFreshness);
</script>

<!-- Auto-Refresh Controls -->
<section class="body-font text-gray-600 border-b border-gray-200">
	<div class="container mx-auto px-5 py-4">
		{#if fetchError}
			<div class="mb-3 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
				⚠️ {fetchError}
			</div>
		{/if}
		<div class="flex flex-col sm:flex-row justify-between items-center gap-4">
			<!-- Data Freshness Indicator -->
			<div class="flex items-center gap-2" data-testid="freshness-indicator">
				<span class="text-2xl">{freshnessIndicator}</span>
				<div class="text-sm">
					<span class="font-medium {freshnessColor}">Last Updated:</span>
					<span class="ml-1" data-testid="last-updated-time">{relativeTimeDisplay}</span>
				</div>
			</div>

			<!-- Refresh Controls -->
			<div class="flex items-center gap-4">
				<!-- Interval Selector -->
				<div class="flex items-center gap-2">
					<label for="refresh-interval" class="text-sm font-medium">Auto-refresh:</label>
					<select
						id="refresh-interval"
						data-testid="refresh-interval-selector"
						bind:value={refreshInterval}
						on:change={() => handleIntervalChange(refreshInterval)}
						class="btn variant-ghost-surface text-sm px-3 py-1 rounded border border-gray-300"
					>
						<option value={REFRESH_INTERVALS.FIVE_MIN}>5 min</option>
						<option value={REFRESH_INTERVALS.FIFTEEN_MIN}>15 min</option>
						<option value={REFRESH_INTERVALS.THIRTY_MIN}>30 min</option>
						<option value={REFRESH_INTERVALS.ONE_HOUR}>1 hour</option>
					</select>
				</div>

				<!-- Manual Refresh Button -->
				<button
					data-testid="manual-refresh-button"
					on:click={handleManualRefresh}
					disabled={isRefreshing}
					class="btn variant-filled-primary text-sm px-4 py-2 rounded {isRefreshing
						? 'opacity-50 cursor-not-allowed'
						: ''}"
				>
					{#if isRefreshing}
						<span class="inline-block animate-spin mr-2">⟳</span>
						Refreshing...
					{:else}
						<span class="mr-2">🔄</span>
						Refresh Now
					{/if}
				</button>
			</div>
		</div>
	</div>
</section>

<section class="body-font text-gray-600">
	<div class="container mx-auto px-5 py-5">
		<div class="mb-5 flex w-full flex-col text-center">
			<h1 class="title-font mb-4 text-2xl font-medium text-gray-900 sm:text-3xl">
				Application Installations
			</h1>
		</div>
		<div class="-m-5 flex text-center justify-between">
			<div class="w-1/2 p-4">
				<h2
					data-testid="total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.totalInstallations}
				</h2>
				<p class="leading-relaxed">Total Installations</p>
			</div>
			<div class="w-1/2 p-4">
				<h2
					data-testid="icloud-drive-docker-total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.iCloudDocker.total}
				</h2>
				<p class="leading-relaxed">iCloud Drive Docker</p>
			</div>
			<div class="w-1/2 p-4">
				<h2
					data-testid="ha-bouncie-total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.haBouncie.total}
				</h2>
				<p class="leading-relaxed">Home Assistant - Bouncie</p>
			</div>
		</div>
	</div>
</section>

<!-- Engagement Health Dashboard -->
<section class="body-font text-gray-600">
	<div class="container mx-auto px-5 py-5">
		<div class="mb-5 flex w-full flex-col text-center">
			<h2 class="title-font mb-2 text-xl font-medium text-gray-900 sm:text-2xl">
				Engagement Health
			</h2>
			<p class="text-sm text-gray-600">Monthly active vs total installations</p>
		</div>
		<div class="flex justify-center">
			<div class="w-full max-w-2xl">
				<div
					class="card p-6 {healthStatus.bgColor} rounded-lg shadow-md"
					data-testid="engagement-health-dashboard"
				>
					<div class="flex flex-col items-center space-y-4">
						<!-- Health Indicator -->
						<div class="text-6xl" data-testid="health-indicator">
							{healthStatus.indicator}
						</div>

						<!-- Engagement Ratio -->
						<div class="text-center">
							<div class="{healthStatus.color} text-5xl font-bold" data-testid="engagement-ratio">
								{engagementRatio.toFixed(1)}%
							</div>
							<p class="text-lg font-medium {healthStatus.color} mt-2" data-testid="health-status">
								{healthStatus.label}
							</p>
							<p class="text-sm text-gray-700 mt-1">
								{healthStatus.description}
							</p>
						</div>

						<!-- Breakdown -->
						<div class="w-full border-t border-gray-300 pt-4 mt-4">
							<div class="flex justify-around text-center">
								<div>
									<div
										class="text-2xl font-semibold text-gray-900"
										data-testid="monthly-active-count"
									>
										{data.monthlyActive.toLocaleString()}
									</div>
									<p class="text-xs text-gray-600">Monthly Active</p>
								</div>
								<div class="text-3xl text-gray-400">÷</div>
								<div>
									<div
										class="text-2xl font-semibold text-gray-900"
										data-testid="total-installations-count"
									>
										{data.totalInstallations.toLocaleString()}
									</div>
									<p class="text-xs text-gray-600">Total Installations</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Advanced Analytics Dashboard -->
<section class="body-font text-gray-600 border-t border-gray-200">
	<div class="container mx-auto px-5 py-10">
		<div class="mb-8 flex w-full flex-col text-center">
			<h2 class="title-font mb-2 text-xl font-medium text-gray-900 sm:text-2xl">
				Advanced Analytics
			</h2>
			<p class="text-sm text-gray-600">Sophisticated performance metrics and market insights</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Install-to-Activity Conversion Rate -->
			<div
				class="card p-6 bg-blue-50 rounded-lg shadow-md hover:shadow-lg transition-shadow"
				data-testid="conversion-rate-card"
			>
				<div class="flex flex-col space-y-3">
					<div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Conversion Rate
					</div>
					<div class="text-4xl font-bold text-blue-600" data-testid="conversion-rate-value">
						{formatPercentage(advancedMetrics.installToActivityRate)}
					</div>
					<div class="text-xs text-gray-600">
						Install-to-activity conversion showing active user engagement
					</div>
					<div class="mt-2 pt-3 border-t border-blue-200">
						<div class="text-xs text-gray-500">
							<span class="font-semibold">Industry Benchmark:</span> 20-30%
						</div>
					</div>
				</div>
			</div>

			<!-- Geographic Diversity Index -->
			<div
				class="card p-6 bg-purple-50 rounded-lg shadow-md hover:shadow-lg transition-shadow"
				data-testid="diversity-index-card"
			>
				<div class="flex flex-col space-y-3">
					<div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Geographic Diversity
					</div>
					<div class="text-4xl font-bold text-purple-600" data-testid="diversity-index-value">
						{(advancedMetrics.geographicDiversityIndex * 100).toFixed(1)}%
					</div>
					<div class="text-xs {diversityRating.color} font-medium">
						{diversityRating.label}: {diversityRating.description}
					</div>
					<div class="mt-2 pt-3 border-t border-purple-200">
						<div class="text-xs text-gray-500">
							<span class="font-semibold">Distribution:</span> Across {data.countryToCount.length} countries
						</div>
					</div>
				</div>
			</div>

			<!-- Engagement Quality Score -->
			<div
				class="card p-6 bg-teal-50 rounded-lg shadow-md hover:shadow-lg transition-shadow"
				data-testid="quality-score-card"
			>
				<div class="flex flex-col space-y-3">
					<div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Engagement Quality
					</div>
					<div class="text-4xl font-bold text-teal-600" data-testid="quality-score-value">
						{(advancedMetrics.engagementQualityScore * 100).toFixed(1)}%
					</div>
					<div class="text-xs text-gray-600">
						Composite score combining engagement rate and market diversity
					</div>
					<div class="mt-2 pt-3 border-t border-teal-200">
						<div class="text-xs text-gray-500">
							<span class="font-semibold">Formula:</span> Engagement × (1 + Diversity)
						</div>
					</div>
				</div>
			</div>

			<!-- Market Penetration Score -->
			<div
				class="card p-6 {penetrationRating.bgColor} rounded-lg shadow-md hover:shadow-lg transition-shadow"
				data-testid="penetration-score-card"
			>
				<div class="flex flex-col space-y-3">
					<div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Market Penetration
					</div>
					<div class="flex items-center gap-2">
						<span class="text-3xl">{penetrationRating.indicator}</span>
						<span
							class="text-4xl font-bold {penetrationRating.color}"
							data-testid="penetration-score-value"
						>
							{formatScore(advancedMetrics.marketPenetrationScore)}
						</span>
					</div>
					<div class="text-xs {penetrationRating.color} font-medium">
						{penetrationRating.label}: {penetrationRating.description}
					</div>
					<div class="mt-2 pt-3 border-t border-gray-300">
						<div class="text-xs text-gray-500">
							<span class="font-semibold">Benchmark:</span> vs SaaS industry standards
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Performance Insights -->
		<div class="mt-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">📊 Performance Insights</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div class="flex items-start space-x-3">
					<span class="text-2xl">💡</span>
					<div>
						<p class="font-semibold text-gray-900">Engagement Analysis</p>
						<p class="text-gray-600">
							{#if advancedMetrics.installToActivityRate > 50}
								Your app demonstrates excellent user retention, significantly exceeding industry
								standards of 20-30% engagement.
							{:else if advancedMetrics.installToActivityRate >= 25}
								Your app shows solid engagement rates within industry benchmarks. Consider
								strategies to increase active user retention.
							{:else}
								Engagement rate is below industry averages. Focus on user activation and retention
								strategies to improve monthly active users.
							{/if}
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<span class="text-2xl">🌍</span>
					<div>
						<p class="font-semibold text-gray-900">Market Distribution</p>
						<p class="text-gray-600">
							{#if advancedMetrics.geographicDiversityIndex >= 0.7}
								Excellent geographic distribution reduces market risk and indicates broad appeal
								across multiple regions.
							{:else if advancedMetrics.geographicDiversityIndex >= 0.5}
								Good market diversification with room to expand into additional geographic markets.
							{:else}
								Market concentration in few countries presents opportunity for geographic expansion.
							{/if}
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<span class="text-2xl">⭐</span>
					<div>
						<p class="font-semibold text-gray-900">Quality Score</p>
						<p class="text-gray-600">
							The engagement quality score of {(
								advancedMetrics.engagementQualityScore * 100
							).toFixed(0)}% reflects combined strength of user engagement and geographic reach.
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<span class="text-2xl">🎯</span>
					<div>
						<p class="font-semibold text-gray-900">Competitive Position</p>
						<p class="text-gray-600">
							{#if advancedMetrics.marketPenetrationScore >= 80}
								Outstanding market performance placing you in the top tier of Home Assistant
								integrations.
							{:else if advancedMetrics.marketPenetrationScore >= 60}
								Above-average market position with strong foundation for continued growth.
							{:else}
								Opportunity to improve market position through enhanced user engagement and
								retention.
							{/if}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Comparative Benchmarks -->
		<div
			class="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200"
		>
			<h3 class="text-lg font-semibold text-gray-900 mb-4">📈 Comparative Benchmarks</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-gray-700">Your Engagement Rate:</span>
					<span class="text-sm font-bold text-blue-600">
						{formatPercentage(advancedMetrics.installToActivityRate)}
					</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-2">
					<div
						class="bg-blue-600 h-2 rounded-full transition-all duration-500"
						style="width: {Math.min(advancedMetrics.installToActivityRate, 100)}%"
					></div>
				</div>

				<div class="grid grid-cols-3 gap-2 mt-4 text-xs text-center">
					<div class="bg-white rounded p-2 border border-gray-200">
						<div class="font-semibold text-gray-900">Typical SaaS</div>
						<div class="text-red-600 font-bold">20-30%</div>
					</div>
					<div class="bg-white rounded p-2 border border-gray-200">
						<div class="font-semibold text-gray-900">Good Performance</div>
						<div class="text-yellow-600 font-bold">40-50%</div>
					</div>
					<div class="bg-white rounded p-2 border border-gray-200">
						<div class="font-semibold text-gray-900">Excellent</div>
						<div class="text-green-600 font-bold">&gt;50%</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Map and Top Countries Section -->
<div class="container mx-auto px-5 pb-20">
	<div class="flex flex-col lg:flex-row gap-6 items-start">
		<!-- Top 10 Countries Sidebar -->
		<div class="w-full lg:w-1/4 order-2 lg:order-1">
			<div class="card p-4 variant-ghost-primary">
				<h2 class="h3 mb-4 font-bold text-center">Top 10 Countries</h2>
				<div class="space-y-2">
					{#each top10Countries as country, index}
						<button
							class="w-full btn variant-soft hover:variant-filled-primary text-left transition-all"
							on:click={() => highlightCountryOnMap(country.countryCode)}
							data-testid="country-item-{country.countryCode}"
						>
							<div class="flex items-center justify-between w-full">
								<div class="flex items-center gap-2">
									<span class="font-bold text-primary-500">#{index + 1}</span>
									<span class="text-lg">{country.countryCode}</span>
								</div>
								<div class="text-right">
									<div class="font-semibold">{country.count.toLocaleString()}</div>
									<div class="text-xs opacity-75">
										{((country.count / data.totalInstallations) * 100).toFixed(1)}%
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Map -->
		<div class="w-full lg:w-3/4 order-1 lg:order-2">
			<div id="svgMap" class="w-full" data-testid="interactive-map"></div>
		</div>
	</div>
</div>

<div class="fixed bottom-0 w-full">
	<div class="flex items-center justify-between p-4">
		<div class="flex items-center"></div>
		<div class="flex items-end space-x-4">
			<p class="text-xs font-medium text-gray-600">Copyright &copy; 2023 Mandar Patil</p>
		</div>
	</div>
</div>

<style>
	:global(.country-highlighted) {
		stroke: #0fba81 !important;
		stroke-width: 2 !important;
		filter: brightness(1.2);
	}

	:global(.svgMap-country) {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.svgMap-country:hover) {
		filter: brightness(1.1);
		stroke: #0fba81;
		stroke-width: 1.5;
	}

	/* Apple-style modal box: white with 90% opacity (10% transparency) and rounded corners */
	:global(.modal-content),
	:global(.modal .card) {
		background: rgba(255, 255, 255, 0.9) !important; /* 90% opacity (10% transparency) over white */
		border-radius: 24px !important; /* Apple-style rounded corners */
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		border: none !important;
		backdrop-filter: blur(8px);
	}
</style>
