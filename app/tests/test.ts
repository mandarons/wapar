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
	// Wait for data to load
	await page.waitForTimeout(1000);
	// Check if at least one country item exists
	const countryItems = page.locator('[data-testid^="country-item-"]');
	const count = await countryItems.count();
	expect(count).toBeGreaterThan(0);
	expect(count).toBeLessThanOrEqual(10);
});
