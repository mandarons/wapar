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
