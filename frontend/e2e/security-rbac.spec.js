import { test, expect } from '@playwright/test';
import { clearSession, loginAsAdmin, loginAsStation } from './helpers.js';

test.describe('Security & Role Boundaries', () => {
  test('SEC-01: Unauthenticated route lockout', async ({ page }) => {
    await clearSession(page);
    await page.goto('/city/overview');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/city/users');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/station/overview');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/station/dispatch');
    await expect(page).toHaveURL(/\/login/);
  });

  test('SEC-02: Role-based layout sidebar enforcement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/overview');
    await expect(page.locator('.sidebar a[href="/city/overview"]')).toBeVisible();

    await loginAsStation(page);
    await page.goto('/station/overview');
    await expect(page.locator('.sidebar a[href="/station/overview"]')).toBeVisible();
    await expect(page.locator('.sidebar a[href="/station/dispatch"]')).toBeVisible();
  });
});
