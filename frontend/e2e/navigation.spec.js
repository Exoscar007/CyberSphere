import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStation } from './helpers.js';

test.describe('Navigation, Layout & Route Integrity', () => {
  test('NAV-01: City Command sidebar links navigate cleanly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/overview');

    await page.click('.sidebar a[href="/city/intelligence"]');
    await expect(page).toHaveURL(/\/city\/intelligence/);

    await page.click('.sidebar a[href="/city/firs"]');
    await expect(page).toHaveURL(/\/city\/firs/);

    await page.click('.sidebar a[href="/city/history"]');
    await expect(page).toHaveURL(/\/city\/history/);

    await page.click('.sidebar a[href="/city/users"]');
    await expect(page).toHaveURL(/\/city\/users/);

    await page.click('.sidebar a[href="/city/reports"]');
    await expect(page).toHaveURL(/\/city\/reports/);

    await page.click('.sidebar a[href="/city/overview"]');
    await expect(page).toHaveURL(/\/city\/overview/);
  });

  test('NAV-02: Station Console sidebar links navigate cleanly', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/overview');

    await page.click('.sidebar a[href="/station/dispatch"]');
    await expect(page).toHaveURL(/\/station\/dispatch/);

    await page.click('.sidebar a[href="/station/queue"]');
    await expect(page).toHaveURL(/\/station\/queue/);

    await page.click('.sidebar a[href="/station/firs"]');
    await expect(page).toHaveURL(/\/station\/firs/);

    await page.click('.sidebar a[href="/station/history"]');
    await expect(page).toHaveURL(/\/station\/history/);
  });

  test('NAV-03: Universal Command Palette (Ctrl+K) opens, filters, and navigates', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/overview');

    await page.click('.header-command-trigger');
    await expect(page.locator('.command-palette-modal')).toBeVisible();

    await page.fill('.command-palette__input', 'Reports');
    const firstResult = page.locator('.command-palette__item').first();
    await expect(firstResult).toContainText(/Reports/i);

    // Click result to navigate
    await firstResult.click();
    await expect(page).toHaveURL(/\/city\/reports/);
  });

  test('NAV-04: Header user profile dropdown displays details and closes on click outside', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/overview');

    await page.click('.user-profile-badge');
    await expect(page.locator('.profile-dropdown-menu')).toBeVisible();
    await expect(page.locator('.profile-dropdown-menu')).toContainText(/ID: 1/i);

    await page.click('body', { position: { x: 50, y: 50 } });
    await expect(page.locator('.profile-dropdown-menu')).not.toBeVisible();
  });

  test('NAV-05: Dynamic root / redirects to role-specific dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/city\/overview/);

    await loginAsStation(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/station\/overview/);
  });
});
