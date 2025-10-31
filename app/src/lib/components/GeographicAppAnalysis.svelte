<script lang="ts">
	export let iCloudDockerTotal: number;
	export let haBouncieTotal: number;
	export let countryToCount: { countryCode: string; count: number }[];

	type AppLayer = 'both' | 'icloud' | 'bouncie';

	let selectedLayer: AppLayer = 'both';

	$: totalInstallations = iCloudDockerTotal + haBouncieTotal;

	// Calculate estimated app-specific country distribution
	// Since we don't have per-country app breakdowns, we'll use proportional estimation
	$: estimatedCountryData = countryToCount.map((country) => {
		let iCloudEstimate = 0;
		let bouncieEstimate = 0;
		if (totalInstallations > 0) {
			iCloudEstimate = Math.round(
				(country.count * iCloudDockerTotal) / totalInstallations
			);
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
	$: topICloudCountries = [...estimatedCountryData]
		.sort((a, b) => b.iCloudEstimate - a.iCloudEstimate)
		.slice(0, 5);
	$: topBouncieCountries = [...estimatedCountryData]
		.sort((a, b) => b.bouncieEstimate - a.bouncieEstimate)
		.slice(0, 5);

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
</script>

<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200" data-testid="geographic-analysis">
	<h3 class="text-lg font-semibold text-gray-900 mb-4">
		<span aria-hidden="true">🌍</span>
		<span class="sr-only">Globe icon:</span>
		Geographic App Distribution Analysis
	</h3>

	<p class="text-sm text-gray-600 mb-6">
		Estimated regional distribution based on proportional market share. Toggle between views to
		compare app-specific geographic patterns.
	</p>

	<!-- Layer Toggle -->
	<div class="flex justify-center mb-6">
		<div class="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1" role="group" aria-label="Application filter">
			<button
				on:click={() => (selectedLayer = 'both')}
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedLayer === 'both'
					? 'bg-white text-blue-600 shadow-sm'
					: 'text-gray-700 hover:text-gray-900'}"
				data-testid="layer-both"
				aria-pressed={selectedLayer === 'both'}
			>
				<span aria-hidden="true">📊</span>
				<span class="sr-only">Chart icon:</span>
				Both Apps
			</button>
			<button
				on:click={() => (selectedLayer = 'icloud')}
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedLayer === 'icloud'
					? 'bg-white text-blue-600 shadow-sm'
					: 'text-gray-700 hover:text-gray-900'}"
				data-testid="layer-icloud"
				aria-pressed={selectedLayer === 'icloud'}
			>
				<span aria-hidden="true">☁️</span>
				<span class="sr-only">Cloud icon:</span>
				iCloud Docker
			</button>
			<button
				on:click={() => (selectedLayer = 'bouncie')}
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedLayer === 'bouncie'
					? 'bg-white text-green-600 shadow-sm'
					: 'text-gray-700 hover:text-gray-900'}"
				data-testid="layer-bouncie"
				aria-pressed={selectedLayer === 'bouncie'}
			>
				<span aria-hidden="true">🏠</span>
				<span class="sr-only">House icon:</span>
				HA Bouncie
			</button>
		</div>
	</div>

	<!-- Analysis Content -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- iCloud Docker Top Countries -->
		{#if selectedLayer === 'both' || selectedLayer === 'icloud'}
			<div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
				<h4 class="text-md font-semibold text-blue-900 mb-3 flex items-center gap-2">
					<span class="text-xl" aria-hidden="true">☁️</span>
					<span class="sr-only">Cloud icon:</span>
					iCloud Docker - Top 5 Countries
				</h4>
				<div class="space-y-2">
					{#each topICloudCountries as country, index}
						<div
							class="flex items-center justify-between bg-white rounded p-2 border border-blue-100"
							data-testid="icloud-country-{country.countryCode}"
						>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-blue-600 w-6">#{index + 1}</span>
								<span class="text-sm font-medium">{getCountryName(country.countryCode)}</span>
							</div>
							<div class="text-right">
								<div class="text-sm font-semibold text-blue-600">
									~{country.iCloudEstimate.toLocaleString()}
								</div>
								<div class="text-xs text-gray-600">
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
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h4 class="text-md font-semibold text-green-900 mb-3 flex items-center gap-2">
					<span class="text-xl" aria-hidden="true">🏠</span>
					<span class="sr-only">House icon:</span>
					HA Bouncie - Top 5 Countries
				</h4>
				<div class="space-y-2">
					{#each topBouncieCountries as country, index}
						<div
							class="flex items-center justify-between bg-white rounded p-2 border border-green-100"
							data-testid="bouncie-country-{country.countryCode}"
						>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-green-600 w-6">#{index + 1}</span>
								<span class="text-sm font-medium">{getCountryName(country.countryCode)}</span>
							</div>
							<div class="text-right">
								<div class="text-sm font-semibold text-green-600">
									~{country.bouncieEstimate.toLocaleString()}
								</div>
								<div class="text-xs text-gray-600">
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
	<div class="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-gray-200">
		<h4 class="text-md font-semibold text-gray-900 mb-3">
			<span aria-hidden="true">💡</span>
			<span class="sr-only">Light bulb icon:</span>
			Regional Insights
		</h4>
		<div class="space-y-2 text-sm text-gray-700">
			<p>
				<span class="font-semibold">Market Coverage:</span> Both apps collectively serve
				{countryToCount.length} countries worldwide.
			</p>
			<p>
				<span class="font-semibold">Distribution Note:</span> Country-level app breakdowns are estimated
				proportionally based on overall market share. Actual regional preferences may vary.
			</p>
			<p>
				<span class="font-semibold">Geographic Diversity:</span> Distributed user base reduces regional
				dependency and increases resilience.
			</p>
		</div>
	</div>
</div>

<style>
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
