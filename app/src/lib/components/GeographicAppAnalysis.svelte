<script lang="ts">
	import { getCountryName } from '$lib/utils/countries';

	export let iCloudDockerTotal: number;
	export let haBouncieTotal: number;
	export let countryToCount: { countryCode: string; count: number }[];
	export let appName: string | null = null;

	type AppLayer = 'both' | 'icloud' | 'bouncie';

	let selectedLayer: AppLayer =
		appName === 'icloud-docker' ? 'icloud' : appName === 'ha-bouncie' ? 'bouncie' : 'both';

	$: totalInstallations = iCloudDockerTotal + haBouncieTotal;

	// When a specific app is selected via global filter, the countryToCount data is already
	// filtered server-side. Use it directly instead of proportional estimates.
	$: isAppFiltered = appName === 'icloud-docker' || appName === 'ha-bouncie';

	// Calculate country distribution - use real data when app is filtered
	$: countryData = countryToCount.map((country) => {
		if (isAppFiltered) {
			// Real per-app data from the server
			const appCount = country.count;
			const appTotal = appName === 'icloud-docker' ? iCloudDockerTotal : haBouncieTotal;
			return {
				countryCode: country.countryCode,
				count: country.count,
				iCloudEstimate: appName === 'icloud-docker' ? appCount : 0,
				bouncieEstimate: appName === 'ha-bouncie' ? appCount : 0,
				iCloudPercentage:
					appName === 'icloud-docker' && appTotal > 0 ? (appCount / appTotal) * 100 : 0,
				bounciePercentage:
					appName === 'ha-bouncie' && appTotal > 0 ? (appCount / appTotal) * 100 : 0
			};
		}
		// Proportional estimation when showing all apps
		let iCloudEstimate = 0;
		let bouncieEstimate = 0;
		if (totalInstallations > 0) {
			iCloudEstimate = Math.round((country.count * iCloudDockerTotal) / totalInstallations);
			bouncieEstimate = Math.round((country.count * haBouncieTotal) / totalInstallations);
		}
		return {
			countryCode: country.countryCode,
			count: country.count,
			iCloudEstimate,
			bouncieEstimate,
			iCloudPercentage: iCloudDockerTotal > 0 ? (iCloudEstimate / iCloudDockerTotal) * 100 : 0,
			bounciePercentage: haBouncieTotal > 0 ? (bouncieEstimate / haBouncieTotal) * 100 : 0
		};
	});

	// Get top countries by app
	$: topICloudCountries = [...countryData]
		.sort((a, b) => b.iCloudEstimate - a.iCloudEstimate)
		.filter((c) => c.iCloudEstimate > 0)
		.slice(0, 5);
	$: topBouncieCountries = [...countryData]
		.sort((a, b) => b.bouncieEstimate - a.bouncieEstimate)
		.filter((c) => c.bouncieEstimate > 0)
		.slice(0, 5);

	// Auto-select layer when app filter is active
	$: if (isAppFiltered && selectedLayer === 'both') {
		selectedLayer = appName === 'icloud-docker' ? 'icloud' : 'bouncie';
	}
</script>

<div
	class="bg-white rounded-card shadow-card p-card-padding border border-wapar-gray-200"
	data-testid="geographic-analysis"
