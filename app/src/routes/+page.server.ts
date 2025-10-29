import type { PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

// Use the PUBLIC_API_URL set at build time, with fallback to production
const API_URL = PUBLIC_API_URL || 'https://wapar-api.mandarons.com';

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
		
		const data = { ...waparData };
		data.totalInstallations = haData.bouncie.total + data.iCloudDocker.total;
		data.haBouncie = haData.bouncie;
		data.versionAnalytics = versionAnalytics;
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
			}
		};
	}
};
