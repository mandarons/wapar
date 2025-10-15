<script lang="ts">
	export let iCloudDockerTotal: number;
	export let haBouncieTotal: number;
	export let iCloudDockerGrowth: number | null = null;
	export let haBouncieGrowth: number | null = null;

	$: totalInstallations = iCloudDockerTotal + haBouncieTotal;
	$: iCloudPercentage =
		totalInstallations > 0 ? ((iCloudDockerTotal / totalInstallations) * 100).toFixed(1) : '0.0';
	$: bounciePercentage =
		totalInstallations > 0 ? ((haBouncieTotal / totalInstallations) * 100).toFixed(1) : '0.0';

	function formatGrowth(growth: number | null): string {
		if (growth === null) return 'N/A';
		const sign = growth > 0 ? '+' : '';
		return `${sign}${growth.toFixed(1)}%`;
	}

	function getGrowthColor(growth: number | null): string {
		if (growth === null) return 'text-gray-500';
		if (growth > 0) return 'text-green-600';
		if (growth < 0) return 'text-red-600';
		return 'text-gray-500';
	}

	function getGrowthIcon(growth: number | null): string {
		if (growth === null) return '—';
		if (growth > 0) return '📈';
		if (growth < 0) return '📉';
		return '➡️';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="app-comparison-cards">
	<!-- iCloud Drive Docker Card -->
	<div
		class="card bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-blue-200 p-6"
		data-testid="icloud-docker-card"
	>
		<div class="flex flex-col space-y-4">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-bold text-blue-900">iCloud Drive Docker</h3>
				<span class="text-3xl">☁️</span>
			</div>

			<!-- Total Installations -->
			<div class="border-b border-blue-300 pb-4">
				<p class="text-sm text-blue-700 mb-1 uppercase tracking-wide font-semibold">
					Total Installations
				</p>
				<p class="text-4xl font-bold text-blue-600" data-testid="icloud-total">
					{iCloudDockerTotal.toLocaleString()}
				</p>
			</div>

			<!-- Market Share -->
			<div class="border-b border-blue-300 pb-4">
				<p class="text-sm text-blue-700 mb-1 uppercase tracking-wide font-semibold">
					Market Share
				</p>
				<div class="flex items-baseline gap-2">
					<p class="text-3xl font-bold text-blue-600" data-testid="icloud-percentage">
						{iCloudPercentage}%
					</p>
					<p class="text-sm text-blue-700">of total market</p>
				</div>
			</div>

			<!-- Growth Indicator -->
			{#if iCloudDockerGrowth !== null}
				<div>
					<p class="text-sm text-blue-700 mb-1 uppercase tracking-wide font-semibold">
						Growth Trend
					</p>
					<div class="flex items-center gap-2">
						<span class="text-2xl">{getGrowthIcon(iCloudDockerGrowth)}</span>
						<p
							class="text-2xl font-bold {getGrowthColor(iCloudDockerGrowth)}"
							data-testid="icloud-growth"
						>
							{formatGrowth(iCloudDockerGrowth)}
						</p>
					</div>
				</div>
			{/if}

			<!-- Visual Progress Bar -->
			<div class="pt-2">
				<div class="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
					<div
						class="bg-blue-600 h-3 rounded-full transition-all duration-500"
						style="width: {iCloudPercentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Home Assistant - Bouncie Card -->
	<div
		class="card bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-green-200 p-6"
		data-testid="ha-bouncie-card"
	>
		<div class="flex flex-col space-y-4">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-bold text-green-900">Home Assistant - Bouncie</h3>
				<span class="text-3xl">🏠</span>
			</div>

			<!-- Total Installations -->
			<div class="border-b border-green-300 pb-4">
				<p class="text-sm text-green-700 mb-1 uppercase tracking-wide font-semibold">
					Total Installations
				</p>
				<p class="text-4xl font-bold text-green-600" data-testid="bouncie-total">
					{haBouncieTotal.toLocaleString()}
				</p>
			</div>

			<!-- Market Share -->
			<div class="border-b border-green-300 pb-4">
				<p class="text-sm text-green-700 mb-1 uppercase tracking-wide font-semibold">
					Market Share
				</p>
				<div class="flex items-baseline gap-2">
					<p class="text-3xl font-bold text-green-600" data-testid="bouncie-percentage">
						{bounciePercentage}%
					</p>
					<p class="text-sm text-green-700">of total market</p>
				</div>
			</div>

			<!-- Growth Indicator -->
			{#if haBouncieGrowth !== null}
				<div>
					<p class="text-sm text-green-700 mb-1 uppercase tracking-wide font-semibold">
						Growth Trend
					</p>
					<div class="flex items-center gap-2">
						<span class="text-2xl">{getGrowthIcon(haBouncieGrowth)}</span>
						<p
							class="text-2xl font-bold {getGrowthColor(haBouncieGrowth)}"
							data-testid="bouncie-growth"
						>
							{formatGrowth(haBouncieGrowth)}
						</p>
					</div>
				</div>
			{/if}

			<!-- Visual Progress Bar -->
			<div class="pt-2">
				<div class="w-full bg-green-200 rounded-full h-3 overflow-hidden">
					<div
						class="bg-green-600 h-3 rounded-full transition-all duration-500"
						style="width: {bounciePercentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Competitive Summary -->
<div
	class="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200"
	data-testid="competitive-summary"
>
	<h3 class="text-lg font-semibold text-gray-900 mb-4">🏆 Competitive Analysis</h3>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div class="flex items-start space-x-3">
			<span class="text-2xl">📊</span>
			<div>
				<p class="font-semibold text-gray-900">Market Leader</p>
				<p class="text-gray-600 text-sm">
					{#if iCloudDockerTotal > haBouncieTotal}
						iCloud Drive Docker leads with {(
							parseFloat(iCloudPercentage) - parseFloat(bounciePercentage)
						).toFixed(1)}% more market share
					{:else if haBouncieTotal > iCloudDockerTotal}
						Home Assistant - Bouncie leads with {(
							parseFloat(bounciePercentage) - parseFloat(iCloudPercentage)
						).toFixed(1)}% more market share
					{:else}
						Both applications have equal market share
					{/if}
				</p>
			</div>
		</div>

		<div class="flex items-start space-x-3">
			<span class="text-2xl">🎯</span>
			<div>
				<p class="font-semibold text-gray-900">Total Market Size</p>
				<p class="text-gray-600 text-sm">
					Combined {totalInstallations.toLocaleString()} installations across both applications
				</p>
			</div>
		</div>
	</div>
</div>
