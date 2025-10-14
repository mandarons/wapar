/**
 * Data Export/Import Utilities
 *
 * Provides functionality to export historical data as JSON/CSV
 * and import data for backup and restore purposes.
 */

import type { DataSnapshot } from './historicalData';

/**
 * Export data as JSON file
 */
export function exportAsJSON(snapshots: DataSnapshot[], filename?: string): void {
	const exportData = {
		version: '1.0',
		exportDate: new Date().toISOString(),
		snapshotCount: snapshots.length,
		snapshots
	};

	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename || `wapar-historical-data-${formatDateForFilename(new Date())}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportAsCSV(snapshots: DataSnapshot[], filename?: string): void {
	// CSV header
	const headers = [
		'Timestamp',
		'Total Installations',
		'Monthly Active',
		'iCloud Docker',
		'HA Bouncie',
		'Country Count'
	];

	// CSV rows
	const rows = snapshots.map((snapshot) => [
		snapshot.timestamp,
		snapshot.totalInstallations.toString(),
		snapshot.monthlyActive.toString(),
		snapshot.iCloudDocker.toString(),
		snapshot.haBouncie.toString(),
		snapshot.countryToCount.length.toString()
	]);

	// Combine headers and rows
	const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

	const blob = new Blob([csvContent], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename || `wapar-historical-data-${formatDateForFilename(new Date())}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 */
export function importFromJSON(file: File): Promise<DataSnapshot[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const parsed = JSON.parse(content);

				// Validate structure
				if (!parsed.snapshots || !Array.isArray(parsed.snapshots)) {
					throw new Error('Invalid file format: missing snapshots array');
				}

				// Validate each snapshot
				const validSnapshots = parsed.snapshots.filter(validateSnapshot);

				if (validSnapshots.length === 0) {
					throw new Error('No valid snapshots found in file');
				}

				resolve(validSnapshots);
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsText(file);
	});
}

/**
 * Validate a snapshot object
 */
function validateSnapshot(snapshot: unknown): snapshot is DataSnapshot {
	if (!snapshot || typeof snapshot !== 'object') {
		return false;
	}

	const s = snapshot as Partial<DataSnapshot>;

	return (
		typeof s.timestamp === 'string' &&
		typeof s.totalInstallations === 'number' &&
		typeof s.monthlyActive === 'number' &&
		typeof s.iCloudDocker === 'number' &&
		typeof s.haBouncie === 'number' &&
		Array.isArray(s.countryToCount)
	);
}

/**
 * Format date for filename (YYYY-MM-DD)
 */
function formatDateForFilename(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Merge imported snapshots with existing data
 * Removes duplicates and sorts by timestamp
 */
export function mergeSnapshots(
	existing: DataSnapshot[],
	imported: DataSnapshot[]
): DataSnapshot[] {
	// Combine arrays
	const combined = [...existing, ...imported];

	// Remove duplicates by timestamp
	const uniqueMap = new Map<string, DataSnapshot>();
	for (const snapshot of combined) {
		const key = snapshot.timestamp;
		// Keep the snapshot with more data (in case of conflicts)
		if (!uniqueMap.has(key) || uniqueMap.get(key)!.totalInstallations < snapshot.totalInstallations) {
			uniqueMap.set(key, snapshot);
		}
	}

	// Convert back to array and sort by timestamp
	const merged = Array.from(uniqueMap.values()).sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);

	return merged;
}

/**
 * Get file size estimate for export
 */
export function estimateExportSize(snapshots: DataSnapshot[]): {
	jsonSizeKB: number;
	csvSizeKB: number;
} {
	const jsonStr = JSON.stringify({ version: '1.0', snapshots });
	const jsonSize = new Blob([jsonStr]).size / 1024;

	// Estimate CSV size (rough calculation)
	const csvRowSize = 100; // Average bytes per row
	const csvSize = (snapshots.length * csvRowSize) / 1024;

	return {
		jsonSizeKB: Math.round(jsonSize * 100) / 100,
		csvSizeKB: Math.round(csvSize * 100) / 100
	};
}
