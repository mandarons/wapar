<script lang="ts">
	import { historicalDataService } from '../historicalData';
	import {
		exportAsJSON,
		exportAsCSV,
		importFromJSON,
		mergeSnapshots,
		estimateExportSize
	} from '../dataExport';

	export let onDataImported: () => void = () => {};

	let fileInput: HTMLInputElement;
	let importStatus: 'idle' | 'importing' | 'success' | 'error' = 'idle';
	let importMessage = '';
	let showConfirmClear = false;

	// Get storage stats
	$: storageStats = historicalDataService.getStorageStats();
	$: exportSize =
		storageStats.snapshotCount > 0
			? estimateExportSize(historicalDataService.getAllSnapshots())
			: { jsonSizeKB: 0, csvSizeKB: 0 };

	function handleExportJSON() {
		const snapshots = historicalDataService.getAllSnapshots();
		if (snapshots.length === 0) {
			alert('No historical data to export');
			return;
		}
		exportAsJSON(snapshots);
	}

	function handleExportCSV() {
		const snapshots = historicalDataService.getAllSnapshots();
		if (snapshots.length === 0) {
			alert('No historical data to export');
			return;
		}
		exportAsCSV(snapshots);
	}

	function handleImportClick() {
		fileInput.click();
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		importStatus = 'importing';
		importMessage = 'Importing data...';

		try {
			const importedSnapshots = await importFromJSON(file);
			const existingSnapshots = historicalDataService.getAllSnapshots();
			const mergedSnapshots = mergeSnapshots(existingSnapshots, importedSnapshots);

			// Clear and save merged data
			historicalDataService.clearAll();
			for (const snapshot of mergedSnapshots) {
				historicalDataService.saveSnapshot(snapshot);
			}

			importStatus = 'success';
			importMessage = `Successfully imported ${importedSnapshots.length} snapshots. Total: ${mergedSnapshots.length}`;
			onDataImported();

			// Reset after 3 seconds
			setTimeout(() => {
				importStatus = 'idle';
				importMessage = '';
			}, 3000);
		} catch (error) {
			importStatus = 'error';
			importMessage = error instanceof Error ? error.message : 'Failed to import data';

			// Reset after 5 seconds
			setTimeout(() => {
				importStatus = 'idle';
				importMessage = '';
			}, 5000);
		}

		// Reset file input
		target.value = '';
	}

	function handleClearData() {
		showConfirmClear = true;
	}

	function confirmClear() {
		historicalDataService.clearAll();
		showConfirmClear = false;
		onDataImported();
	}

	function cancelClear() {
		showConfirmClear = false;
	}

	function formatDate(isoString: string | null): string {
		if (!isoString) return 'N/A';
		const date = new Date(isoString);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="data-management" data-testid="data-management">
	<h3 class="text-lg font-semibold text-gray-800 mb-6">💾 Data Management</h3>

	<!-- Storage Stats -->
	<div class="stats-grid mb-6">
		<div class="stat-card">
			<div class="stat-label">Snapshots</div>
			<div class="stat-value">{storageStats.snapshotCount}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Storage Used</div>
			<div class="stat-value">{storageStats.estimatedSizeKB.toFixed(1)} KB</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Oldest Data</div>
			<div class="stat-value-sm">{formatDate(storageStats.oldestSnapshot)}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Latest Data</div>
			<div class="stat-value-sm">{formatDate(storageStats.newestSnapshot)}</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="actions-section">
		<div class="action-group">
			<h4 class="action-group-title">Export Data</h4>
			<p class="action-group-desc">Download your historical data for backup or analysis</p>
			<div class="button-group">
				<button
					class="btn btn-primary"
					on:click={handleExportJSON}
					disabled={storageStats.snapshotCount === 0}
					data-testid="export-json-btn"
				>
					<span class="btn-icon">📄</span>
					Export JSON
					{#if exportSize.jsonSizeKB > 0}
						<span class="btn-badge">~{exportSize.jsonSizeKB.toFixed(1)} KB</span>
					{/if}
				</button>
				<button
					class="btn btn-secondary"
					on:click={handleExportCSV}
					disabled={storageStats.snapshotCount === 0}
					data-testid="export-csv-btn"
				>
					<span class="btn-icon">📊</span>
					Export CSV
					{#if exportSize.csvSizeKB > 0}
						<span class="btn-badge">~{exportSize.csvSizeKB.toFixed(1)} KB</span>
					{/if}
				</button>
			</div>
		</div>

		<div class="action-group">
			<h4 class="action-group-title">Import Data</h4>
			<p class="action-group-desc">Restore or merge previously exported data</p>
			<input
				type="file"
				accept=".json"
				bind:this={fileInput}
				on:change={handleFileChange}
				class="hidden"
			/>
			<button
				class="btn btn-secondary w-full"
				on:click={handleImportClick}
				disabled={importStatus === 'importing'}
				data-testid="import-btn"
			>
				<span class="btn-icon">📥</span>
				{importStatus === 'importing' ? 'Importing...' : 'Import JSON'}
			</button>

			{#if importMessage}
				<div
					class="import-message {importStatus === 'success'
						? 'success'
						: importStatus === 'error'
							? 'error'
							: ''}"
					data-testid="import-message"
				>
					{importMessage}
				</div>
			{/if}
		</div>

		<div class="action-group">
			<h4 class="action-group-title">Clear Data</h4>
			<p class="action-group-desc text-red-600">Permanently delete all historical data</p>
			{#if showConfirmClear}
				<div class="confirm-dialog" data-testid="confirm-clear">
					<p class="text-sm text-gray-700 mb-3">
						Are you sure? This will permanently delete all {storageStats.snapshotCount} snapshots.
					</p>
					<div class="button-group">
						<button class="btn btn-danger" on:click={confirmClear}> Yes, Delete All </button>
						<button class="btn btn-secondary" on:click={cancelClear}> Cancel </button>
					</div>
				</div>
			{:else}
				<button
					class="btn btn-danger w-full"
					on:click={handleClearData}
					disabled={storageStats.snapshotCount === 0}
					data-testid="clear-data-btn"
				>
					<span class="btn-icon">🗑️</span>
					Clear All Data
				</button>
			{/if}
		</div>
	</div>

	<!-- Info Box -->
	<div class="info-box mt-6">
		<div class="info-icon">ℹ️</div>
		<div class="info-content">
			<p class="text-sm text-gray-700">
				<strong>Privacy:</strong> All data is stored locally in your browser. Nothing is sent to external
				servers.
			</p>
			<p class="text-sm text-gray-600 mt-1">
				Historical data is automatically saved once per day and retained for 90 days.
			</p>
		</div>
	</div>
</div>

<style>
	.data-management {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-value-sm {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
	}

	.actions-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.action-group {
		padding: 1rem;
		background: #f9fafb;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
	}

	.action-group-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.action-group-desc {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 0.75rem;
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #16a34a;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #15803d;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.3);
	}

	.btn-secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
	}

	.btn-icon {
		font-size: 1rem;
	}

	.btn-badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.625rem;
	}

	.w-full {
		width: 100%;
	}

	.hidden {
		display: none;
	}

	.import-message {
		margin-top: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.import-message.success {
		background: #d1fae5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.import-message.error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.confirm-dialog {
		background: white;
		padding: 1rem;
		border-radius: 0.375rem;
		border: 2px solid #fca5a5;
	}

	.info-box {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
	}

	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.info-content {
		flex: 1;
	}
</style>
