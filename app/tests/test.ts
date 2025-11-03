import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
});

test('shows overview metrics in a single summary card', async ({ page }) => {
	await expect(page.getByTestId('overview-card')).toBeVisible();
	await expect(page.getByTestId('active-installations')).not.toBeEmpty();
	await expect(page.getByTestId('total-installations')).not.toBeEmpty();
	await expect(page.getByTestId('stale-installations')).not.toBeEmpty();
});

test('provides descriptive summary and last synced timestamp', async ({ page }) => {
	const summary = page.getByTestId('overview-summary');
	await expect(summary).toBeVisible();
	await expect(summary).toContainText(/Tracking adoption/i);

	const lastSynced = page.getByTestId('last-synced');
	await expect(lastSynced).toBeVisible();
	await expect(lastSynced).toContainText(/Last synced:/i);
});

test('supports manual refresh without auto-refresh controls', async ({ page }) => {
	const intervalSelector = page.locator('[data-testid="refresh-interval-selector"]');
	await expect(intervalSelector).toHaveCount(0);

	const refreshButton = page.getByTestId('manual-refresh-button');
	await expect(refreshButton).toBeVisible();
	await refreshButton.click();
	await expect(refreshButton).toBeVisible();
});

test('renders market share tools with neutral styling', async ({ page }) => {
	await page.getByTestId('tab-distribution').click();
	await expect(page.locator('text=Distribution insights')).toBeVisible();
	await expect(page.getByTestId('chart-type-selector')).toBeVisible();
	await expect(page.getByTestId('export-chart-button')).toBeVisible();
});

test('keeps geographic list and interactive map accessible', async ({ page }) => {
	await page.getByTestId('tab-geography').click();
	const topCountriesHeading = page.locator('text=Top 10 countries');
	await expect(topCountriesHeading).toBeVisible();
	const map = page.getByTestId('interactive-map');
	await expect(map).toBeVisible();
	await expect(map.locator('svg').first()).toBeVisible();

	const countryItems = page.locator('[data-testid^="country-item-"]');
	await expect(countryItems.first()).toBeVisible();
	const count = await countryItems.count();
	expect(count).toBeGreaterThan(0);
	expect(count).toBeLessThanOrEqual(10);
});

test('does not render deprecated engagement or analytics widgets', async ({ page }) => {
	const deprecatedTestIds = [
		'engagement-health-dashboard',
		'conversion-rate-card',
		'data-management',
		'trend-chart',
		'milestone-tracker'
	];

	for (const testId of deprecatedTestIds) {
		await expect(page.locator(`[data-testid="${testId}"]`)).toHaveCount(0);
	}
});
