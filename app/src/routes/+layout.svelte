<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar } from '@skeletonlabs/skeleton';
</script>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<img src="/favicon.svg" alt="Wapar" class="w-16 h-16" />
				<strong class="text-xl uppercase">Wapar</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a href="https://github.com/mandarons" target="_blank">
					<img src="/github.svg" alt="Github" class="w-12 h-12" />
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
