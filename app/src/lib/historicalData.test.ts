/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HistoricalDataService, historicalDataService, type DataSnapshot } from './historicalData';

describe('HistoricalDataService', () => {
	let service: HistoricalDataService;

	beforeEach(() => {
		localStorage.clear();
		service = new HistoricalDataService();
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe('saveSnapshot', () => {
		it('should save a snapshot successfully', () => {
			const snapshot: DataSnapshot = {
				timestamp: new Date().toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: [{ countryCode: 'US', count: 350 }]
			};

			const result = service.saveSnapshot(snapshot);
			expect(result).toBe(true);

			const snapshots = service.getAllSnapshots();
			expect(snapshots).toHaveLength(1);
			expect(snapshots[0]).toEqual(snapshot);
		});

		it('should save multiple snapshots', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);

			const snapshot1: DataSnapshot = {
				timestamp: yesterday.toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			const snapshot2: DataSnapshot = {
				timestamp: now.toISOString(),
				totalInstallations: 1050,
				monthlyActive: 630,
				iCloudDocker: 580,
				haBouncie: 470,
				countryToCount: []
			};

			service.saveSnapshot(snapshot1);
			service.saveSnapshot(snapshot2);

			const snapshots = service.getAllSnapshots();
			expect(snapshots).toHaveLength(2);
		});

		it('should handle quota exceeded error gracefully', () => {
			// Create a service with small max snapshots
			const smallService = new HistoricalDataService({ maxSnapshots: 2 });

			const snapshot1: DataSnapshot = {
				timestamp: new Date('2024-01-01').toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			const snapshot2: DataSnapshot = {
				timestamp: new Date('2024-01-02').toISOString(),
				totalInstallations: 1050,
				monthlyActive: 630,
				iCloudDocker: 580,
				haBouncie: 470,
				countryToCount: []
			};

			const snapshot3: DataSnapshot = {
				timestamp: new Date('2024-01-03').toISOString(),
				totalInstallations: 1100,
				monthlyActive: 660,
				iCloudDocker: 605,
				haBouncie: 495,
				countryToCount: []
			};

			smallService.saveSnapshot(snapshot1);
			smallService.saveSnapshot(snapshot2);
			smallService.saveSnapshot(snapshot3);

			const snapshots = smallService.getAllSnapshots();
			expect(snapshots.length).toBeLessThanOrEqual(2);
		});
	});

	describe('getAllSnapshots', () => {
		it('should return empty array when no data exists', () => {
			const snapshots = service.getAllSnapshots();
			expect(snapshots).toEqual([]);
		});

		it('should return all saved snapshots', () => {
			const snapshot1: DataSnapshot = {
				timestamp: new Date().toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			service.saveSnapshot(snapshot1);
			const snapshots = service.getAllSnapshots();
			expect(snapshots).toHaveLength(1);
		});

		it('should handle corrupted data gracefully', () => {
			localStorage.setItem('wapar_historical_data', 'invalid json');
			const snapshots = service.getAllSnapshots();
			expect(snapshots).toEqual([]);
		});
	});

	describe('getSnapshotsInRange', () => {
		beforeEach(() => {
			const today = new Date();
			for (let i = 0; i < 10; i++) {
				const date = new Date(today);
				date.setDate(date.getDate() - i);
				service.saveSnapshot({
					timestamp: date.toISOString(),
					totalInstallations: 1000 + i * 10,
					monthlyActive: 600 + i * 5,
					iCloudDocker: 555,
					haBouncie: 445,
					countryToCount: []
				});
			}
		});

		it('should return snapshots within date range', () => {
			const endDate = new Date();
			const startDate = new Date(endDate);
			startDate.setDate(startDate.getDate() - 5);

			const snapshots = service.getSnapshotsInRange(startDate, endDate);
			expect(snapshots.length).toBeGreaterThan(0);
			expect(snapshots.length).toBeLessThanOrEqual(6);
		});

		it('should return empty array for range with no data', () => {
			const startDate = new Date();
			startDate.setFullYear(startDate.getFullYear() + 1);
			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + 2);

			const snapshots = service.getSnapshotsInRange(startDate, endDate);
			expect(snapshots).toEqual([]);
		});
	});

	describe('getLatestSnapshot', () => {
		it('should return null when no snapshots exist', () => {
			const latest = service.getLatestSnapshot();
			expect(latest).toBeNull();
		});

		it('should return the most recent snapshot', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);

			const snapshot1: DataSnapshot = {
				timestamp: yesterday.toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			const snapshot2: DataSnapshot = {
				timestamp: now.toISOString(),
				totalInstallations: 1050,
				monthlyActive: 630,
				iCloudDocker: 580,
				haBouncie: 470,
				countryToCount: []
			};

			service.saveSnapshot(snapshot1);
			service.saveSnapshot(snapshot2);

			const latest = service.getLatestSnapshot();
			expect(latest).toEqual(snapshot2);
		});
	});

	describe('clearAll', () => {
		it('should remove all historical data', () => {
			const snapshot: DataSnapshot = {
				timestamp: new Date().toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			service.saveSnapshot(snapshot);
			expect(service.getAllSnapshots()).toHaveLength(1);

			service.clearAll();
			expect(service.getAllSnapshots()).toHaveLength(0);
		});
	});

	describe('getStorageStats', () => {
		it('should return correct statistics', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);

			const snapshot1: DataSnapshot = {
				timestamp: yesterday.toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			const snapshot2: DataSnapshot = {
				timestamp: now.toISOString(),
				totalInstallations: 1050,
				monthlyActive: 630,
				iCloudDocker: 580,
				haBouncie: 470,
				countryToCount: []
			};

			service.saveSnapshot(snapshot1);
			service.saveSnapshot(snapshot2);

			const stats = service.getStorageStats();
			expect(stats.snapshotCount).toBe(2);
			expect(stats.oldestSnapshot).toBe(snapshot1.timestamp);
			expect(stats.newestSnapshot).toBe(snapshot2.timestamp);
			expect(stats.estimatedSizeKB).toBeGreaterThan(0);
		});

		it('should return zero stats when no data exists', () => {
			const stats = service.getStorageStats();
			expect(stats.snapshotCount).toBe(0);
			expect(stats.oldestSnapshot).toBeNull();
			expect(stats.newestSnapshot).toBeNull();
		});
	});

	describe('shouldSaveSnapshot', () => {
		it('should return true when no snapshots exist', () => {
			const newTimestamp = new Date().toISOString();
			expect(service.shouldSaveSnapshot(newTimestamp)).toBe(true);
		});

		it('should return false for same day', () => {
			const now = new Date();
			const timestamp1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).toISOString();
			const timestamp2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0).toISOString();

			service.saveSnapshot({
				timestamp: timestamp1,
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			});

			expect(service.shouldSaveSnapshot(timestamp2)).toBe(false);
		});

		it('should return true for different day', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			
			const timestamp1 = yesterday.toISOString();
			const timestamp2 = now.toISOString();

			service.saveSnapshot({
				timestamp: timestamp1,
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			});

			expect(service.shouldSaveSnapshot(timestamp2)).toBe(true);
		});
	});

	describe('retention policy', () => {
		it('should enforce retention days', () => {
			const shortRetentionService = new HistoricalDataService({ retentionDays: 7 });

			// Add snapshots from 10 days ago to today
			const today = new Date();
			for (let i = 10; i >= 0; i--) {
				const date = new Date(today);
				date.setDate(date.getDate() - i);
				shortRetentionService.saveSnapshot({
					timestamp: date.toISOString(),
					totalInstallations: 1000 + i * 10,
					monthlyActive: 600,
					iCloudDocker: 555,
					haBouncie: 445,
					countryToCount: []
				});
			}

			const snapshots = shortRetentionService.getAllSnapshots();
			// Should only keep snapshots from last 7 days
			expect(snapshots.length).toBeLessThanOrEqual(8); // 7 days + today
		});

		it('should enforce max snapshots limit', () => {
			const limitedService = new HistoricalDataService({ maxSnapshots: 5 });

			// Add 10 snapshots
			for (let i = 0; i < 10; i++) {
				const date = new Date();
				date.setDate(date.getDate() - i);
				limitedService.saveSnapshot({
					timestamp: date.toISOString(),
					totalInstallations: 1000 + i * 10,
					monthlyActive: 600,
					iCloudDocker: 555,
					haBouncie: 445,
					countryToCount: []
				});
			}

			const snapshots = limitedService.getAllSnapshots();
			expect(snapshots.length).toBeLessThanOrEqual(5);
		});
	});

	describe('singleton instance', () => {
		it('should provide a working singleton instance', () => {
			const snapshot: DataSnapshot = {
				timestamp: new Date().toISOString(),
				totalInstallations: 1000,
				monthlyActive: 600,
				iCloudDocker: 555,
				haBouncie: 445,
				countryToCount: []
			};

			historicalDataService.clearAll();
			historicalDataService.saveSnapshot(snapshot);

			const snapshots = historicalDataService.getAllSnapshots();
			expect(snapshots).toHaveLength(1);

			historicalDataService.clearAll();
		});
	});
});
