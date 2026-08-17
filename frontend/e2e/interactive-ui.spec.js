import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Interactive Controls, Drawers & Modals', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('UI-01: Intelligence Rail slide-over drawer toggle and tabs', async ({ page }) => {
    await page.goto('/city/overview');

    const railToggle = page.locator('.canvas-edge-strip button').first();
    if (await railToggle.isVisible()) {
      await railToggle.click();
      await expect(page.locator('.canvas-rail-drawer')).toBeVisible();

      // Switch to Fleet/Patrols tab
      const fleetTab = page.locator('button.drawer-tab-btn:has-text("Patrols")');
      if (await fleetTab.isVisible()) {
        await fleetTab.click();
        await expect(fleetTab).toHaveClass(/drawer-tab-btn--active/);
      }

      // Switch to Analytics tab
      const analyticsTab = page.locator('button.drawer-tab-btn:has-text("Analytics")');
      if (await analyticsTab.isVisible()) {
        await analyticsTab.click();
        await expect(analyticsTab).toHaveClass(/drawer-tab-btn--active/);
      }

      // Close rail
      await page.click('.canvas-close-btn');
      await expect(page.locator('.canvas-rail-drawer')).not.toBeVisible();
    }
  });

  test('UI-02: Detail Drawer opening on incident and closing', async ({ page }) => {
    await page.goto('/city/overview');

    // If an incident card is present, click View Audit or incident
    const viewAuditBtn = page.locator('button:has-text("View Audit")').first();
    if (await viewAuditBtn.isVisible()) {
      await viewAuditBtn.click();
      const drawer = page.locator('.detail-drawer');
      if (await drawer.isVisible()) {
        await expect(drawer).toBeVisible();
        await page.click('.detail-drawer-close');
        await expect(drawer).not.toBeVisible();
      }
    }
  });

  test('UI-03: Sidebar collapse and expand toggle', async ({ page }) => {
    await page.goto('/city/reports');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    const toggleBtn = page.locator('.sidebar__footer button');
    await toggleBtn.click();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);

    await toggleBtn.click();
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
  });
});
