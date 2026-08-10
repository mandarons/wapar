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

test('renders growth tab with acquisition data', async ({ page }) => {
	await page.getByTestId('tab-growth').click();
	await expect(page.locator('text=Growth & Acquisition')).toBeVisible();
	await expect(page.getByTestId('growth-total-new')).toBeVisible();
	await expect(page.getByTestId('growth-reinstalls')).toBeVisible();
	await expect(page.getByTestId('growth-new-user-rate')).toBeVisible();
	await expect(page.getByTestId('growth-top-country')).toBeVisible();
});

test('deep-link opens the correct tab via URL hash', async ({ page }) => {
	await page.goto('/#geography');
	await expect(page.getByTestId('tab-geography')).toHaveAttribute('aria-selected', 'true');
	await expect(page.locator('text=Top 10 countries')).toBeVisible();
});

test('deep-link with invalid hash defaults to overview', async ({ page }) => {
	await page.goto('/#nonexistent');
	await expect(page.getByTestId('overview-card')).toBeVisible();
});

test('clicking a tab updates the URL hash', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tab-distribution').click();
	await expect(page).toHaveURL(/#distribution/);
});

test('browser back button navigates between tabs', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tab-distribution').click();
	await expect(page).toHaveURL(/#distribution/);
	await page.getByTestId('tab-geography').click();
	await expect(page).toHaveURL(/#geography/);
	await page.goBack();
	await expect(page).toHaveURL(/#distribution/);
	await expect(page.getByTestId('tab-distribution')).toHaveAttribute('aria-selected', 'true');
});

test('deep-link to hidden tab falls back to first visible tab', async ({ page }) => {
	await page.goto('/#versions');
	// versions tab may not be visible if no data — should fallback to overview
	const overviewVisible = await page.getByTestId('overview-card').isVisible();
	const versionsVisible = await page.getByTestId('tab-versions').isVisible();
	if (!versionsVisible) {
		expect(overviewVisible).toBe(true);
	}
});

test('recent installs tab shows pagination controls when multiple pages exist', async ({
	page
}) => {
	await page.goto('/#recent');
	await page.getByTestId('tab-recent').click();
	const filter = page.getByTestId('recent-app-filter');
	await expect(filter).toBeVisible();
	const paginationInfo = page.locator('text=/Page \\d+ of \\d+/');
	const prevButton = page.getByTestId('recent-prev-page');
	const nextButton = page.getByTestId('recent-next-page');
	if (await paginationInfo.isVisible()) {
		await expect(prevButton).toBeVisible();
		await expect(nextButton).toBeVisible();
		await expect(prevButton).toBeDisabled();
	}
});

test('recent installs next button navigates to next page', async ({ page }) => {
	await page.goto('/#recent');
	await page.getByTestId('tab-recent').click();
	const nextButton = page.getByTestId('recent-next-page');
	if (await nextButton.isVisible()) {
		await nextButton.click();
		await expect(page).toHaveURL(/offset=\d+/);
		await expect(page.getByTestId('recent-prev-page')).toBeEnabled();
	}
});

test('recent installs filter shows app filter dropdown', async ({ page }) => {
	await page.goto('/#recent');
	await page.getByTestId('tab-recent').click();
	const filter = page.getByTestId('recent-app-filter');
	await expect(filter).toBeVisible();
	await expect(filter).toHaveValue('');
	const options = filter.locator('option');
	const count = await options.count();
	expect(count).toBeGreaterThanOrEqual(3);
});
