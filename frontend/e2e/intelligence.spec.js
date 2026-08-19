import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStation } from './helpers.js';

const mockSummary = {
  overview: {
    total_monitored_zones: 12,
    critical_zones: 3,
    high_risk_zones: 4,
    medium_risk_zones: 1,
    low_risk_zones: 4,
    active_patrol_coverage: 7,
    total_recent_incidents: 9,
    total_recent_firs: 11,
    dominant_city_threat: 'Vehicle Theft',
  },
  priority_queue: [
    {
      rank: 1,
      zone_name: 'Navrangpura Commercial',
      score: 83.7,
      risk_level: 'CRITICAL',
      trend: 'INCREASING',
      dominant_crime: 'Cyber & Financial Fraud',
      active_patrols: 2,
      recommendation: 'Increase high-visibility patrol density in Navrangpura Commercial during peak hours; prioritize active interdiction for Cyber & Financial Fraud.',
      priority_action: 'Increase Patrol Coverage',
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
    },
    {
      rank: 2,
      zone_name: 'Satellite Residential',
      score: 77.2,
      risk_level: 'CRITICAL',
      trend: 'INCREASING',
      dominant_crime: 'Vehicle Theft',
      active_patrols: 4,
      recommendation: 'Increase high-visibility patrol density in Satellite Residential during peak hours; prioritize active interdiction for Vehicle Theft.',
      priority_action: 'Increase Patrol Coverage',
      center: { type: 'Point', coordinates: [72.5136, 23.0277] },
    },
  ],
  zones: [
    {
      id: 34,
      zone_name: 'Navrangpura Commercial',
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
      radius_meters: 1000.0,
      score: 83.7,
      risk_level: 'CRITICAL',
      confidence: 0.92,
      model_status: 'baseline',
      prediction_period: 'Next 24 Hours',
      recent_incidents_count: 3,
      recent_firs_count: 5,
      recent_complaints_count: 0,
      dominant_crime: 'Cyber & Financial Fraud',
      dominant_crime_percentage: 37.5,
      active_patrols_count: 2,
      patrol_officers: ['patrol_patel', 'patrol_rathod'],
      trend: 'INCREASING',
      trend_label: '+100% increase in recent period',
      contributing_factors: [
        '3 recent incident(s) recorded in sector (1 critical, 1 high)',
        'Cyber & Financial Fraud is primary crime pattern (38% of sector volume)',
        '5 registered FIR investigation(s) active in vicinity',
        '2 active patrol unit(s) covering beat (patrol_patel, patrol_rathod)',
        'AI predictive risk score evaluated at 83.7 / 100 (CRITICAL)',
      ],
      recommendation: 'Increase high-visibility patrol density in Navrangpura Commercial during peak hours; prioritize active interdiction for Cyber & Financial Fraud.',
      priority_action: 'Increase Patrol Coverage',
      last_updated: '2026-08-18T22:05:03.981999Z',
    },
  ],
  user_scope: 'CITYWIDE COMMAND',
  timestamp: '2026-08-18T22:05:03.981999Z',
};

test.describe('Intelligence Layer & Police Decision Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/intelligence/summary/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummary),
      });
    });
    await page.route('**/api/ai/model-status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          is_ml_active: false,
          model_name: 'Baseline Statistical KDE',
          events_available: 29,
        }),
      });
    });
  });

  test('INTEL-01: Intelligence Dashboard mounts and renders Overview KPIs and Priority Queue', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Verify Page Header
    await expect(page.locator('.page-header__title')).toContainText('Crime Intelligence & Spatial Risk Analysis');

    // Verify Overview KPI Strip renders
    await expect(page.getByText('Monitored Sectors')).toBeVisible();
    await expect(page.getByText('Critical Risk Sectors')).toBeVisible();
    await expect(page.getByText('Active Patrol Coverage')).toBeVisible();

    // Verify Priority Queue Section
    await expect(page.getByText('PRIORITY INTELLIGENCE DISPATCH QUEUE')).toBeVisible();
    await expect(page.getByText('Navrangpura Commercial').first()).toBeVisible();
  });

  test('INTEL-02: Selecting a priority zone updates Decision Support panel and Tactical Recommendation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Wait for intelligence data to load
    await expect(page.getByText('POLICE DECISION SUPPORT', { exact: true })).toBeVisible();
    await expect(page.getByText('TACTICAL RECOMMENDATION')).toBeVisible();
    await expect(page.getByText('CONTRIBUTING OPERATIONAL FACTORS')).toBeVisible();

    // Verify presence of tactical recommendation text and contributing factors
    await expect(page.getByText(/Increase high-visibility patrol density/i).first()).toBeVisible();
    await expect(page.getByText(/recent incident.*recorded in sector/i).first()).toBeVisible();
  });

  test('INTEL-03: Risk Filter pills filter sectors', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Click Critical filter pill
    const criticalPill = page.getByRole('button', { name: 'Critical' });
    await expect(criticalPill).toBeVisible();
    await criticalPill.click();
    await page.waitForTimeout(300);
  });

  test('INTEL-04: Station isolation preserves station scope display', async ({ page }) => {
    await page.route('**/api/intelligence/summary/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockSummary,
          user_scope: 'Navrangpura Police Station (NAV-01)',
        }),
      });
    });

    await loginAsStation(page);
    await page.goto('/city/intelligence');

    await expect(page.locator('.page-header__title')).toContainText('Crime Intelligence & Spatial Risk Analysis');
    await expect(page.getByText('Navrangpura Police Station (NAV-01)')).toBeVisible();
  });
});
