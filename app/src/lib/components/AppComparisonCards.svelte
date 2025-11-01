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
		if (growth === null) return 'text-wapar-gray-500';
		if (growth > 0) return 'text-wapar-success-600';
		if (growth < 0) return 'text-wapar-error-600';
		return 'text-wapar-gray-500';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="app-comparison-cards">
	<!-- iCloud Docker Card -->
	<div
		class="bg-wapar-secondary-50 rounded-card shadow-card hover:shadow-card-hover transition-shadow border border-wapar-secondary-200 p-card-padding"
		data-testid="icloud-docker-card"
	>
		<div class="flex flex-col space-y-4">
			<!-- Header -->
			<div>
				<h3 class="text-heading-md text-wapar-secondary-900">iCloud Docker</h3>
			</div>

			<!-- Total Installations -->
			<div class="border-b border-wapar-secondary-200 pb-4">
				<p class="text-body-sm text-wapar-secondary-700 mb-1 uppercase tracking-wide font-semibold">
					Total Installations
				</p>
				<p class="text-4xl font-bold text-wapar-secondary-600" data-testid="icloud-total">
					{iCloudDockerTotal.toLocaleString()}
				</p>
			</div>

			<!-- Market Share -->
			<div class="border-b border-wapar-secondary-200 pb-4">
				<p class="text-body-sm text-wapar-secondary-700 mb-1 uppercase tracking-wide font-semibold">Market Share</p>
				<div class="flex items-baseline gap-2">
					<p class="text-3xl font-bold text-wapar-secondary-600" data-testid="icloud-percentage">
						{iCloudPercentage}%
					</p>
					<p class="text-body text-wapar-secondary-700">of total market</p>
				</div>
			</div>

			<!-- Growth Indicator -->
			{#if iCloudDockerGrowth !== null}
				<div>
					<p class="text-body-sm text-wapar-secondary-700 mb-1 uppercase tracking-wide font-semibold">
						Growth Trend
					</p>
					<p
						class="text-2xl font-bold {getGrowthColor(iCloudDockerGrowth)}"
						data-testid="icloud-growth"
					>
						{formatGrowth(iCloudDockerGrowth)}
					</p>
				</div>
			{/if}

			<!-- Visual Progress Bar -->
			<div class="pt-2">
				<div class="w-full bg-wapar-secondary-200 rounded-full h-3 overflow-hidden">
					<div
						class="bg-wapar-secondary-600 h-3 rounded-full transition-all duration-500"
						style="width: {iCloudPercentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Home Assistant - Bouncie Card -->
	<div
		class="bg-wapar-primary-50 rounded-card shadow-card hover:shadow-card-hover transition-shadow border border-wapar-primary-200 p-card-padding"
		data-testid="ha-bouncie-card"
	>
		<div class="flex flex-col space-y-4">
			<!-- Header -->
			<div>
				<h3 class="text-heading-md text-wapar-primary-900">Home Assistant - Bouncie</h3>
			</div>

			<!-- Total Installations -->
			<div class="border-b border-wapar-primary-200 pb-4">
				<p class="text-body-sm text-wapar-primary-700 mb-1 uppercase tracking-wide font-semibold">
					Total Installations
				</p>
				<p class="text-4xl font-bold text-wapar-primary-600" data-testid="bouncie-total">
					{haBouncieTotal.toLocaleString()}
				</p>
			</div>

			<!-- Market Share -->
			<div class="border-b border-wapar-primary-200 pb-4">
				<p class="text-body-sm text-wapar-primary-700 mb-1 uppercase tracking-wide font-semibold">
					Market Share
				</p>
				<div class="flex items-baseline gap-2">
					<p class="text-3xl font-bold text-wapar-primary-600" data-testid="bouncie-percentage">
						{bounciePercentage}%
					</p>
					<p class="text-body text-wapar-primary-700">of total market</p>
				</div>
			</div>

			<!-- Growth Indicator -->
			{#if haBouncieGrowth !== null}
				<div>
					<p class="text-body-sm text-wapar-primary-700 mb-1 uppercase tracking-wide font-semibold">
						Growth Trend
					</p>
					<p
						class="text-2xl font-bold {getGrowthColor(haBouncieGrowth)}"
						data-testid="bouncie-growth"
					>
						{formatGrowth(haBouncieGrowth)}
					</p>
				</div>
			{/if}

			<!-- Visual Progress Bar -->
			<div class="pt-2">
				<div class="w-full bg-wapar-primary-200 rounded-full h-3 overflow-hidden">
					<div
						class="bg-wapar-primary-600 h-3 rounded-full transition-all duration-500"
						style="width: {bounciePercentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Competitive Summary -->
<div
	class="mt-6 bg-white rounded-card shadow-card p-card-padding border border-wapar-gray-200"
	data-testid="competitive-summary"
>
	<h3 class="text-heading-md text-wapar-gray-900 mb-4">Competitive Analysis</h3>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<p class="font-semibold text-wapar-gray-900">Market Leader</p>
			<p class="text-wapar-gray-600 text-body">
				{#if iCloudDockerTotal > haBouncieTotal}
					iCloud Docker leads with {(
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

		<div>
			<p class="font-semibold text-wapar-gray-900">Total Market Size</p>
			<p class="text-wapar-gray-600 text-body">
				Combined {totalInstallations.toLocaleString()} installations across both applications
			</p>
		</div>
	</div>
</div>
