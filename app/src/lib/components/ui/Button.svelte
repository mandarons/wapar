<script lang="ts">
	/**
	 * Button component - Standardized button following WAPAR design system
	 *
	 * Variants:
	 * - primary: Primary action button
	 * - secondary: Secondary action button
	 * - outline: Outlined button
	 * - ghost: Minimal button
	 *
	 * All variants meet AA contrast requirements
	 */
	export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let disabled = false;
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let testId: string | undefined = undefined;

	$: sizeClass = {
		sm: 'px-3 py-1.5 text-body-sm',
		md: 'px-4 py-2 text-body',
		lg: 'px-6 py-3 text-body-lg'
	}[size];

	$: variantClass = {
		primary:
			'bg-wapar-primary-600 text-white hover:bg-wapar-primary-700 focus-visible:ring-wapar-primary-500',
		secondary:
			'bg-wapar-secondary-600 text-white hover:bg-wapar-secondary-700 focus-visible:ring-wapar-secondary-500',
		outline:
			'border border-wapar-gray-300 text-wapar-gray-700 hover:bg-wapar-gray-50 focus-visible:ring-wapar-gray-500',
		ghost: 'text-wapar-gray-700 hover:bg-wapar-gray-100 focus-visible:ring-wapar-gray-500'
	}[variant];
</script>

<button
	{type}
	{disabled}
	class="inline-flex items-center justify-center rounded-button font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 {variantClass} {sizeClass}"
	data-testid={testId}
	on:click
	{...$$restProps}
>
	<slot />
</button>
