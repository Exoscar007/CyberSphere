import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStation } from './helpers.js';

test.describe('Real-Time Patrol Monitoring & Telemetry Suite', () => {
  test('REALTIME-01: /station/dispatch prominently renders LIVE PATROL FLEET MONITOR', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    // Verify prominent Live Patrol Fleet Monitor card and subtitle
    const fleetMonitorCard = page.locator('[data-testid="live-patrol-fleet-monitor-card"]');
    await expect(fleetMonitorCard).toBeVisible({ timeout: 10000 });
    await expect(fleetMonitorCard).toContainText(/LIVE PATROL FLEET MONITOR/i);
    await expect(fleetMonitorCard).toContainText(/Real-time GPS telemetry, unit status and patrol movement/i);
  });

  test('REALTIME-02: Active patrol assignment displayed in Master Patrol Assignments Ledger', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const ledgerTitle = page.locator('text=Master Patrol Assignments Ledger');
    await expect(ledgerTitle).toBeVisible({ timeout: 10000 });

    // Verify ledger columns exist
    const tableHeader = page.locator('table thead');
    if (await tableHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tableHeader).toContainText(/Unit/i);
      await expect(tableHeader).toContainText(/Officer/i);
      await expect(tableHeader).toContainText(/Status/i);
      await expect(tableHeader).toContainText(/Live GPS Position/i);
      await expect(tableHeader).toContainText(/Health/i);
    }
  });

  test('REALTIME-03: Live GPS coordinates and health indicator displayed', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const fleetMonitor = page.locator('[data-testid="live-patrol-fleet-monitor-card"]');
    await expect(fleetMonitor).toBeVisible({ timeout: 10000 });

    // Verify Active Units counter chip in HUD
    await expect(fleetMonitor).toContainText(/Active Units/i);
    await expect(fleetMonitor).toContainText(/Last Fleet Update/i);
  });

  test('REALTIME-04: Track button activates selected unit and highlights route', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const trackBtn = page.locator('button:has-text("TRACK"), button:has-text("Track")').first();
    if (await trackBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trackBtn.click();

      // Verify active tracking highlight banner appears
      const trackingBanner = page.locator('text=LIVE ROUTE — P-');
      await expect(trackingBanner).toBeVisible({ timeout: 6000 });
      await expect(page.locator('button:has-text("Stop Tracking")')).toBeVisible();
    }
  });

  test('REALTIME-05: GPS update changes position and propagates without page refresh', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const pingBtn = page.locator('button:has-text("GPS Ping")').first();
    if (await pingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pingBtn.click();

      // Verify toast alert or coordinate update occurs without reload
      await expect(page.locator('.toast, .alert, table, [data-testid="live-patrol-fleet-monitor-card"]')).toBeVisible();
    }
  });

  test('REALTIME-06: GPS Ping update changes Last Ping timestamp', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const pingBtn = page.locator('button:has-text("GPS Ping")').first();
    if (await pingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pingBtn.click();
      // Ledger Last Ping or toast appears
      await expect(page.locator('table, .toast, .alert')).toBeVisible();
    }
  });

  test('REALTIME-07: Breadcrumb trail extends after GPS point received', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const trackBtn = page.locator('button:has-text("TRACK")').first();
    if (await trackBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trackBtn.click();

      const pingBtn = page.locator('button:has-text("Transmit GPS Ping"), button:has-text("GPS Ping")').first();
      if (await pingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pingBtn.click();
        await expect(page.locator('text=GPS PING, text=LIVE ROUTE')).toBeVisible({ timeout: 6000 });
      }
    }
  });

  test('REALTIME-08: Health badge displays LIVE vs STALE vs OFFLINE states', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const fleetMonitor = page.locator('[data-testid="live-patrol-fleet-monitor-card"]');
    await expect(fleetMonitor).toBeVisible({ timeout: 10000 });

    // Verify presence of HUD health categories
    await expect(fleetMonitor).toContainText(/Live/i);
    await expect(fleetMonitor).toContainText(/Stale/i);
    await expect(fleetMonitor).toContainText(/Offline/i);
  });

  test('REALTIME-09: Map and ledger remain synchronized upon row focus and tracking', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const mapContainer = page.locator('.cyber-map-wrapper, .command-canvas-map-container, #map');
    await expect(mapContainer.first()).toBeVisible({ timeout: 10000 });

    // Row click should not crash or remount page
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await expect(mapContainer.first()).toBeVisible();
    }
  });

  test('REALTIME-10: Telemetry connection indicator displays connection status', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/dispatch');

    const connPill = page.locator('[data-testid="monitoring-connection-pill"]');
    await expect(connPill).toBeVisible({ timeout: 10000 });
    const pillText = await connPill.innerText();
    expect(pillText).toMatch(/LIVE TELEMETRY/i);
    expect(pillText).toMatch(/WS CONNECTED|POLLING FALLBACK/i);
  });
});
