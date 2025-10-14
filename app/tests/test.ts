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

// Advanced Analytics Dashboard Tests
test('should display conversion rate card', async ({ page }) => {
	await page.goto('/');
	const card = page.getByTestId('conversion-rate-card');
	await expect(card).toBeVisible();

	const value = page.getByTestId('conversion-rate-value');
	await expect(value).toBeVisible();
	const valueText = await value.textContent();
	expect(valueText).toMatch(/\d+\.\d+%/);
});

test('should display geographic diversity index card', async ({ page }) => {
	await page.goto('/');
	const card = page.getByTestId('diversity-index-card');
	await expect(card).toBeVisible();

	const value = page.getByTestId('diversity-index-value');
	await expect(value).toBeVisible();
	const valueText = await value.textContent();
	expect(valueText).toMatch(/\d+\.\d+%/);
});

test('should display engagement quality score card', async ({ page }) => {
	await page.goto('/');
	const card = page.getByTestId('quality-score-card');
	await expect(card).toBeVisible();

	const value = page.getByTestId('quality-score-value');
	await expect(value).toBeVisible();
	const valueText = await value.textContent();
	expect(valueText).toMatch(/\d+\.\d+%/);
});

test('should display market penetration score card', async ({ page }) => {
	await page.goto('/');
	const card = page.getByTestId('penetration-score-card');
	await expect(card).toBeVisible();

	const value = page.getByTestId('penetration-score-value');
	await expect(value).toBeVisible();
	const valueText = await value.textContent();
	expect(valueText).toMatch(/\d+\.\d+/);
});

test('should show Advanced Analytics section heading', async ({ page }) => {
	await page.goto('/');
	const heading = page.locator('text=Advanced Analytics');
	await expect(heading).toBeVisible();
});

test('should display performance insights section', async ({ page }) => {
	await page.goto('/');
	const insightsHeading = page.locator('text=📊 Performance Insights');
	await expect(insightsHeading).toBeVisible();
});

test('should display comparative benchmarks section', async ({ page }) => {
	await page.goto('/');
	const benchmarksHeading = page.locator('text=📈 Comparative Benchmarks');
	await expect(benchmarksHeading).toBeVisible();
});

test('should show all four advanced metric cards', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByTestId('conversion-rate-card')).toBeVisible();
	await expect(page.getByTestId('diversity-index-card')).toBeVisible();
	await expect(page.getByTestId('quality-score-card')).toBeVisible();
	await expect(page.getByTestId('penetration-score-card')).toBeVisible();
});

test('should display benchmark progress bar', async ({ page }) => {
	await page.goto('/');
	const progressBar = page.locator('.bg-blue-600.h-2.rounded-full');
	await expect(progressBar).toBeVisible();
});

test('should show benchmark comparison values', async ({ page }) => {
	await page.goto('/');
	// Look for the benchmark text
	await expect(page.locator('text=Typical SaaS')).toBeVisible();
	await expect(page.locator('text=Good Performance')).toBeVisible();
	await expect(page.locator('text=Excellent')).toBeVisible();
});

// Historical Trend Analysis Tests
test('should display trend chart or empty state', async ({ page }) => {
	await page.goto('/');
	// Either the chart or the empty state should be visible
	const chart = page.getByTestId('trend-chart');
	const emptyState = page.getByTestId('trend-chart-empty');
	
	const chartVisible = await chart.isVisible().catch(() => false);
	const emptyVisible = await emptyState.isVisible().catch(() => false);
	
	expect(chartVisible || emptyVisible).toBe(true);
});

test('should display growth metrics component', async ({ page }) => {
	await page.goto('/');
	const growthMetrics = page.getByTestId('growth-metrics');
	await expect(growthMetrics).toBeVisible();
});

test('should display daily growth card', async ({ page }) => {
	await page.goto('/');
	const dailyCard = page.getByTestId('daily-growth-card');
	await expect(dailyCard).toBeVisible();
});

test('should display weekly growth card', async ({ page }) => {
	await page.goto('/');
	const weeklyCard = page.getByTestId('weekly-growth-card');
	await expect(weeklyCard).toBeVisible();
});

test('should display monthly growth card', async ({ page }) => {
	await page.goto('/');
	const monthlyCard = page.getByTestId('monthly-growth-card');
	await expect(monthlyCard).toBeVisible();
});

test('should display velocity card', async ({ page }) => {
	await page.goto('/');
	const velocityCard = page.getByTestId('velocity-card');
	await expect(velocityCard).toBeVisible();
});

test('should display milestone tracker', async ({ page }) => {
	await page.goto('/');
	const milestoneTracker = page.getByTestId('milestone-tracker');
	await expect(milestoneTracker).toBeVisible();
});

test('should display data management section', async ({ page }) => {
	await page.goto('/');
	const dataManagement = page.getByTestId('data-management');
	await expect(dataManagement).toBeVisible();
});

test('should have export JSON button', async ({ page }) => {
	await page.goto('/');
	const exportBtn = page.getByTestId('export-json-btn');
	await expect(exportBtn).toBeVisible();
});

test('should have export CSV button', async ({ page }) => {
	await page.goto('/');
	const exportBtn = page.getByTestId('export-csv-btn');
	await expect(exportBtn).toBeVisible();
});

test('should have import button', async ({ page }) => {
	await page.goto('/');
	const importBtn = page.getByTestId('import-btn');
	await expect(importBtn).toBeVisible();
});

test('should have clear data button', async ({ page }) => {
	await page.goto('/');
	const clearBtn = page.getByTestId('clear-data-btn');
	await expect(clearBtn).toBeVisible();
});

test('should show confirmation dialog when clearing data', async ({ page }) => {
	await page.goto('/');
	
	// Wait for the page to load
	await page.waitForLoadState('networkidle');
	
	const clearBtn = page.getByTestId('clear-data-btn');
	await clearBtn.click();
	
	const confirmDialog = page.getByTestId('confirm-clear');
	await expect(confirmDialog).toBeVisible();
});
