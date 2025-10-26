<script lang="ts">
	export let versionDistribution: Array<{
		version: string;
		count: number;
		percentage: number;
	}> = [];
	export let latestVersion: string | null = null;
	export let outdatedInstallations: number = 0;
	export let upgradeRate: { last7Days: number; last30Days: number } = {
		last7Days: 0,
		last30Days: 0
	};
	export let title: string = 'App Version Distribution';

	// Calculate max count for bar sizing
	$: maxCount = versionDistribution.length > 0 
		? Math.max(...versionDistribution.map(v => v.count)) 
		: 1;

	// Determine if a version is outdated (2 versions behind latest or more)
	function isOutdated(version: string): boolean {
		if (!latestVersion || version === latestVersion) return false;
		
		// Simple heuristic: versions that are not the latest are considered outdated
		// A more sophisticated version comparison could be added
		return version !== latestVersion;
	}

	// Format large numbers with K/M suffixes
	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	}

	// Handle export functionality
	function exportData() {
		const data = {
			versionDistribution,
			latestVersion,
			outdatedInstallations,
			upgradeRate,
			exportedAt: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `version-analytics-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<div 
	class="version-analytics-container" 
	data-testid="version-analytics"
	role="region"
	aria-labelledby="version-analytics-title"
>
	<div class="header">
		<h3 id="version-analytics-title" class="title">{title}</h3>
		<button
			class="export-button"
			on:click={exportData}
			aria-label="Export version analytics data"
			title="Export version analytics data as JSON"
		>
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				width="16" 
				height="16" 
				viewBox="0 0 24 24" 
				fill="none" 
				stroke="currentColor" 
				stroke-width="2" 
				stroke-linecap="round" 
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="7 10 12 15 17 10"></polyline>
				<line x1="12" y1="15" x2="12" y2="3"></line>
			</svg>
			Export
		</button>
	</div>

	{#if versionDistribution.length === 0}
		<div class="empty-state" data-testid="version-analytics-empty">
			<p class="text-lg font-medium text-gray-500">No version data available</p>
			<p class="text-sm text-gray-400 mt-2">Install data will appear here once available</p>
		</div>
	{:else}
		<div class="version-bars" role="list" aria-label="Version distribution chart">
			{#each versionDistribution as version (version.version)}
				{@const barWidth = (version.count / maxCount) * 100}
				{@const isOldVersion = isOutdated(version.version)}
				<div 
					class="version-item" 
					role="listitem"
					aria-label="{version.version}: {version.count} installations, {version.percentage}% of total"
				>
					<div class="version-info">
						<span class="version-label">
							{version.version}
							{#if version.version === latestVersion}
								<span class="latest-badge" aria-label="Latest version">Latest</span>
							{/if}
							{#if isOldVersion}
								<span class="outdated-badge" aria-label="Outdated version" title="Consider upgrading">
									⚠️ Outdated
								</span>
							{/if}
						</span>
					</div>
					<div class="bar-container">
						<div 
							class="bar {isOldVersion ? 'outdated' : ''}" 
							style="width: {barWidth}%"
							role="progressbar"
							aria-valuenow={version.percentage}
							aria-valuemin="0"
							aria-valuemax="100"
							aria-label="Usage percentage"
						></div>
						<span class="bar-label">
							{version.percentage}% ({formatNumber(version.count)})
						</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="stats-footer" role="region" aria-label="Version statistics summary">
			<div class="stat-item">
				<span class="stat-label">Latest Version:</span>
				<span class="stat-value">{latestVersion || 'N/A'}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Outdated Installations:</span>
				<span class="stat-value">{formatNumber(outdatedInstallations)}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Upgrades (7d / 30d):</span>
				<span class="stat-value">
					{formatNumber(upgradeRate.last7Days)} / {formatNumber(upgradeRate.last30Days)}
				</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.version-analytics-container {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.export-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: #3b82f6;
		background: white;
		border: 1px solid #3b82f6;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.export-button:hover {
		background: #eff6ff;
	}

	.export-button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;
	}

	.version-bars {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.version-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.version-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.latest-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #059669;
		background: #d1fae5;
		border-radius: 0.25rem;
	}

	.outdated-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #d97706;
		background: #fef3c7;
		border-radius: 0.25rem;
	}

	.bar-container {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.bar {
		height: 2rem;
		background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
		border-radius: 0.25rem;
		transition: width 0.3s ease;
		min-width: 2rem;
	}

	.bar.outdated {
		background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
	}

	.bar-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		white-space: nowrap;
	}

	.stats-footer {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	@media (max-width: 640px) {
		.version-analytics-container {
			padding: 1rem;
		}

		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.stats-footer {
			grid-template-columns: 1fr;
		}
	}
</style>
