import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Responsive Layouts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('RESP-01: 1440px Desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/city/overview');
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
    await expect(page.locator('.canvas-hud-search')).toBeVisible();
    await expect(page.locator('.canvas-hud-status')).toBeVisible();
  });

  test('RESP-02: 1280px Laptop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/city/overview');
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
    await expect(page.locator('.canvas-hud-search')).toBeVisible();
  });

  test('RESP-03: 1024px Compact laptop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/city/overview');
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
    await expect(page.locator('.canvas-hud-search')).toBeVisible();
  });

  test('RESP-04: 768px Tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/city/overview');
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
  });

  test('RESP-05: 375px Mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/city/overview');
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
  });
});
