<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal, initializeStores } from '@skeletonlabs/skeleton';
	import { goto, afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	initializeStores();

	type AppFilter = '' | 'icloud-docker' | 'ha-bouncie';
	const APP_OPTIONS: { value: AppFilter; label: string }[] = [
		{ value: '', label: 'All apps' },
		{ value: 'icloud-docker', label: 'iCloud Docker' },
		{ value: 'ha-bouncie', label: 'HA Bouncie' }
	];

	let selectedApp: AppFilter = '';

	// Sync selector from URL on navigation
	afterNavigate(() => {
		const urlApp = $page.url.searchParams.get('app') || '';
		if (urlApp !== selectedApp) {
			selectedApp = urlApp as AppFilter;
		}
	});

	function handleAppChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedApp = (select.value || '') as AppFilter;
		const url = new URL($page.url);
		if (selectedApp) {
			url.searchParams.set('app', selectedApp);
		} else {
			url.searchParams.delete('app');
		}
		goto(url, { replaceState: true, keepFocus: true });
	}
</script>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<a href="/">
					<img src="/favicon.svg" alt="Wapar" class="w-16 h-16" />
				</a>
				<strong class="text-xl uppercase">Wapar</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<div class="flex items-center gap-4">
					<label for="app-filter" class="sr-only">Filter by application</label>
					<select
						id="app-filter"
						value={selectedApp}
						on:change={handleAppChange}
						class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
						data-testid="app-filter-select"
					>
						{#each APP_OPTIONS as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<a href="https://github.com/mandarons" target="_blank">
						<img data-testid="github.svg" src="/github.svg" alt="Github" class="w-12 h-12" />
					</a>
				</div>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>

<Modal />
