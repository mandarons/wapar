import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		commonjsOptions: {
			transformMixedEsModules: true
		}
	},
	plugins: [sveltekit(), purgeCss()]
});
