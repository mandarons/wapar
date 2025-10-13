<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import 'svgmap/dist/svgMap.min.css';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';

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
	let refreshInterval: number = 300000; // 5 minutes default
	let intervalId: number | null = null;
	let lastUpdated: Date = new Date();
	let isRefreshing = false;
	let isTabVisible = true;
	let dataFreshness: 'fresh' | 'moderate' | 'stale' = 'fresh';

	// Fetch data from API
	async function fetchData() {
		try {
			isRefreshing = true;
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
			updateDataFreshness();
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			isRefreshing = false;
		}
	}

	// Manual refresh
	async function handleManualRefresh() {
		await fetchData();
	}

	// Update data freshness indicator
	function updateDataFreshness() {
		const now = new Date();
		const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);

		if (diffMinutes < 5) {
			dataFreshness = 'fresh';
		} else if (diffMinutes < 15) {
			dataFreshness = 'moderate';
		} else {
			dataFreshness = 'stale';
		}
	}

	// Get relative time string
	function getRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMinutes < 1) return 'just now';
		if (diffMinutes === 1) return '1 minute ago';
		if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
		if (diffHours === 1) return '1 hour ago';
		if (diffHours < 24) return `${diffHours} hours ago`;
		if (diffDays === 1) return '1 day ago';
		return `${diffDays} days ago`;
	}

	// Handle visibility change
	function handleVisibilityChange() {
		if (typeof document !== 'undefined') {
			isTabVisible = !document.hidden;
			if (isTabVisible && intervalId) {
				// Resume auto-refresh when tab becomes visible
				updateDataFreshness();
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
			updateDataFreshness();
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
		updateDataFreshness();

		// Update relative time display every 30 seconds
		relativeTimeIntervalId = window.setInterval(() => {
			relativeTimeDisplay = getRelativeTime(lastUpdated);
			updateDataFreshness();
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

	// Update relative time display periodically
	let relativeTimeDisplay = '';
	$: relativeTimeDisplay = getRelativeTime(lastUpdated);

	// Update freshness indicator color
	$: freshnessColor =
		dataFreshness === 'fresh'
			? 'text-green-600'
			: dataFreshness === 'moderate'
				? 'text-yellow-600'
				: 'text-red-600';

	$: freshnessIndicator =
		dataFreshness === 'fresh' ? '🟢' : dataFreshness === 'moderate' ? '🟡' : '🔴';
</script>

<!-- Auto-Refresh Controls -->
<section class="body-font text-gray-600 border-b border-gray-200">
	<div class="container mx-auto px-5 py-4">
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
						<option value={300000}>5 min</option>
						<option value={900000}>15 min</option>
						<option value={1800000}>30 min</option>
						<option value={3600000}>1 hour</option>
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
