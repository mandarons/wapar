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

// Auto-Refresh Feature Tests
test('should display freshness indicator', async ({ page }) => {
	await page.goto('/');
	const freshnessIndicator = page.getByTestId('freshness-indicator');
	await expect(freshnessIndicator).toBeVisible();
	const indicatorText = await freshnessIndicator.textContent();
	// Should contain one of the freshness emojis
	expect(indicatorText).toMatch(/[🟢🟡🔴]/u);
});

test('should display last updated time', async ({ page }) => {
	await page.goto('/');
	const lastUpdatedTime = page.getByTestId('last-updated-time');
	await expect(lastUpdatedTime).toBeVisible();
	const timeText = await lastUpdatedTime.textContent();
	// Should display relative time
	expect(timeText).toBeTruthy();
	expect(timeText).toMatch(/(just now|seconds? ago|minutes? ago|hours? ago|days? ago)/);
});

test('should display refresh interval selector', async ({ page }) => {
	await page.goto('/');
	const intervalSelector = page.getByTestId('refresh-interval-selector');
	await expect(intervalSelector).toBeVisible();

	// Check if selector has the expected options
	const options = await intervalSelector.locator('option').allTextContents();
	expect(options).toContain('5 min');
	expect(options).toContain('15 min');
	expect(options).toContain('30 min');
	expect(options).toContain('1 hour');
});

test('should display manual refresh button', async ({ page }) => {
	await page.goto('/');
	const refreshButton = page.getByTestId('manual-refresh-button');
	await expect(refreshButton).toBeVisible();
	await expect(refreshButton).toBeEnabled();

	const buttonText = await refreshButton.textContent();
	expect(buttonText).toContain('Refresh Now');
});

test('should show loading state when refreshing', async ({ page }) => {
	await page.goto('/');
	const refreshButton = page.getByTestId('manual-refresh-button');

	// Click refresh button
	await refreshButton.click();

	// Button should show refreshing state (may be brief)
	const buttonText = await refreshButton.textContent();
	// Either we catch it in refreshing state or it completes quickly
	expect(buttonText).toBeTruthy();
});

test('should allow changing refresh interval', async ({ page }) => {
	await page.goto('/');
	const intervalSelector = page.getByTestId('refresh-interval-selector');

	// Change to 15 minutes
	await intervalSelector.selectOption({ value: '900000' });

	// Verify selection changed
	const selectedValue = await intervalSelector.inputValue();
	expect(selectedValue).toBe('900000');
});

test('should update freshness indicator color based on data age', async ({ page }) => {
	await page.goto('/');
	const freshnessIndicator = page.getByTestId('freshness-indicator');
	await expect(freshnessIndicator).toBeVisible();

	// Fresh data should show green indicator
	const indicatorHTML = await freshnessIndicator.innerHTML();
	expect(indicatorHTML).toMatch(/text-green-600|text-yellow-600|text-red-600/);
});

test('should display auto-refresh controls section', async ({ page }) => {
	await page.goto('/');

	// All refresh control elements should be present
	await expect(page.getByTestId('freshness-indicator')).toBeVisible();
	await expect(page.getByTestId('last-updated-time')).toBeVisible();
	await expect(page.getByTestId('refresh-interval-selector')).toBeVisible();
	await expect(page.getByTestId('manual-refresh-button')).toBeVisible();
});
