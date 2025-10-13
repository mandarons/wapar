import { expect, test } from '@playwright/test';

test('should show usage summary', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('total-installations')).not.toBeEmpty();
	await expect(page.getByTestId('icloud-drive-docker-total-installations')).not.toBeEmpty();
	await expect(page.getByTestId('ha-bouncie-total-installations')).not.toBeEmpty();
});

test('should navigate to GitHub.com when clicked on github.svg', async ({ page }) => {
	await page.goto('/');
	const pagePromise = page.context().waitForEvent('page');
	await page.getByTestId('github.svg').click();
	const newPage = await pagePromise;
	await newPage.waitForLoadState();
	await expect(newPage).toHaveURL('https://github.com/mandarons');
});

test('should display top 10 countries sidebar', async ({ page }) => {
	await page.goto('/');
	const topCountriesHeading = page.locator('text=Top 10 Countries');
	await expect(topCountriesHeading).toBeVisible();
});

test('should display interactive map', async ({ page }) => {
	await page.goto('/');
	const map = page.getByTestId('interactive-map');
	await expect(map).toBeVisible();
});

test('should have clickable country items in top 10 list', async ({ page }) => {
	await page.goto('/');
	// Wait for at least one country item to appear
	const countryItems = page.locator('[data-testid^="country-item-"]');
	await expect(countryItems.first()).toBeVisible();
	const count = await countryItems.count();
	expect(count).toBeGreaterThan(0);
	expect(count).toBeLessThanOrEqual(10);
});

test('should display engagement health dashboard', async ({ page }) => {
	await page.goto('/');
	const dashboard = page.getByTestId('engagement-health-dashboard');
	await expect(dashboard).toBeVisible();
});

test('should show health indicator emoji', async ({ page }) => {
	await page.goto('/');
	const healthIndicator = page.getByTestId('health-indicator');
	await expect(healthIndicator).toBeVisible();
	const indicatorText = await healthIndicator.textContent();
	// Should be one of the three health indicators
	expect(['🟢', '🟡', '🔴']).toContain(indicatorText?.trim());
});

test('should display engagement ratio percentage', async ({ page }) => {
	await page.goto('/');
	const engagementRatio = page.getByTestId('engagement-ratio');
	await expect(engagementRatio).toBeVisible();
	const ratioText = await engagementRatio.textContent();
	expect(ratioText).toMatch(/\d+\.\d+%/);
});

test('should display health status label', async ({ page }) => {
	await page.goto('/');
	const healthStatus = page.getByTestId('health-status');
	await expect(healthStatus).toBeVisible();
	const statusText = await healthStatus.textContent();
	// Should be one of the three health status labels
	expect(['Excellent', 'Good', 'Needs Attention']).toContain(statusText?.trim());
});

test('should display monthly active and total installations breakdown', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('monthly-active-count')).toBeVisible();
	await expect(page.getByTestId('total-installations-count')).toBeVisible();
});
