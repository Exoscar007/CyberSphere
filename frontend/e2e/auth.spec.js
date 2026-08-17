import { test, expect } from '@playwright/test';
import { clearSession } from './helpers.js';

test.describe('Authentication & Session Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('AUTH-01: Login page initial render', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/CyberSphere/i);
    await expect(page.locator('h1')).toContainText(/CyberSphere/i);
    await expect(page.locator('text=Command & Control • GIS Intelligence Platform')).toBeVisible();
    await expect(page.getByText('RESTRICTED', { exact: true })).toBeVisible();
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('AUTH-02: Valid Admin login flow and session persistence', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock-access-token-admin',
          refresh: 'mock-refresh-token-admin',
          user: { id: 1, username: 'admin', role: 'ADMIN' },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'Admin@12345');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/city\/overview/);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBe('mock-access-token-admin');
  });

  test('AUTH-03: Valid Station login flow and station redirect', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock-access-token-station',
          refresh: 'mock-refresh-token-station',
          user: { id: 2, username: 'station_navrangpura', role: 'STATION', station_name: 'Navrangpura' },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'station_navrangpura');
    await page.fill('input#password', 'Station@12345');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/station\/overview/);
  });

  test('AUTH-04: Invalid credentials error handling', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials. Please verify your Service ID and Key.' }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'unknown_officer');
    await page.fill('input#password', 'wrong_pass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.alert--error')).toBeVisible();
    await expect(page.locator('.alert--error')).toContainText(/Invalid credentials/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-05: Protected route redirect when unauthenticated', async ({ page }) => {
    await page.goto('/city/overview');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/station/dispatch');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-06: Session logout clears tokens and redirects to login', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-admin-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', role: 'ADMIN' }));
    });

    await page.goto('/city/reports');
    await page.click('.user-profile-badge');
    await expect(page.locator('.profile-dropdown-menu')).toBeVisible();

    await page.click('button:has-text("Terminate Session")');
    await expect(page).toHaveURL(/\/login/);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });
});
