<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal, initializeStores } from '@skeletonlabs/skeleton';

	initializeStores();
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
				<a href="https://github.com/mandarons" target="_blank">
					<img data-testid="github.svg" src="/github.svg" alt="Github" class="w-12 h-12" />
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>

<Modal />
