import type { PageServerLoad } from './$types';
import { RECENT_PAGE_SIZE } from '$lib/pagination';

// Check if process.env exists (Node.js) and has PUBLIC_API_URL, otherwise use production URL
// This supports both staging (Node.js with env vars) and production (Cloudflare Workers)
const API_URL =
	typeof process !== 'undefined' && process.env?.PUBLIC_API_URL
		? process.env.PUBLIC_API_URL
		: 'https://wapar-api.mandarons.com';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Read global appName filter from URL search params
		const appName = url.searchParams.get('app') || undefined;

		// Fetch WAPAR usage data
		let waparData;
		try {
			const usageParams = appName ? `?appName=${encodeURIComponent(appName)}` : '';
			const res = await fetch(`${API_URL}/api/usage${usageParams}`);
			waparData = await res.json();
		} catch (error) {
			console.warn('Failed to fetch WAPAR usage data:', error);
			waparData = {
				totalInstallations: 0,
				activeInstallations: 0,
				staleInstallations: 0,
				monthlyActive: 0,
				activityThresholdDays: 3,
				createdAt: new Date().toISOString(),
				earliestInstallationDate: null,
				countryToCount: [],
				allTimeCountryToCount: [],
				iCloudDocker: { total: 0 },
				haBouncie: { total: 0 }
			};
		}

		// Fetch Home Assistant analytics data
		let haData;
		try {
			const res = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
			haData = await res.json();
		} catch (error) {
			console.warn('Failed to fetch Home Assistant analytics:', error);
			haData = {
				bouncie: { total: 0 }
			};
		}

		// Fetch version analytics
		let versionAnalytics;
		try {
			const versionParams = appName ? `?appName=${encodeURIComponent(appName)}` : '';
			const versionRes = await fetch(`${API_URL}/api/version-analytics${versionParams}`);
			versionAnalytics = await versionRes.json();
		} catch (error) {
			console.warn('Failed to fetch version analytics:', error);
			versionAnalytics = {
				versionDistribution: [],
				latestVersion: null,
				outdatedInstallations: 0,
				newInstallRate: { last7Days: 0, last30Days: 0 },
				adoptionTimeline: [],
				adoptionGaps: []
			};
		}

		// Fetch recent installations with pagination and app filter from URL search params
		let recentInstallationsData;
		try {
			const recentOffset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
			const recentAppName = url.searchParams.get('appName') || undefined;
			const recentParams = new URLSearchParams({
				limit: String(RECENT_PAGE_SIZE),
				offset: String(recentOffset)
			});
			if (recentAppName) {
				recentParams.set('appName', recentAppName);
			}
			const recentRes = await fetch(`${API_URL}/api/recent-installations?${recentParams}`);
			recentInstallationsData = await recentRes.json();
			recentInstallationsData.appName = recentAppName;
		} catch (error) {
			console.warn('Failed to fetch recent installations:', error);
			recentInstallationsData = {
				installations: [],
				total: 0,
				limit: RECENT_PAGE_SIZE,
				offset: 0,
				installationsLast24h: 0,
				installationsLast7d: 0
			};
		}

		// Fetch heartbeat analytics
		let heartbeatAnalytics;
		try {
			const heartbeatParams = appName ? `?appName=${encodeURIComponent(appName)}` : '';
			const heartbeatRes = await fetch(`${API_URL}/api/heartbeat-analytics${heartbeatParams}`);
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
				gaps: [],
				healthMetrics: {
					avgHeartbeatsPerUser: 0,
					avgTimeBetweenHeartbeats: '0 hours'
				},
				churnRisk: {
					usersInactive7Days: 0,
					usersInactive14Days: 0,
					usersInactive30Days: 0
				},
				retention: [],
				syncHealth: {
					last7d: {
						installationsReporting: 0,
						avgSyncDurationSec: null,
						errorRate: 0,
						driveActiveCount: 0,
						photosActiveCount: 0
					},
					last30d: {
						installationsReporting: 0,
						avgSyncDurationSec: null,
						errorRate: 0,
						driveActiveCount: 0,
						photosActiveCount: 0
					}
				}
			};
		}

		// Fetch new installations analytics
		let newInstallations;
		try {
			const newInstallRes = await fetch(`${API_URL}/api/new-installations?period=30d&groupBy=day`);
			newInstallations = await newInstallRes.json();
		} catch (error) {
			console.warn('Failed to fetch new installations analytics:', error);
			newInstallations = {
				summary: {
					totalNew: 0,
					totalReinstalls: 0,
					newUserRate: 0,
					period: '30d'
				},
				timeline: [],
				gaps: [],
				topCountriesNewUsers: [],
				reinstallPatterns: {
					reinstallRate: 0
				}
			};
		}

		// Fetch upgrade analytics
		let upgradeAnalytics;
		try {
			const upgradeParams = appName ? `?appName=${encodeURIComponent(appName)}` : '';
			const upgradeRes = await fetch(`${API_URL}/api/upgrade-analytics${upgradeParams}`);
			upgradeAnalytics = await upgradeRes.json();
		} catch (error) {
			console.warn('Failed to fetch upgrade analytics:', error);
			upgradeAnalytics = {
				upgradeFlows: [],
				skipLevelUpgrades: { count: 0, rate: 0 },
				downgradeRate: 0,
				upgradeThenStale30d: { count: 0, rate: 0 },
				upgradesLast7d: 0,
				upgradesLast30d: 0
			};
		}

		// Fetch country insights (registration vs activity divergence)
		let countryInsights;
		try {
			const insightsRes = await fetch(`${API_URL}/api/country-insights`);
			countryInsights = await insightsRes.json();
		} catch (error) {
			console.warn('Failed to fetch country insights:', error);
			countryInsights = {
				countries: [],
				period: '30d',
				activityThresholdDays: 3,
				generatedAt: new Date().toISOString()
			};
		}

		const data = { ...waparData };

		// Ensure iCloudDocker and haBouncie always exist with defaults
		if (!data.iCloudDocker) {
			data.iCloudDocker = { total: 0 };
		}
		if (!haData.bouncie) {
			haData.bouncie = { total: 0 };
		}

		data.totalInstallations = haData.bouncie.total + (data.iCloudDocker?.total || 0);
		data.haBouncie = haData.bouncie;
		data.versionAnalytics = versionAnalytics;
		data.recentInstallations = recentInstallationsData;
		data.heartbeatAnalytics = heartbeatAnalytics;
		data.newInstallations = newInstallations;
		data.upgradeAnalytics = upgradeAnalytics;
		data.countryInsights = countryInsights;

		// Ensure we have the required fields with defaults if API didn't provide them
		if (!data.allTimeCountryToCount) {
			data.allTimeCountryToCount = [];
		}
		if (
			typeof data.activeInstallations === 'undefined' ||
			typeof data.staleInstallations === 'undefined'
		) {
			console.warn(
				'activeInstallations or staleInstallations missing from API response. Using estimated values.'
			);
			// Estimate: Assume 10% of installations are stale if not provided
			const estimatedStale = Math.round(data.totalInstallations * 0.1);
			data.activeInstallations = data.totalInstallations - estimatedStale;
			data.staleInstallations = estimatedStale;
		}
		if (typeof data.activityThresholdDays === 'undefined') {
			data.activityThresholdDays = 3;
		}

		// Pass the appName filter through to the page
		data.appName = appName ?? null;

		return data;
	} catch (error) {
		// Return mock data for development/testing
		console.warn('Failed to fetch data, using mock data:', error);
		return {
			totalInstallations: 1000,
			activeInstallations: 750,
			staleInstallations: 250,
			monthlyActive: 600,
			activityThresholdDays: 3,
			createdAt: new Date('2024-01-01').toISOString(),
			earliestInstallationDate: new Date('2024-01-01').toISOString(),
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
			allTimeCountryToCount: [
				{ countryCode: 'JP', count: 4078 },
				{ countryCode: 'RU', count: 4065 },
				{ countryCode: 'US', count: 4111 },
				{ countryCode: 'DE', count: 120 },
				{ countryCode: 'GB', count: 110 },
				{ countryCode: 'CA', count: 90 },
				{ countryCode: 'FR', count: 75 },
				{ countryCode: 'AU', count: 65 },
				{ countryCode: 'NL', count: 55 },
				{ countryCode: 'SE', count: 45 }
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
				newInstallRate: { last7Days: 15, last30Days: 78 },
				adoptionTimeline: [
					{ date: '2025-10-25', version: '2.1.0', newInstalls: 12 },
					{ date: '2025-10-25', version: '2.0.5', newInstalls: 8 },
					{ date: '2025-10-24', version: '2.1.0', newInstalls: 10 },
					{ date: '2025-10-24', version: '2.0.5', newInstalls: 6 }
				],
				adoptionGaps: []
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
				gaps: [],
				healthMetrics: {
					avgHeartbeatsPerUser: 5.8,
					avgTimeBetweenHeartbeats: '4.2 hours'
				},
				churnRisk: {
					usersInactive7Days: 45,
					usersInactive14Days: 23,
					usersInactive30Days: 12
				},
				syncHealth: {
					last7d: {
						installationsReporting: 180,
						avgSyncDurationSec: 42.3,
						errorRate: 0.05,
						driveActiveCount: 150,
						photosActiveCount: 120
					},
					last30d: {
						installationsReporting: 350,
						avgSyncDurationSec: 38.7,
						errorRate: 0.03,
						driveActiveCount: 300,
						photosActiveCount: 250
					}
				}
			},
			newInstallations: {
				summary: {
					totalNew: 12500,
					totalReinstalls: 1500,
					newUserRate: 89.3,
					period: '30d'
				},
				timeline: [
					{ date: '2025-10-25', newUsers: 450, reinstalls: 55, total: 505 },
					{ date: '2025-10-24', newUsers: 420, reinstalls: 48, total: 468 },
					{ date: '2025-10-23', newUsers: 435, reinstalls: 52, total: 487 }
				],
				gaps: [],
				topCountriesNewUsers: [
					{ countryCode: 'JP', count: 4075, percentage: 32.6 },
					{ countryCode: 'RU', count: 4063, percentage: 32.5 },
					{ countryCode: 'US', count: 4038, percentage: 32.3 }
				],
				reinstallPatterns: {
					reinstallRate: 10.7
				}
			},
			upgradeAnalytics: {
				upgradeFlows: [
					{ from: '1.24.0', to: '2.0.0', count: 45 },
					{ from: '1.23.0', to: '2.0.0', count: 30 },
					{ from: '1.22.0', to: '2.0.0', count: 15 }
				],
				skipLevelUpgrades: { count: 20, rate: 22.2 },
				downgradeRate: 1.1,
				upgradeThenStale30d: { count: 5, rate: 5.6 },
				upgradesLast7d: 15,
				upgradesLast30d: 90
			},
			countryInsights: {
				countries: [
					{
						countryCode: 'JP',
						new30d: 4075,
						new30dShare: 32.6,
						active: 3,
						activeRate: 0.1,
						total: 4078
					},
					{
						countryCode: 'RU',
						new30d: 4063,
						new30dShare: 32.5,
						active: 2,
						activeRate: 0.0,
						total: 4065
					},
					{
						countryCode: 'US',
						new30d: 4038,
						new30dShare: 32.3,
						active: 73,
						activeRate: 1.8,
						total: 4111
					}
				],
				period: '30d',
				activityThresholdDays: 3,
				generatedAt: new Date('2024-01-01').toISOString()
			}
		};
	}
};
