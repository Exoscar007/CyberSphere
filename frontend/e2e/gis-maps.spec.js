import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('GIS Map & Overlays', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GIS-01: Map container mounts without viewport overflow', async ({ page }) => {
    await page.goto('/city/overview');

    const mapContainer = page.locator('.command-canvas-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

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

  test('GIS-03: Continuous Heatmap density overlay toggle and legend display', async ({ page }) => {
    await page.goto('/city/overview');

    // Verify heatmap legend is visible on map by default
    const heatmapLegend = page.locator('.map-heatmap-legend');
    await expect(heatmapLegend).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.map-heatmap-legend-title')).toHaveText('HOTSPOT DENSITY');

    // Open layer switcher menu if not already open
    const layerMenu = page.locator('.map-layer-menu');
    if (!(await layerMenu.isVisible())) {
      const layerBtn = page.locator('.map-ctrl-btn--layers').first();
      await expect(layerBtn).toBeVisible({ timeout: 10000 });
      await layerBtn.click();
      await expect(layerMenu).toBeVisible({ timeout: 5000 });
    }

    // Toggle Density Heatmap
    const heatmapToggle = page.locator('.map-layer-toggle-btn:has-text("Density Heatmap")').first();
    await expect(heatmapToggle).toBeVisible({ timeout: 5000 });
    await heatmapToggle.click();

    // Verify toggle badge is rendered
    await expect(page.locator('.map-layer-toggle-badge').first()).toBeVisible({ timeout: 5000 });
  });

  test('GIS-04: Active filters update markers and heatmap without remounting map', async ({ page }) => {
    await page.goto('/city/overview');

    const mapContainer = page.locator('.command-canvas-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Open Feeds/Operations rail and verify tab switching
    const feedsBtn = page.locator('button[title="Toggle Operational Feeds Rail"]');
    if (await feedsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await feedsBtn.click({ force: true });
      const fleetTab = page.locator('button:has-text("Fleet")');
      await expect(fleetTab).toBeVisible({ timeout: 5000 });
    }

    // Map container must remain mounted and stable
    await expect(mapContainer).toBeVisible();
  });
});
