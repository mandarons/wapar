<script lang="ts">
	import type { DataSnapshot } from '../historicalData';

	export let snapshots: DataSnapshot[];
	export let title: string = 'Installation Growth';
	export let height: number = 300;
	export let showMonthlyActive: boolean = true;

	// Calculate chart dimensions with margins
	const margin = { top: 40, right: 80, bottom: 60, left: 80 };
	$: width = typeof window !== 'undefined' ? Math.min(window.innerWidth - 100, 1000) : 900;
	$: chartWidth = width - margin.left - margin.right;
	$: chartHeight = height - margin.top - margin.bottom;

	// Hover state
	let hoveredIndex: number | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	// Check for reduced motion preference
	let prefersReducedMotion = false;
	if (typeof window !== 'undefined') {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	// Accessibility: Show data table
	let showDataTable = false;

	// Calculate scales and paths
	$: {
		if (snapshots.length === 0) {
			maxInstallations = 0;
			minInstallations = 0;
			totalPath = '';
			activePath = '';
		} else {
			// Find min/max for y-axis
			maxInstallations = Math.max(
				...snapshots.map((s) => s.totalInstallations),
				...snapshots.map((s) => s.monthlyActive)
			);
			minInstallations = Math.min(
				...snapshots.map((s) => s.totalInstallations),
				...snapshots.map((s) => s.monthlyActive)
			);

			// Add 10% padding to y-axis
			const padding = (maxInstallations - minInstallations) * 0.1;
			maxInstallations += padding;
			minInstallations = Math.max(0, minInstallations - padding);

			// Generate SVG paths
			totalPath = generatePath(snapshots.map((s) => s.totalInstallations));
			activePath = showMonthlyActive ? generatePath(snapshots.map((s) => s.monthlyActive)) : '';
		}
	}

	let maxInstallations = 0;
	let minInstallations = 0;
	let totalPath = '';
	let activePath = '';

	function generatePath(values: number[]): string {
		if (values.length === 0) return '';

		const points = values.map((value, index) => {
			const x = (index / Math.max(values.length - 1, 1)) * chartWidth;
			const y =
				chartHeight -
				((value - minInstallations) / (maxInstallations - minInstallations)) * chartHeight;
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
	}

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	}

	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function handleMouseMove(event: MouseEvent, index: number) {
		hoveredIndex = index;
		const svg = event.currentTarget as SVGElement;
		const rect = svg.getBoundingClientRect();
		tooltipX = event.clientX - rect.left;
		tooltipY = event.clientY - rect.top;
	}

	function handleMouseLeave() {
		hoveredIndex = null;
	}

	// Accessibility: Generate textual summary
	$: chartSummary =
		snapshots.length > 0
			? `Installation growth trend chart showing ${snapshots.length} data points from ${formatDate(snapshots[0].timestamp)} to ${formatDate(snapshots[snapshots.length - 1].timestamp)}. Latest total installations: ${formatNumber(snapshots[snapshots.length - 1].totalInstallations)}${showMonthlyActive ? `, monthly active: ${formatNumber(snapshots[snapshots.length - 1].monthlyActive)}` : ''}.`
			: 'No historical data available yet.';

	function toggleDataTable() {
		showDataTable = !showDataTable;
	}

	// Keyboard navigation for data points
	function handleDataPointKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			hoveredIndex = index;
		}
	}

	// Y-axis ticks
	$: yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
		value: minInstallations + (maxInstallations - minInstallations) * ratio,
		y: chartHeight - ratio * chartHeight
	}));

	// X-axis ticks (show ~5 dates)
	$: xTicks =
		snapshots.length > 0
			? Array.from({ length: Math.min(5, snapshots.length) }, (_, i) => {
					const index = Math.floor((i / 4) * (snapshots.length - 1));
					return {
						date: snapshots[index].timestamp,
						x: (index / Math.max(snapshots.length - 1, 1)) * chartWidth
					};
				})
			: [];
</script>

