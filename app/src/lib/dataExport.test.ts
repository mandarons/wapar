/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	exportAsJSON,
	exportAsCSV,
	importFromJSON,
	mergeSnapshots,
	estimateExportSize
} from './dataExport';
import type { DataSnapshot } from './historicalData';

describe('dataExport', () => {
	const createTestSnapshot = (daysAgo: number, installations: number): DataSnapshot => {
		const date = new Date();
		date.setDate(date.getDate() - daysAgo);
		return {
			timestamp: date.toISOString(),
			totalInstallations: installations,
			monthlyActive: Math.floor(installations * 0.6),
			iCloudDocker: Math.floor(installations * 0.55),
			haBouncie: Math.floor(installations * 0.45),
			countryToCount: [
				{ countryCode: 'US', count: Math.floor(installations * 0.35) },
				{ countryCode: 'GB', count: Math.floor(installations * 0.15) }
			]
		};
	};

	let mockLink: HTMLAnchorElement;
	let clickSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Setup URL mocks first
		const urlCreateMock = vi.fn().mockReturnValue('blob:mock-url');
		const urlRevokeMock = vi.fn();
		global.URL.createObjectURL = urlCreateMock as unknown as typeof URL.createObjectURL;
		global.URL.revokeObjectURL = urlRevokeMock as unknown as typeof URL.revokeObjectURL;

		// Mock document.createElement and link click
		mockLink = {
			href: '',
			download: '',
			click: vi.fn()
		} as unknown as HTMLAnchorElement;

		clickSpy = vi.fn();
		mockLink.click = clickSpy;

		vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
		vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
		vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('exportAsJSON', () => {
		it('should create a JSON export with correct structure', () => {
			const snapshots: DataSnapshot[] = [
				createTestSnapshot(2, 1000),
				createTestSnapshot(1, 1050),
				createTestSnapshot(0, 1100)
			];

			exportAsJSON(snapshots);

			expect(document.createElement).toHaveBeenCalledWith('a');
			expect(clickSpy).toHaveBeenCalled();
			expect(mockLink.download).toContain('wapar-historical-data');
			expect(mockLink.download).toContain('.json');
		});

		it('should use custom filename when provided', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];
			const customFilename = 'custom-export.json';

			exportAsJSON(snapshots, customFilename);

			expect(mockLink.download).toBe(customFilename);
		});

		it('should handle empty snapshots array', () => {
			exportAsJSON([]);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should clean up resources after export', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];

			exportAsJSON(snapshots);

			expect(URL.revokeObjectURL).toHaveBeenCalled();
			expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
		});
	});

	describe('exportAsCSV', () => {
		it('should create a CSV export with correct headers', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(2, 1000), createTestSnapshot(1, 1050)];

			exportAsCSV(snapshots);

			expect(document.createElement).toHaveBeenCalledWith('a');
			expect(clickSpy).toHaveBeenCalled();
			expect(mockLink.download).toContain('wapar-historical-data');
			expect(mockLink.download).toContain('.csv');
		});

		it('should use custom filename when provided', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];
			const customFilename = 'custom-export.csv';

			exportAsCSV(snapshots, customFilename);

			expect(mockLink.download).toBe(customFilename);
		});

		it('should handle empty snapshots array', () => {
			exportAsCSV([]);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should clean up resources after export', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];

			exportAsCSV(snapshots);

			expect(URL.revokeObjectURL).toHaveBeenCalled();
			expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
		});
	});

	describe('importFromJSON', () => {
		it('should import valid JSON file', async () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(2, 1000), createTestSnapshot(1, 1050)];

			const fileContent = JSON.stringify({
				version: '1.0',
				exportDate: new Date().toISOString(),
				snapshotCount: snapshots.length,
				snapshots
			});

			const file = new File([fileContent], 'test.json', { type: 'application/json' });

			const result = await importFromJSON(file);

			expect(result).toHaveLength(2);
			expect(result[0].totalInstallations).toBe(1000);
			expect(result[1].totalInstallations).toBe(1050);
		});

		it('should reject invalid JSON format', async () => {
			const file = new File(['invalid json'], 'test.json', { type: 'application/json' });

			await expect(importFromJSON(file)).rejects.toThrow();
		});

		it('should reject file without snapshots array', async () => {
			const fileContent = JSON.stringify({ version: '1.0', data: {} });
			const file = new File([fileContent], 'test.json', { type: 'application/json' });

			await expect(importFromJSON(file)).rejects.toThrow('Invalid file format');
		});

		it('should filter out invalid snapshots', async () => {
			const validSnapshot = createTestSnapshot(0, 1000);
			const invalidSnapshot = {
				timestamp: 'invalid'
				// Missing required fields
			};

			const fileContent = JSON.stringify({
				version: '1.0',
				snapshots: [validSnapshot, invalidSnapshot]
			});

			const file = new File([fileContent], 'test.json', { type: 'application/json' });

			const result = await importFromJSON(file);

			expect(result).toHaveLength(1);
			expect(result[0].totalInstallations).toBe(1000);
		});

		it('should reject file with no valid snapshots', async () => {
			const fileContent = JSON.stringify({
				version: '1.0',
				snapshots: [{ invalid: 'data' }]
			});

			const file = new File([fileContent], 'test.json', { type: 'application/json' });

			await expect(importFromJSON(file)).rejects.toThrow('No valid snapshots found');
		});

		it('should handle file read errors', async () => {
			const file = new File([], 'test.json', { type: 'application/json' });

			// Mock FileReader to simulate error
			const originalFileReader = global.FileReader;
			global.FileReader = class {
				onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
				onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
				readAsText() {
					setTimeout(() => {
						if (this.onerror) {
							this.onerror({} as ProgressEvent<FileReader>);
						}
					}, 0);
				}
			} as unknown as typeof FileReader;

			await expect(importFromJSON(file)).rejects.toThrow('Failed to read file');

			global.FileReader = originalFileReader;
		});
	});

	describe('mergeSnapshots', () => {
		it('should merge two arrays without duplicates', () => {
			const existing: DataSnapshot[] = [createTestSnapshot(5, 1000), createTestSnapshot(4, 1020)];

			const imported: DataSnapshot[] = [createTestSnapshot(3, 1040), createTestSnapshot(2, 1060)];

			const merged = mergeSnapshots(existing, imported);

			expect(merged).toHaveLength(4);
			expect(merged[0].totalInstallations).toBe(1000); // Oldest first
		});

		it('should remove duplicate timestamps', () => {
			const snapshot1 = createTestSnapshot(5, 1000);
			const snapshot2 = createTestSnapshot(5, 1050); // Same day, different value

			const existing: DataSnapshot[] = [snapshot1];
			const imported: DataSnapshot[] = [snapshot2];

			const merged = mergeSnapshots(existing, imported);

			expect(merged).toHaveLength(1);
			// Should keep the one with higher installations
			expect(merged[0].totalInstallations).toBe(1050);
		});

		it('should sort by timestamp', () => {
			const existing: DataSnapshot[] = [createTestSnapshot(1, 1050), createTestSnapshot(5, 1000)];

			const imported: DataSnapshot[] = [createTestSnapshot(0, 1100), createTestSnapshot(3, 1030)];

			const merged = mergeSnapshots(existing, imported);

			expect(merged).toHaveLength(4);
			// Verify sorted order
			for (let i = 1; i < merged.length; i++) {
				const prevTime = new Date(merged[i - 1].timestamp).getTime();
				const currTime = new Date(merged[i].timestamp).getTime();
				expect(currTime).toBeGreaterThanOrEqual(prevTime);
			}
		});

		it('should handle empty arrays', () => {
			const existing: DataSnapshot[] = [createTestSnapshot(0, 1000)];
			const imported: DataSnapshot[] = [];

			const merged = mergeSnapshots(existing, imported);

			expect(merged).toHaveLength(1);
		});

		it('should handle both arrays empty', () => {
			const merged = mergeSnapshots([], []);

			expect(merged).toHaveLength(0);
		});
	});

	describe('estimateExportSize', () => {
		it('should estimate JSON and CSV sizes', () => {
			const snapshots: DataSnapshot[] = [
				createTestSnapshot(2, 1000),
				createTestSnapshot(1, 1050),
				createTestSnapshot(0, 1100)
			];

			const estimate = estimateExportSize(snapshots);

			expect(estimate.jsonSizeKB).toBeGreaterThan(0);
			expect(estimate.csvSizeKB).toBeGreaterThan(0);
		});

		it('should return zero for empty array', () => {
			const estimate = estimateExportSize([]);

			expect(estimate.jsonSizeKB).toBeGreaterThan(0); // Still has structure
			expect(estimate.csvSizeKB).toBe(0);
		});

		it('should estimate larger size for more snapshots', () => {
			const smallSnapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];
			const largeSnapshots: DataSnapshot[] = [];
			for (let i = 0; i < 100; i++) {
				largeSnapshots.push(createTestSnapshot(i, 1000 + i * 10));
			}

			const smallEstimate = estimateExportSize(smallSnapshots);
			const largeEstimate = estimateExportSize(largeSnapshots);

			expect(largeEstimate.jsonSizeKB).toBeGreaterThan(smallEstimate.jsonSizeKB);
			expect(largeEstimate.csvSizeKB).toBeGreaterThan(smallEstimate.csvSizeKB);
		});

		it('should return rounded values', () => {
			const snapshots: DataSnapshot[] = [createTestSnapshot(0, 1000)];

			const estimate = estimateExportSize(snapshots);

			// Check that values are rounded to 2 decimal places
			expect(estimate.jsonSizeKB.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
			expect(estimate.csvSizeKB.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
		});
	});

	describe('integration', () => {
		it('should export and import data successfully', async () => {
			const originalSnapshots: DataSnapshot[] = [
				createTestSnapshot(2, 1000),
				createTestSnapshot(1, 1050),
				createTestSnapshot(0, 1100)
			];

			// Create export data structure
			const exportData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				snapshotCount: originalSnapshots.length,
				snapshots: originalSnapshots
			};

			const fileContent = JSON.stringify(exportData);
			const file = new File([fileContent], 'test.json', { type: 'application/json' });

			const importedSnapshots = await importFromJSON(file);

			expect(importedSnapshots).toHaveLength(originalSnapshots.length);
			expect(importedSnapshots[0].totalInstallations).toBe(1000);
			expect(importedSnapshots[1].totalInstallations).toBe(1050);
			expect(importedSnapshots[2].totalInstallations).toBe(1100);
		});
	});
});
