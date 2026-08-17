import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('City Command HQ Surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('CITY-01: /city/overview renders full GIS Command Canvas', async ({ page }) => {
    await page.goto('/city/overview');
    await expect(page).toHaveURL(/\/city\/overview/);

    await expect(page.locator('.top-header__title')).toContainText(/CyberSphere/i);
    await expect(page.locator('.header-status-pill')).toBeVisible();
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
    await expect(page.locator('.canvas-hud-bottom')).toBeVisible();
  });

  test('CITY-02: /city/intelligence renders risk dashboard and AI confirmation barrier', async ({ page }) => {
    await page.goto('/city/intelligence');
    await expect(page).toHaveURL(/\/city\/intelligence/);

    await expect(page.locator('.page-header__title')).toContainText(/Crime Intelligence & Spatial Risk Analysis/i);
    await expect(page.locator('.stats-grid')).toBeVisible();

    const predictBtn = page.locator('button:has-text("Execute AI Prediction")');
    await expect(predictBtn).toBeVisible();
    await predictBtn.click();

    const modalTitle = page.locator('#confirm-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText(/Execute AI Risk Prediction/i);

    await page.click('button:has-text("Cancel")');
    await expect(modalTitle).not.toBeVisible();
  });

  test('CITY-03: /city/firs renders FIR management and dossier generator', async ({ page }) => {
    await page.goto('/city/firs');
    await expect(page).toHaveURL(/\/city\/firs/);

    await expect(page.locator('.page-header__title')).toContainText(/Central FIR Repository/i);
    await expect(page.locator('button[type="submit"]')).toContainText(/Officially Register FIR/i);
  });

  test('CITY-04: /city/users renders personnel directory', async ({ page }) => {
    await page.goto('/city/users');
    await expect(page).toHaveURL(/\/city\/users/);

    await expect(page.locator('.page-header__title')).toContainText(/Personnel & Authorization Management/i);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test('CITY-05: /city/reports renders diagnostics and export options', async ({ page }) => {
    await page.goto('/city/reports');
    await expect(page).toHaveURL(/\/city\/reports/);

    await expect(page.locator('.page-header__title')).toContainText(/System Diagnostics & Compliance Reports/i);
    await expect(page.locator('button:has-text("Export Legal Dossier")').first()).toBeVisible();
  });

  test('CITY-06: /city/history renders operational case history and filters', async ({ page }) => {
    await page.goto('/city/history');
    await expect(page).toHaveURL(/\/city\/history/);

    await expect(page.locator('.page-header__title')).toContainText(/Operational Audit & Case History/i);
    await expect(page.locator('.filter-pills-bar')).toBeVisible();
    await expect(page.locator('select.filter-select').first()).toBeVisible();
  });

  test('CITY-07: /city/history/:id renders incident audit page', async ({ page }) => {
    await page.goto('/city/history/1');
    await expect(page).toHaveURL(/\/city\/history\/1/);
    await expect(page.locator('.app-layout__main')).toBeVisible();
  });
});
