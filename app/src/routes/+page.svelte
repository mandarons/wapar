<script lang="ts">
	import { onMount } from 'svelte';
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mapObj: any = null;
	const modalStore = getModalStore();

	// Calculate top countries and statistics
	$: sortedCountries = [...data.countryToCount].sort((a, b) => b.count - a.count);
	$: top10Countries = sortedCountries.slice(0, 10);

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
			buttonTextCancel: 'Close'
		};
		modalStore.trigger(modal);
	}

	function handleCountryClick(countryCode: string) {
		showCountryDetails(countryCode);
	}

	function highlightCountryOnMap(countryCode: string) {
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

	onMount(async () => {
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
</script>

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

	/* Fix modal background transparency */
	:global(.modal) {
		background-color: rgba(0, 0, 0, 0.8) !important;
	}

	:global(.modal-content) {
		background-color: rgb(var(--color-surface-900)) !important;
		border: 1px solid rgb(var(--color-surface-700)) !important;
	}

	:global(.modal .card) {
		background-color: rgb(var(--color-surface-900)) !important;
	}
</style>
