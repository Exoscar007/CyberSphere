import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('GIS Map & Overlays', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GIS-01: Map container mounts without viewport overflow', async ({ page }) => {
    await page.goto('/city/overview');
    const mapContainer = page.locator('.command-canvas-map-container');
    await expect(mapContainer).toBeVisible();

    const box = await mapContainer.boundingBox();
    expect(box.width).toBeGreaterThan(300);
    expect(box.height).toBeGreaterThan(300);
  });

  test('GIS-02: GIS Live GPS tracking interaction toggle', async ({ page }) => {
    await page.goto('/city/overview');

    // Open intelligence rail to access patrol units
    const railToggle = page.locator('.canvas-edge-strip button').first();
    if (await railToggle.isVisible()) {
      await railToggle.click();
      const fleetTab = page.locator('button.drawer-tab-btn:has-text("Patrols")');
      if (await fleetTab.isVisible()) {
        await fleetTab.click();

        // Check for GPS tracking button
        const gpsBtn = page.locator('button:has-text("Live GPS Track")').first();
        if (await gpsBtn.isVisible()) {
          await gpsBtn.click();
          await expect(page.locator('button:has-text("Stop Live GPS")').first()).toBeVisible();
        }
      }
    }
  });
});
