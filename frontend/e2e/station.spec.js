import { test, expect } from '@playwright/test';
import { loginAsStation } from './helpers.js';

test.describe('Station Command Surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStation(page);
  });

  test('STATION-01: /station/overview renders station console canvas', async ({ page }) => {
    await page.goto('/station/overview');
    await expect(page).toHaveURL(/\/station\/overview/);

    await expect(page.locator('.top-header__subtitle')).toContainText(/STATION OPERATIONS/i);
    await expect(page.locator('.command-canvas-map-container')).toBeVisible();
  });

  test('STATION-02: /station/dispatch renders unit assignment deck', async ({ page }) => {
    await page.goto('/station/dispatch');
    await expect(page).toHaveURL(/\/station\/dispatch/);

    await expect(page.locator('.page-header__title')).toContainText(/Patrol Fleet Dispatch Console/i);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('button:has-text("Dispatch Patrol Unit")')).toBeVisible();
  });

  test('STATION-03: /station/queue renders incident triage queue', async ({ page }) => {
    await page.goto('/station/queue');
    await expect(page).toHaveURL(/\/station\/queue/);

    await expect(page.locator('.page-header__title')).toContainText(/Station Incident & Complaint Queue/i);
    await expect(page.locator('button:has-text("Record Incident")')).toBeVisible();
  });

  test('STATION-04: /station/firs renders station FIR ledger', async ({ page }) => {
    await page.goto('/station/firs');
    await expect(page).toHaveURL(/\/station\/firs/);

    await expect(page.locator('.page-header__title')).toContainText(/Central FIR Repository/i);
  });

  test('STATION-05: /station/history renders station audit ledger', async ({ page }) => {
    await page.goto('/station/history');
    await expect(page).toHaveURL(/\/station\/history/);

    await expect(page.locator('.page-header__title')).toContainText(/Operational Audit & Case History/i);
  });
});