{#if snapshots.length === 0}
	<div
		class="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
		style="height: {height}px"
		data-testid="trend-chart-empty"
	>
		<div class="text-center text-gray-500">
			<p class="text-lg font-medium">No Historical Data Yet</p>
			<p class="text-sm mt-2">Visit the dashboard daily to build historical trends</p>
		</div>
	</div>
{:else}
	<div class="trend-chart-container" data-testid="trend-chart">
		<!-- Accessibility: Screen reader description -->
		<div class="sr-only" id="trend-chart-description" aria-live="polite">
			{chartSummary}
		</div>

		<h3 class="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
		<svg
			{width}
			{height}
			class="trend-chart"
			on:mouseleave={handleMouseLeave}
			role="img"
			aria-label="Installation growth trend chart"
			aria-describedby="trend-chart-description"
		>
			<g transform="translate({margin.left}, {margin.top})">
				<!-- Grid lines -->
				{#each yTicks as tick}
					<line
						x1="0"
						y1={tick.y}
						x2={chartWidth}
						y2={tick.y}
						stroke="#e5e7eb"
						stroke-width="1"
						stroke-dasharray="4,4"
					/>
				{/each}

				<!-- Y-axis -->
				<line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#6b7280" stroke-width="2" />

				<!-- X-axis -->
				<line
					x1="0"
					y1={chartHeight}
					x2={chartWidth}
					y2={chartHeight}
					stroke="#6b7280"
					stroke-width="2"
				/>

				<!-- Y-axis labels -->
				{#each yTicks as tick}
					<text x="-10" y={tick.y + 5} text-anchor="end" class="text-xs fill-gray-600">
						{formatNumber(tick.value)}
					</text>
				{/each}

				<!-- X-axis labels -->
				{#each xTicks as tick}
					<text x={tick.x} y={chartHeight + 20} text-anchor="middle" class="text-xs fill-gray-600">
						{formatDate(tick.date)}
					</text>
				{/each}

				<!-- Area under total installations line -->
				<path
					d="{totalPath} L {chartWidth},{chartHeight} L 0,{chartHeight} Z"
					fill="url(#totalGradient)"
					opacity="0.2"
				/>

				<!-- Total installations line -->
				<path d={totalPath} fill="none" stroke="#3b82f6" stroke-width="3" />

				{#if showMonthlyActive}
					<!-- Area under monthly active line -->
					<path
						d="{activePath} L {chartWidth},{chartHeight} L 0,{chartHeight} Z"
						fill="url(#activeGradient)"
						opacity="0.2"
					/>

					<!-- Monthly active line -->
					<path
						d={activePath}
						fill="none"
						stroke="#10b981"
						stroke-width="3"
						stroke-dasharray="5,5"
					/>
				{/if}

				<!-- Data points (interactive) -->
				{#each snapshots as snapshot, index}
					{@const x = (index / Math.max(snapshots.length - 1, 1)) * chartWidth}
					{@const y =
						chartHeight -
						((snapshot.totalInstallations - minInstallations) /
							(maxInstallations - minInstallations)) *
							chartHeight}
					<circle
						cx={x}
						cy={y}
						r={hoveredIndex === index ? 6 : 4}
						fill="#3b82f6"
						stroke="white"
						stroke-width="2"
						class={prefersReducedMotion ? 'cursor-pointer' : 'cursor-pointer transition-all'}
						on:mouseenter={(e) => handleMouseMove(e, index)}
						on:keydown={(e) => handleDataPointKeydown(e, index)}
						role="button"
						tabindex="0"
						aria-label="Data point for {formatDate(snapshot.timestamp)}: {formatNumber(
							snapshot.totalInstallations
						)} total installations{showMonthlyActive
							? `, ${formatNumber(snapshot.monthlyActive)} monthly active`
							: ''}"
					/>
				{/each}

				<!-- Tooltip -->
				{#if hoveredIndex !== null && snapshots[hoveredIndex]}
					{@const snapshot = snapshots[hoveredIndex]}
					<g
						transform="translate({tooltipX - margin.left}, {tooltipY - margin.top})"
						class="pointer-events-none"
					>
						<rect
							x="-80"
							y="-70"
							width="160"
							height="60"
							fill="white"
							stroke="#e5e7eb"
							stroke-width="1"
							rx="4"
							class="drop-shadow-lg"
						/>
						<text x="0" y="-50" text-anchor="middle" class="text-xs font-semibold fill-gray-800">
							{formatDate(snapshot.timestamp)}
						</text>
						<text x="0" y="-35" text-anchor="middle" class="text-xs fill-blue-600">
							Total: {formatNumber(snapshot.totalInstallations)}
						</text>
						{#if showMonthlyActive}
							<text x="0" y="-20" text-anchor="middle" class="text-xs fill-green-600">
								Active: {formatNumber(snapshot.monthlyActive)}
							</text>
						{/if}
					</g>
				{/if}

				<!-- Gradients -->
				<defs>
					<linearGradient id="totalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.4" />
						<stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
					</linearGradient>
					<linearGradient id="activeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:#10b981;stop-opacity:0.4" />
						<stop offset="100%" style="stop-color:#10b981;stop-opacity:0" />
					</linearGradient>
				</defs>
			</g>
		</svg>

		<!-- Legend -->
		<div class="flex justify-center gap-6 mt-4 text-sm">
			<div class="flex items-center gap-2">
				<div class="w-8 h-0.5 bg-blue-500" aria-hidden="true"></div>
				<span class="text-gray-700">Total Installations</span>
			</div>
			{#if showMonthlyActive}
				<div class="flex items-center gap-2">
					<div
						class="w-8 h-0.5 bg-green-500 border-dashed"
						style="border-top: 2px dashed #10b981; background: none;"
						aria-hidden="true"
					></div>
					<span class="text-gray-700">Monthly Active</span>
				</div>
			{/if}
		</div>

		<!-- Toggle button for data table -->
		<div class="mt-4 text-center">
			<button
				on:click={toggleDataTable}
				class="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
				aria-expanded={showDataTable}
				aria-controls="trend-data-table"
			>
				{showDataTable ? 'Hide' : 'Show'} data table
			</button>
		</div>

		<!-- Accessible data table alternative -->
		{#if showDataTable}
			<div
				id="trend-data-table"
				class="mt-4 overflow-x-auto"
				role="table"
				aria-label="Installation growth data"
			>
				<table class="min-w-full border border-gray-300 bg-white">
					<thead class="bg-gray-100">
						<tr>
							<th
								class="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300"
							>
								Date
							</th>
							<th
								class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
							>
								Total Installations
							</th>
							{#if showMonthlyActive}
								<th
									class="px-4 py-2 text-right text-sm font-semibold text-gray-900 border-b border-gray-300"
								>
									Monthly Active
								</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each snapshots as snapshot}
							<tr class="border-b border-gray-200">
								<td class="px-4 py-2 text-sm text-gray-900">
									{formatDate(snapshot.timestamp)}
								</td>
								<td class="px-4 py-2 text-sm text-gray-900 text-right">
									{snapshot.totalInstallations.toLocaleString()}
								</td>
								{#if showMonthlyActive}
									<td class="px-4 py-2 text-sm text-gray-900 text-right">
										{snapshot.monthlyActive.toLocaleString()}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}

<style>
	.trend-chart-container {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.trend-chart {
		overflow: visible;
	}

	/* Screen reader only class */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
