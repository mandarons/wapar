import type { PageServerLoad } from './$types';

// Check if process.env exists (Node.js) and has PUBLIC_API_URL, otherwise use production URL
// This supports both staging (Node.js with env vars) and production (Cloudflare Workers)
const API_URL =
	typeof process !== 'undefined' && process.env?.PUBLIC_API_URL
		? process.env.PUBLIC_API_URL
		: 'https://wapar-api.mandarons.com';

export const load: PageServerLoad = async () => {
	try {
		let res = await fetch(`${API_URL}/api/usage`);
		const waparData = await res.json();
		res = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
		const haData = await res.json();

		// Fetch version analytics
		let versionAnalytics;
		try {
			const versionRes = await fetch(`${API_URL}/api/version-analytics`);
			versionAnalytics = await versionRes.json();
		} catch (error) {
			console.warn('Failed to fetch version analytics:', error);
			versionAnalytics = {
				versionDistribution: [],
				latestVersion: null,
				outdatedInstallations: 0,
				upgradeRate: { last7Days: 0, last30Days: 0 }
			};
		}

		// Fetch recent installations
		let recentInstallationsData;
		try {
			const recentRes = await fetch(`${API_URL}/api/recent-installations?limit=20`);
			recentInstallationsData = await recentRes.json();
		} catch (error) {
			console.warn('Failed to fetch recent installations:', error);
			recentInstallationsData = {
				installations: [],
				total: 0,
				limit: 20,
				offset: 0,
				installationsLast24h: 0,
				installationsLast7d: 0
			};
		}

		// Fetch heartbeat analytics
		let heartbeatAnalytics;
		try {
			const heartbeatRes = await fetch(`${API_URL}/api/heartbeat-analytics`);
			heartbeatAnalytics = await heartbeatRes.json();
		} catch (error) {
			console.warn('Failed to fetch heartbeat analytics:', error);
			heartbeatAnalytics = {
				activeUsers: { daily: 0, weekly: 0, monthly: 0, dau_mau_ratio: 0 },
				engagementLevels: {
					highlyActive: { count: 0, description: '>7 heartbeats/week' },
					active: { count: 0, description: '1-7 heartbeats/week' },
					occasional: { count: 0, description: 'Active in last 30d but not last 7d' },
					dormant: { count: 0, description: 'No heartbeat in 30 days' }
				},
				timeline: [],
				healthMetrics: {
					avgHeartbeatsPerUser: 0,
					avgTimeBetweenHeartbeats: '0 hours',
					heartbeatFailureRate: 0
				},
				churnRisk: {
					usersInactive7Days: 0,
					usersInactive14Days: 0,
					usersInactive30Days: 0
				}
			};
		}

		const data = { ...waparData };
		data.totalInstallations = haData.bouncie.total + data.iCloudDocker.total;
		data.haBouncie = haData.bouncie;
		data.versionAnalytics = versionAnalytics;
		data.recentInstallations = recentInstallationsData;
		data.heartbeatAnalytics = heartbeatAnalytics;
		return data;
	} catch (error) {
		// Return mock data for development/testing
		console.warn('Failed to fetch data, using mock data:', error);
		return {
			totalInstallations: 1000,
			monthlyActive: 600,
			createdAt: new Date().toISOString(),
			countryToCount: [
				{ countryCode: 'US', count: 350 },
				{ countryCode: 'GB', count: 150 },
				{ countryCode: 'DE', count: 100 },
				{ countryCode: 'CA', count: 80 },
				{ countryCode: 'FR', count: 70 },
				{ countryCode: 'AU', count: 60 },
				{ countryCode: 'NL', count: 50 },
				{ countryCode: 'SE', count: 40 },
				{ countryCode: 'BE', count: 35 },
				{ countryCode: 'CH', count: 30 },
				{ countryCode: 'AT', count: 25 },
				{ countryCode: 'ES', count: 10 }
			],
			iCloudDocker: { total: 555 },
			haBouncie: { total: 445 },
			versionAnalytics: {
				versionDistribution: [
					{ version: '2.1.0', count: 250, percentage: 45.0 },
					{ version: '2.0.5', count: 200, percentage: 36.0 },
					{ version: '1.9.8', count: 105, percentage: 19.0 }
				],
				latestVersion: '2.1.0',
				outdatedInstallations: 305,
				upgradeRate: { last7Days: 15, last30Days: 78 }
			},
			recentInstallations: {
				installations: [],
				total: 0,
				limit: 20,
				offset: 0,
				installationsLast24h: 0,
				installationsLast7d: 0
			},
			heartbeatAnalytics: {
				activeUsers: { daily: 156, weekly: 342, monthly: 589, dau_mau_ratio: 0.265 },
				engagementLevels: {
					highlyActive: { count: 89, description: '>7 heartbeats/week' },
					active: { count: 234, description: '1-7 heartbeats/week' },
					occasional: { count: 156, description: 'Active in last 30d but not last 7d' },
					dormant: { count: 78, description: 'No heartbeat in 30 days' }
				},
				timeline: [
					{ date: '2025-10-25', activeUsers: 156, totalHeartbeats: 3450 },
					{ date: '2025-10-24', activeUsers: 148, totalHeartbeats: 3200 },
					{ date: '2025-10-23', activeUsers: 152, totalHeartbeats: 3350 }
				],
				healthMetrics: {
					avgHeartbeatsPerUser: 5.8,
					avgTimeBetweenHeartbeats: '4.2 hours',
					heartbeatFailureRate: 0
				},
				churnRisk: {
					usersInactive7Days: 45,
					usersInactive14Days: 23,
					usersInactive30Days: 12
				}
			}
		};
	}
};
