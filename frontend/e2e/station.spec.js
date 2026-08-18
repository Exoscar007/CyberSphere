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

  test('STATION-06: /station/dispatch generates optimized patrol route and renders waypoint metrics', async ({ page }) => {
    await page.route('**/api/patrol/optimize-route/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          officer: {
            id: 2,
            username: 'station_navrangpura',
            badge_number: 'GJ-01-NAV',
            start_location: { lat: 23.033, lng: 72.565, label: 'Navrangpura Base' },
          },
          total_distance_km: 4.85,
          estimated_time_minutes: 18,
          waypoints_count: 3,
          waypoints: [
            {
              sequence: 1,
              incident_id: 101,
              title: 'Theft Report',
              severity: 'CRITICAL',
              status: 'OPEN',
              lat: 23.036,
              lng: 72.568,
              leg_distance_km: 1.2,
              est_arrival_minutes: 6,
            },
            {
              sequence: 2,
              incident_id: 102,
              title: 'Vandalism Sector 4',
              severity: 'HIGH',
              status: 'OPEN',
              lat: 23.040,
              lng: 72.572,
              leg_distance_km: 1.65,
              est_arrival_minutes: 12,
            },
            {
              sequence: 3,
              incident_id: 103,
              title: 'Traffic Blockade',
              severity: 'MEDIUM',
              status: 'OPEN',
              lat: 23.045,
              lng: 72.575,
              leg_distance_km: 2.0,
              est_arrival_minutes: 18,
            },
          ],
          route_geometry: [
            [23.033, 72.565],
            [23.036, 72.568],
            [23.040, 72.572],
            [23.045, 72.575],
          ],
          message: 'Successfully generated optimal 3-stop patrol route.',
        }),
      });
    });

    await page.goto('/station/dispatch');
    await expect(page).toHaveURL(/\/station\/dispatch/);

    // Verify Route Optimizer Card exists
    const optimizerCard = page.locator('[data-testid="patrol-route-optimizer-card"]');
    await expect(optimizerCard).toBeVisible();
    await expect(optimizerCard).toContainText(/Patrol Route Optimization/i);

    // Click Generate Optimized Route
    const generateBtn = page.locator('[data-testid="generate-route-btn"]');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify Metrics and Route Itinerary Table appear
    await expect(page.locator('[data-testid="route-metrics-summary"]')).toBeVisible({ timeout: 6000 });
    await expect(optimizerCard).toContainText(/Total Route Distance/i);
    await expect(optimizerCard).toContainText(/Optimal Waypoint Stops/i);
    await expect(optimizerCard).toContainText(/Stop-By-Stop Waypoint Sequence/i);
  });
});