>
	<h3 class="text-heading-md text-wapar-gray-900 mb-4">Geographic App Distribution Analysis</h3>

	<p class="text-body text-wapar-gray-600 mb-6">
		Estimated regional distribution based on proportional market share. Toggle between views to
		compare app-specific geographic patterns.
	</p>

	<!-- Layer Toggle -->
	{#if !isAppFiltered}
		<div class="flex justify-center mb-6">
			<div
				class="inline-flex rounded-button border border-wapar-gray-300 bg-wapar-gray-50 p-1"
				role="group"
				aria-label="Application filter"
			>
				<button
					on:click={() => (selectedLayer = 'both')}
					class="px-4 py-2 text-body font-medium rounded-button transition-colors {selectedLayer ===
					'both'
						? 'bg-white text-wapar-secondary-600 shadow-sm'
						: 'text-wapar-gray-700 hover:text-wapar-gray-900'}"
					data-testid="layer-both"
					aria-pressed={selectedLayer === 'both'}
				>
					Both Apps
				</button>
				<button
					on:click={() => (selectedLayer = 'icloud')}
					class="px-4 py-2 text-body font-medium rounded-button transition-colors {selectedLayer ===
					'icloud'
						? 'bg-white text-wapar-secondary-600 shadow-sm'
						: 'text-wapar-gray-700 hover:text-wapar-gray-900'}"
					data-testid="layer-icloud"
					aria-pressed={selectedLayer === 'icloud'}
				>
					iCloud Docker
				</button>
				<button
					on:click={() => (selectedLayer = 'bouncie')}
					class="px-4 py-2 text-body font-medium rounded-button transition-colors {selectedLayer ===
					'bouncie'
						? 'bg-white text-wapar-primary-600 shadow-sm'
						: 'text-wapar-gray-700 hover:text-wapar-gray-900'}"
					data-testid="layer-bouncie"
					aria-pressed={selectedLayer === 'bouncie'}
				>
					HA Bouncie
				</button>
			</div>
		</div>
	{/if}

	<!-- Analysis Content -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- iCloud Docker Top Countries -->
		{#if selectedLayer === 'both' || selectedLayer === 'icloud'}
			<div class="bg-wapar-secondary-50 rounded-card p-4 border border-wapar-secondary-200">
				<h4 class="text-heading-sm text-wapar-secondary-900 mb-3">
					iCloud Docker - Top 5 Countries
				</h4>
				<div class="space-y-2">
					{#each topICloudCountries as country, index}
						<div
							class="flex items-center justify-between bg-white rounded p-2 border border-wapar-secondary-100"
							data-testid="icloud-country-{country.countryCode}"
						>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-wapar-secondary-600 w-6">#{index + 1}</span>
								<span class="text-body font-medium">{getCountryName(country.countryCode)}</span>
							</div>
							<div class="text-right">
								<div class="text-body font-semibold text-wapar-secondary-600">
									{#if isAppFiltered}{country.iCloudEstimate.toLocaleString()}{:else}~{country.iCloudEstimate.toLocaleString()}{/if}
								</div>
								<div class="text-body-sm text-wapar-gray-600">
									{country.iCloudPercentage.toFixed(1)}%
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- HA Bouncie Top Countries -->
		{#if selectedLayer === 'both' || selectedLayer === 'bouncie'}
			<div class="bg-wapar-primary-50 rounded-card p-4 border border-wapar-primary-200">
				<h4 class="text-heading-sm text-wapar-primary-900 mb-3">HA Bouncie - Top 5 Countries</h4>
				<div class="space-y-2">
					{#each topBouncieCountries as country, index}
						<div
							class="flex items-center justify-between bg-white rounded p-2 border border-wapar-primary-100"
							data-testid="bouncie-country-{country.countryCode}"
						>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-wapar-primary-600 w-6">#{index + 1}</span>
								<span class="text-body font-medium">{getCountryName(country.countryCode)}</span>
							</div>
							<div class="text-right">
								<div class="text-body font-semibold text-wapar-primary-600">
									{#if isAppFiltered}{country.bouncieEstimate.toLocaleString()}{:else}~{country.bouncieEstimate.toLocaleString()}{/if}
								</div>
								<div class="text-body-sm text-wapar-gray-600">
									{country.bounciePercentage.toFixed(1)}%
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Regional Insights -->
	<div class="mt-6 bg-wapar-info-50 rounded-card p-4 border border-wapar-info-200">
		<h4 class="text-heading-sm text-wapar-gray-900 mb-3">Regional Insights</h4>
		<div class="space-y-2 text-body text-wapar-gray-700">
			<p>
				<span class="font-semibold">Market Coverage:</span>
				{#if isAppFiltered}Filtered to {appName === 'icloud-docker'
						? 'iCloud Docker'
						: 'HA Bouncie'} —
				{/if}{countryToCount.length} countries worldwide.
			</p>
			<p>
				<span class="font-semibold">Distribution Note:</span>
				{#if isAppFiltered}Country-level data shown is real (filtered by application).{:else}Country-level
					app breakdowns are estimated proportionally based on overall market share. Actual regional
					preferences may vary.{/if}
			</p>
			<p>
				<span class="font-semibold">Geographic Diversity:</span> Distributed user base reduces regional
				dependency and increases resilience.
			</p>
		</div>
	</div>
</div>
