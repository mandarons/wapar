<script lang="ts">
	import { goto } from '$app/navigation';
	import { getRelativeTime } from '$lib/utils/refresh';
	import { getCountryName } from '$lib/utils/countries';
	import { getPaginationInfo, RECENT_PAGE_SIZE } from '$lib/pagination';

	export let installations: Array<{
		id: string;
		appName: string;
		appVersion: string;
		countryCode: string | null;
		region: string | null;
		createdAt: string;
	}> = [];
	export let total: number = 0;
	export let limit: number = RECENT_PAGE_SIZE;
	export let offset: number = 0;
	export let installationsLast24h: number = 0;
	export let installationsLast7d: number = 0;
	export let appName: string | undefined = undefined;

	const APP_FILTER_OPTIONS = [
		{ value: '', label: 'All apps' },
		{ value: 'icloud-docker', label: 'iCloud Docker' },
		{ value: 'ha-bouncie', label: 'HA Bouncie' }
	];

	function getCountryFlag(countryCode: string | null): string {
		if (!countryCode || countryCode.length !== 2) {
			return '🌍';
		}
		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
		return String.fromCodePoint(...codePoints);
	}

	function getLocationDisplay(countryCode: string | null, region: string | null): string {
		if (region) return region;
		if (countryCode) return countryCode;
		return 'Unknown';
	}

	$: paginationInfo = getPaginationInfo({ offset, pageSize: limit, total });

	function buildUrl(newOffset: number, newAppName: string | undefined): string {
		const params = new URLSearchParams();
		if (newOffset > 0) params.set('offset', String(newOffset));
		if (newAppName) params.set('appName', newAppName);
		const qs = params.toString();
		return `/${qs ? `?${qs}` : ''}#recent`;
	}

	function handlePrevious() {
		if (paginationInfo.prevOffset !== null) {
			goto(buildUrl(paginationInfo.prevOffset, appName), { replaceState: true });
		}
	}

	function handleNext() {
		if (paginationInfo.nextOffset !== null) {
			goto(buildUrl(paginationInfo.nextOffset, appName), { replaceState: true });
		}
	}

	function handleFilterChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const newAppName = select.value || undefined;
		goto(buildUrl(0, newAppName), { replaceState: true });
	}
</script>

<div class="card p-4">
	<div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
		<h3 class="h3">Recent Installations</h3>
		<div class="flex flex-wrap items-center gap-2">
			<label for="recent-app-filter" class="text-sm text-surface-600 sr-only">
				Filter by app
			</label>
			<select
				id="recent-app-filter"
				class="rounded border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
				value={appName ?? ''}
				on:change={handleFilterChange}
				data-testid="recent-app-filter"
			>
				{#each APP_FILTER_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<span class="badge variant-filled-success">
				{installationsLast24h} in last 24h
			</span>
			<span class="badge variant-filled-primary">
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
				<div
					class="flex items-center justify-between p-3 bg-surface-100 rounded hover:bg-surface-200 transition-colors"
				>
					<div class="flex items-center gap-3">
						<span
							class="text-2xl"
							aria-label="{getCountryName(install.countryCode)} flag"
							title={getCountryName(install.countryCode)}
						>
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

		<div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mt-4">
			<div class="text-sm text-surface-600">
				Showing {paginationInfo.startIndex}-{paginationInfo.endIndex} of {total}
				installations
				{#if paginationInfo.totalPages > 1}
					(Page {paginationInfo.currentPage} of {paginationInfo.totalPages})
				{/if}
			</div>
			{#if paginationInfo.totalPages > 1}
				<div class="flex items-center gap-2">
					<button
						class="rounded border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
						disabled={paginationInfo.prevOffset === null}
						on:click={handlePrevious}
						aria-label="Go to previous page"
						data-testid="recent-prev-page"
					>
						Previous
					</button>
					<button
						class="rounded border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
						disabled={paginationInfo.nextOffset === null}
						on:click={handleNext}
						aria-label="Go to next page"
						data-testid="recent-next-page"
					>
						Next
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
