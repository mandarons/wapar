<script lang="ts">
	import { getRelativeTime } from '$lib/utils/refresh';

	export let installations: Array<{
		id: string;
		appName: string;
		appVersion: string;
		countryCode: string | null;
		region: string | null;
		createdAt: string;
	}> = [];
	export let total: number = 0;
	export let limit: number = 50;
	export let offset: number = 0;
	export let installationsLast24h: number = 0;
	export let installationsLast7d: number = 0;

	// Event dispatchers for pagination
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	/**
	 * Convert country code to emoji flag
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 */
	function getCountryFlag(countryCode: string | null): string {
		if (!countryCode || countryCode.length !== 2) {
			return '🌍'; // Globe emoji for unknown/missing country
		}

		// Convert country code to regional indicator symbols
		// A = U+1F1E6, B = U+1F1E7, etc.
		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);

		return String.fromCodePoint(...codePoints);
	}

	/**
	 * Get location display string
	 */
	function getLocationDisplay(
		countryCode: string | null,
		region: string | null
	): string {
		if (region) {
			return region;
		}
		if (countryCode) {
			return countryCode;
		}
		return 'Unknown';
	}

	function handlePrevious() {
		if (offset > 0) {
			dispatch('paginate', { offset: Math.max(0, offset - limit) });
		}
	}

	function handleNext() {
		if (offset + limit < total) {
			dispatch('paginate', { offset: offset + limit });
		}
	}

	$: hasNext = offset + limit < total;
	$: hasPrevious = offset > 0;
	$: currentPage = Math.floor(offset / limit) + 1;
	$: totalPages = Math.ceil(total / limit);
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="h3">Recent Installations</h3>
		<div class="text-sm text-surface-600">
			<span class="badge variant-filled-success">
				{installationsLast24h} in last 24h
			</span>
			<span class="badge variant-filled-primary ml-2">
				{installationsLast7d} in last 7d
			</span>
		</div>
	</div>

	{#if installations.length === 0}
		<div class="text-center py-8 text-surface-600">
			<p>No recent installations found</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each installations as install (install.id)}
				<div class="flex items-center justify-between p-3 bg-surface-100 rounded hover:bg-surface-200 transition-colors">
					<div class="flex items-center gap-3">
						<span class="text-2xl" title={install.countryCode || 'Unknown'}>
							{getCountryFlag(install.countryCode)}
						</span>
						<div>
							<div class="font-semibold">
								{install.appName}
								<span class="text-sm text-surface-600">v{install.appVersion}</span>
							</div>
							<div class="text-sm text-surface-600">
								{getLocationDisplay(install.countryCode, install.region)}
							</div>
						</div>
					</div>
					<div class="text-sm text-surface-600">
						{getRelativeTime(new Date(install.createdAt))}
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination controls -->
		<div class="flex justify-between items-center mt-4">
			<button
				class="btn btn-sm variant-ghost"
				on:click={handlePrevious}
				disabled={!hasPrevious}
			>
				← Previous
			</button>
			<div class="text-sm text-surface-600">
				Page {currentPage} of {totalPages} ({total} total)
			</div>
			<button
				class="btn btn-sm variant-ghost"
				on:click={handleNext}
				disabled={!hasNext}
			>
				Next →
			</button>
		</div>
	{/if}
</div>
