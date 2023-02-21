import { test, expect } from '@playwright/test';

test('should show usage summary', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('data-generated-at')).not.toBeEmpty();
    await expect(page.getByTestId('total-installations')).not.toBeEmpty();
    await expect(page.getByTestId('icloud-drive-docker-total-installations')).not.toBeEmpty();
    await expect(page.getByTestId('ha-bouncie-total-installations')).not.toBeEmpty();
});

test('should navigate to home page when clicked on favicon.svg', async ({ page }) => {
    await page.goto('/about');
    await page.getByTestId('favicon.svg').click();
    await expect(page).toHaveURL('/');
});

test('should navigate to GitHub.com when clicked on github.svg', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('github.svg').click();
    await expect(page).toHaveURL('https://github.com/mandarons');
});

test('should navigate to about page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=About');
    await expect(page).toHaveURL('/about');
    await expect(page.getByTestId('about-default')).toContainText('About Wapar');
});
