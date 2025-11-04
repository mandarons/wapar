import { test, expect } from '@playwright/test';

// Get deployed URLs from environment
const FRONTEND_URL = process.env.STAGING_FRONTEND_URL || 'http://localhost:4173';
const API_URL = process.env.STAGING_API_URL || 'http://localhost:8787';

test.describe('Deployed Frontend Integration Tests', () => {
  
  test('should load the main page', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that main content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Verify page has loaded successfully (not showing error)
    const pageText = await page.textContent('body');
    expect(pageText).toBeTruthy();
  });

  test('should display overview metrics', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Wait for data to load from API
    await page.waitForLoadState('networkidle');
    
    // Check that overview card is visible
    const overviewCard = page.getByTestId('overview-card');
    await expect(overviewCard).toBeVisible();
    
    // Check that metrics are displayed
    await expect(page.getByTestId('active-installations')).not.toBeEmpty();
    await expect(page.getByTestId('total-installations')).not.toBeEmpty();
    await expect(page.getByTestId('stale-installations')).not.toBeEmpty();
  });

  test('should display geographic visualization', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    await page.waitForLoadState('networkidle');
    
    // Navigate to geography tab
    await page.getByTestId('tab-geography').click();
    
    // Check for geographic map
    const map = page.getByTestId('interactive-map');
    await expect(map).toBeVisible();
    
    // Verify SVG map is rendered
    await expect(map.locator('svg').first()).toBeVisible();
  });

  test('API should return valid usage data', async ({ request }) => {
    // Direct API test using Playwright's request context
    const response = await request.get(`${API_URL}/api/usage`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('totalInstallations');
    expect(data).toHaveProperty('activeInstallations');
    expect(data).toHaveProperty('monthlyActive');
    
    // Verify types
    expect(typeof data.totalInstallations).toBe('number');
    expect(typeof data.activeInstallations).toBe('number');
    expect(typeof data.monthlyActive).toBe('number');
  });

  test('API should return installation stats', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/installation-stats`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('totalInstallations');
    expect(data).toHaveProperty('activeInstallations');
    expect(data).toHaveProperty('staleInstallations');
    
    // Verify types
    expect(typeof data.totalInstallations).toBe('number');
    expect(typeof data.activeInstallations).toBe('number');
    expect(typeof data.staleInstallations).toBe('number');
  });

  test('API should return version analytics', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/version-analytics`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Returns an object with versionDistribution array
    expect(data).toHaveProperty('versionDistribution');
    expect(Array.isArray(data.versionDistribution)).toBe(true);
  });

  test('API should return recent installations', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/recent-installations`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Returns an object with installations array
    expect(data).toHaveProperty('installations');
    expect(Array.isArray(data.installations)).toBe(true);
  });

  test('API should return new installations', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/new-installations`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Returns an object with summary and timeline
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('timeline');
  });

  test('API should return heartbeat analytics', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/heartbeat-analytics`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Returns an object with activeUsers and engagementLevels
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('engagementLevels');
  });

  test('should display distribution insights', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    await page.waitForLoadState('networkidle');
    
    // Navigate to distribution tab
    await page.getByTestId('tab-distribution').click();
    
    // Wait for chart to load
    await page.waitForTimeout(1000);
    
    // Verify distribution content is visible
    await expect(page.locator('text=Distribution insights')).toBeVisible();
  });

  test('should handle manual refresh', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    await page.waitForLoadState('networkidle');
    
    // Find and click refresh button
    const refreshButton = page.getByTestId('manual-refresh-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForLoadState('networkidle');
    
    // Verify page is still functional
    await expect(page.getByTestId('overview-card')).toBeVisible();
  });

  test('should show last synced timestamp', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    await page.waitForLoadState('networkidle');
    
    // Check for last synced timestamp
    const lastSynced = page.getByTestId('last-synced');
    await expect(lastSynced).toBeVisible();
    await expect(lastSynced).toContainText(/Last synced:/i);
  });

  test('frontend should not crash on slow API responses', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Even if API is slow, page should render
    await page.waitForLoadState('domcontentloaded');
    
    // Body should be visible
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });
});
