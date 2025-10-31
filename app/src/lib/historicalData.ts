/**
 * Historical Data Storage Service
 *
 * Provides client-side storage for historical analytics data using localStorage
 * with automatic data retention management and quota monitoring.
 */

/**
 * Snapshot of key metrics at a specific point in time
 */
export interface DataSnapshot {
	timestamp: string; // ISO 8601 format
	totalInstallations: number;
	monthlyActive: number;
	iCloudDocker: number;
	haBouncie: number;
	countryToCount: { countryCode: string; count: number }[];
}

/**
 * Configuration for historical data storage
 */
export interface StorageConfig {
	maxSnapshots: number; // Maximum number of snapshots to retain
	retentionDays: number; // Number of days to retain data
	storageKey: string; // localStorage key
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
	maxSnapshots: 500, // ~1.5 years at one snapshot per day
	retentionDays: 90,
	storageKey: 'wapar_historical_data'
};

/**
 * Historical data storage service
 */
export class HistoricalDataService {
	private config: StorageConfig;

	constructor(config: Partial<StorageConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Save a new data snapshot
	 * Automatically manages retention and quota
	 */
	saveSnapshot(snapshot: DataSnapshot): boolean {
		try {
			const snapshots = this.getAllSnapshots();

			// Add new snapshot
			snapshots.push(snapshot);

			// Clean up old data
			const cleaned = this.cleanupOldData(snapshots);

			// Save to localStorage (handle environments without localStorage)
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(this.config.storageKey, JSON.stringify(cleaned));
			}

			return true;
		} catch (error) {
			console.error('Failed to save snapshot:', error);
			// Handle quota exceeded error
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				// Try to free up space by removing old snapshots
				this.freeUpSpace();
				// Retry once
				try {
					const snapshots = this.getAllSnapshots();
					snapshots.push(snapshot);
					const cleaned = this.cleanupOldData(snapshots);
					if (typeof localStorage !== 'undefined') {
						localStorage.setItem(this.config.storageKey, JSON.stringify(cleaned));
					}
					return true;
				} catch (retryError) {
					console.error('Failed to save snapshot after cleanup:', retryError);
					return false;
				}
			}
			return false;
		}
	}

	/**
	 * Get all stored snapshots
	 */
	getAllSnapshots(): DataSnapshot[] {
		try {
			if (typeof localStorage === 'undefined') {
				return [];
			}
			const data = localStorage.getItem(this.config.storageKey);
			if (!data) {
				return [];
			}
			const parsed = JSON.parse(data);
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error('Failed to load snapshots:', error);
			return [];
		}
	}

	/**
	 * Get snapshots within a date range
	 */
	getSnapshotsInRange(startDate: Date, endDate: Date): DataSnapshot[] {
		const all = this.getAllSnapshots();
		return all.filter((snapshot) => {
			const snapshotDate = new Date(snapshot.timestamp);
			return snapshotDate >= startDate && snapshotDate <= endDate;
		});
	}

	/**
	 * Get the most recent snapshot
	 */
	getLatestSnapshot(): DataSnapshot | null {
		const snapshots = this.getAllSnapshots();
		if (snapshots.length === 0) {
			return null;
		}
		return snapshots[snapshots.length - 1];
	}

	/**
	 * Clean up old data based on retention policy
	 */
	private cleanupOldData(snapshots: DataSnapshot[]): DataSnapshot[] {
		const now = new Date();
		const retentionDate = new Date(now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1000);

		// Filter by retention date
		let cleaned = snapshots.filter((snapshot) => {
			return new Date(snapshot.timestamp) >= retentionDate;
		});

		// Enforce max snapshots limit
		if (cleaned.length > this.config.maxSnapshots) {
			cleaned = cleaned.slice(cleaned.length - this.config.maxSnapshots);
		}

		return cleaned;
	}

	/**
	 * Free up space by aggressively removing old snapshots
	 */
	private freeUpSpace(): void {
		try {
			const snapshots = this.getAllSnapshots();
			// Keep only the most recent 50% of snapshots
			const reduced = snapshots.slice(Math.floor(snapshots.length / 2));
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(this.config.storageKey, JSON.stringify(reduced));
			}
		} catch (error) {
			console.error('Failed to free up space:', error);
		}
	}

	/**
	 * Clear all historical data
	 */
	clearAll(): void {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(this.config.storageKey);
		}
	}

	/**
	 * Get storage usage statistics
	 */
	getStorageStats(): {
		snapshotCount: number;
		oldestSnapshot: string | null;
		newestSnapshot: string | null;
		estimatedSizeKB: number;
	} {
		const snapshots = this.getAllSnapshots();
		const data =
			typeof localStorage !== 'undefined' ? localStorage.getItem(this.config.storageKey) || '' : '';
		const sizeKB = new Blob([data]).size / 1024;

		return {
			snapshotCount: snapshots.length,
			oldestSnapshot: snapshots.length > 0 ? snapshots[0].timestamp : null,
			newestSnapshot: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : null,
			estimatedSizeKB: Math.round(sizeKB * 100) / 100
		};
	}

	/**
	 * Check if a snapshot should be saved (avoid duplicates within same day)
	 */
	shouldSaveSnapshot(newTimestamp: string): boolean {
		const latest = this.getLatestSnapshot();
		if (!latest) {
			return true;
		}

		const latestDate = new Date(latest.timestamp);
		const newDate = new Date(newTimestamp);

		// Only save one snapshot per day
		return (
			latestDate.getFullYear() !== newDate.getFullYear() ||
			latestDate.getMonth() !== newDate.getMonth() ||
			latestDate.getDate() !== newDate.getDate()
		);
	}
}

/**
 * Singleton instance for convenience
 */
export const historicalDataService = new HistoricalDataService();
