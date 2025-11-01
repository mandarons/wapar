<script lang="ts">
	/**
	 * Card component - Standardized card container following WAPAR design system
	 *
	 * Variants:
	 * - default: Standard white card with border
	 * - elevated: Card with hover effect
	 * - flat: Card without shadow
	 *
	 * AA contrast compliant colors and accessible markup
	 */
	export let variant: 'default' | 'elevated' | 'flat' = 'default';
	export let padding: 'sm' | 'md' | 'lg' = 'md';
	export let testId: string | undefined = undefined;

	$: paddingClass = {
		sm: 'p-4',
		md: 'p-card-padding',
		lg: 'p-6'
	}[padding];

	$: variantClass = {
		default: 'bg-white border border-wapar-gray-200 shadow-card',
		elevated:
			'bg-white border border-wapar-gray-200 shadow-card hover:shadow-card-hover transition-shadow',
		flat: 'bg-white border border-wapar-gray-200'
	}[variant];
</script>

<div
	class="rounded-card {variantClass} {paddingClass}"
	data-testid={testId}
	role="region"
	{...$$restProps}
>
	<slot />
</div>
