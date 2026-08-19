import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStation } from './helpers.js';

const mockBaseSummary = {
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
      recommendation: 'Increase high-visibility patrol density in Navrangpura Commercial during peak hours.',
      priority_action: 'Increase Patrol Coverage',
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
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
      patrol_officers: ['patrol_patel'],
      trend: 'INCREASING',
      trend_label: '+100% increase in recent period',
      contributing_factors: [
        '3 recent incident(s) recorded in sector',
        'AI predictive risk score evaluated at 83.7 / 100',
      ],
      recommendation: 'Increase high-visibility patrol density in Navrangpura Commercial.',
      priority_action: 'Increase Patrol Coverage',
      last_updated: '2026-08-18T22:05:03.981999Z',
    },
  ],
  user_scope: 'CITYWIDE COMMAND',
  timestamp: '2026-08-18T22:05:03.981999Z',
};

const mockCyberSummary = {
  overview: {
    total_cybercrime: 5,
    total_physical_crime: 12,
    total_crime: 17,
    cybercrime_percentage: 29.4,
    category_breakdown: {
      financial_fraud: 2,
      phishing: 2,
      identity_theft: 1,
      cyber_fraud: 0,
      online_scam: 0,
      other_cyber: 0,
    },
    active_cyber_hotspots: 3,
    emerging_threats_count: 1,
  },
  top_hotspot: {
    zone_name: 'Navrangpura Commercial',
    station_name: 'Navrangpura Police Station',
    station_code: 'NAV-01',
    station_id: 1,
    latitude: 23.0395,
    longitude: 72.5571,
    center: { type: 'Point', coordinates: [72.5571, 23.0395] },
    cybercrime_count: 3,
    physical_crime_count: 5,
    total_crime_count: 8,
    cybercrime_ratio: 37.5,
    dominant_type: 'Financial & Banking Fraud',
    fraud_count: 2,
    phishing_count: 1,
    identity_count: 0,
    scam_count: 0,
    trend: 'INCREASING',
    trend_label: '+50% increase in recent period',
    threat_level: 'CRITICAL',
    recent_activity: '2026-08-19T02:30:00Z',
    explanation: '3 cybercrime events detected (2 Financial Fraud, 1 Phishing), representing 38% of local crime activity.',
    ai_context: {
      ai_risk_score: 83.7,
      ai_risk_level: 'CRITICAL',
      ai_model_status: 'baseline',
    },
  },
  hotspots: [
    {
      zone_name: 'Navrangpura Commercial',
      station_name: 'Navrangpura Police Station',
      station_code: 'NAV-01',
      station_id: 1,
      latitude: 23.0395,
      longitude: 72.5571,
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
      cybercrime_count: 3,
      physical_crime_count: 5,
      total_crime_count: 8,
      cybercrime_ratio: 37.5,
      dominant_type: 'Financial & Banking Fraud',
      fraud_count: 2,
      phishing_count: 1,
      identity_count: 0,
      scam_count: 0,
      trend: 'INCREASING',
      trend_label: '+50% increase in recent period',
      threat_level: 'CRITICAL',
      recent_activity: '2026-08-19T02:30:00Z',
      explanation: '3 cybercrime events detected (2 Financial Fraud, 1 Phishing), representing 38% of local crime activity.',
      ai_context: {
        ai_risk_score: 83.7,
        ai_risk_level: 'CRITICAL',
        ai_model_status: 'baseline',
      },
    },
    {
      zone_name: 'Satellite Residential',
      station_name: 'Satellite Police Station',
      station_code: 'SAT-02',
      station_id: 2,
      latitude: 23.0277,
      longitude: 72.5136,
      center: { type: 'Point', coordinates: [72.5136, 23.0277] },
      cybercrime_count: 2,
      physical_crime_count: 4,
      total_crime_count: 6,
      cybercrime_ratio: 33.3,
      dominant_type: 'Phishing & Credential Theft',
      fraud_count: 0,
      phishing_count: 2,
      identity_count: 0,
      scam_count: 0,
      trend: 'STABLE',
      trend_label: 'Activity rate stable',
      threat_level: 'HIGH',
      recent_activity: '2026-08-19T01:15:00Z',
      explanation: '2 phishing incidents reported involving fake academic exam portals.',
      ai_context: {
        ai_risk_score: 73.5,
        ai_risk_level: 'HIGH',
        ai_model_status: 'baseline',
      },
    },
  ],
  emerging_threats: [
    {
      id: 'cyber-alert-nav-01-surge',
      zone: 'Navrangpura Commercial',
      station_name: 'Navrangpura Police Station',
      station_code: 'NAV-01',
      threat_type: 'SURGE_FINANCIAL_FRAUD',
      title: 'Financial & Banking Fraud Surge',
      current_count: 3,
      previous_count: 1,
      change_percent: '+40%',
      severity: 'CRITICAL',
      explanation: 'Financial fraud activity elevated in Navrangpura Commercial with 2 cases concentrated in jurisdiction.',
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
      dominant_type: 'Financial & Banking Fraud',
      timestamp: '2026-08-19T03:00:00Z',
    },
  ],
  user_scope: 'CITYWIDE CYBER COMMAND',
  timestamp: '2026-08-19T03:00:00Z',
};

const mockCyberCorrelations = {
  correlations: [
    {
      zone: 'Navrangpura Commercial',
      station_name: 'Navrangpura Police Station',
      station_code: 'NAV-01',
      center: { type: 'Point', coordinates: [72.5571, 23.0395] },
      physical_crimes: 5,
      cybercrimes: 3,
      total_crimes: 8,
      cybercrime_ratio: 37.5,
      physical_trend: 'INCREASING',
      physical_trend_label: '+30% increase',
      cyber_trend: 'INCREASING',
      cyber_trend_label: '+50% increase',
      correlation_status: 'CONVERGING',
      explanation: 'Both physical crime (+5) and cybercrime (+3) are increasing simultaneously, indicating compounding operational strain across both digital and street enforcement.',
    },
  ],
  timestamp: '2026-08-19T03:00:00Z',
};

test.describe('Cybercrime Intelligence Layer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/intelligence/summary/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBaseSummary),
      });
    });

    await page.route('**/api/ai/model-status/**', async (route) => {
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

    await page.route('**/api/intelligence/cybercrime/summary/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCyberSummary),
      });
    });

    await page.route('**/api/intelligence/cybercrime/correlations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCyberCorrelations),
      });
    });
  });

  test('CYBER-01: Cyber Intelligence tab switch renders Overview KPIs and Active Threat alerts', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Click CYBER INTELLIGENCE tab
    const cyberTab = page.getByRole('button', { name: /CYBER INTELLIGENCE/i });
    await expect(cyberTab).toBeVisible();
    await cyberTab.click();

    // Verify Cyber KPI Strip
    await expect(page.getByText('Total Cybercrime').first()).toBeVisible();
    await expect(page.getByText('Financial Fraud').first()).toBeVisible();
    await expect(page.getByText('Phishing Scams').first()).toBeVisible();
    await expect(page.getByText('Emerging Threats').first()).toBeVisible();

    // Verify Emerging Cyber Threat Alert
    await expect(page.getByText('EMERGING CYBER THREATS')).toBeVisible();
    await expect(page.getByText('Financial & Banking Fraud Surge').first()).toBeVisible();
    await expect(page.getByText('+40% Surge').first()).toBeVisible();
  });

  test('CYBER-02: Cybercrime Hotspots panel and detail view displays database metrics and AI context', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Verify Cybercrime Hotspot Intelligence Card
    await expect(page.getByText('CYBERCRIME HOTSPOT INTELLIGENCE')).toBeVisible();
    await expect(page.getByText('Navrangpura Commercial').first()).toBeVisible();
    await expect(page.getByText('DOMINANT CYBER PATTERN')).toBeVisible();
    await expect(page.getByText('Financial & Banking Fraud').first()).toBeVisible();

    // Verify Contextual AI Risk Score display
    await expect(page.getByText('AI PREDICTIVE RISK (CONTEXT)')).toBeVisible();
    await expect(page.getByText(/83.7 \/ 100/i)).toBeVisible();

    // Verify Ranked Jurisdictions list
    await expect(page.getByText('Ranked Cybercrime Jurisdictions')).toBeVisible();
    await expect(page.getByText('#1 Navrangpura Commercial')).toBeVisible();
  });

  test('CYBER-03: Physical vs Cybercrime correlation section renders and explains convergence', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Verify Correlation section
    await expect(page.getByText('PHYSICAL + CYBERCRIME CORRELATION ANALYSIS')).toBeVisible();
    await expect(page.getByText('⚠️ CONVERGING').first()).toBeVisible();
    await expect(page.getByText(/Both physical crime.*and cybercrime.*are increasing simultaneously/i).first()).toBeVisible();
  });

  test('CYBER-04: Station Isolation displays jurisdictional scope for station console user', async ({ page }) => {
    await page.route('**/api/intelligence/summary/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockBaseSummary,
          user_scope: 'Navrangpura Police Station (NAV-01)',
        }),
      });
    });

    await page.route('**/api/intelligence/cybercrime/summary/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockCyberSummary,
          user_scope: 'Navrangpura Police Station (NAV-01)',
        }),
      });
    });

    await loginAsStation(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Verify jurisdictional station scope badge
    await expect(page.getByText('Navrangpura Police Station (NAV-01)')).toBeVisible();
  });

  test('CYBER-05: GIS map renders cyber markers, and [INSPECT] button synchronizes selection and detail panel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Verify GIS Map legend
    await expect(page.getByText('CRITICAL THREAT').first()).toBeVisible();
    await expect(page.getByText('HIGH THREAT').first()).toBeVisible();

    // Click [INSPECT] on Emerging Threat card
    const inspectBtn = page.getByRole('button', { name: /inspect navrangpura/i }).or(page.getByText('[INSPECT]').first());
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Verify detail panel updates to Navrangpura Commercial
    await expect(page.getByText('CYBERCRIME HOTSPOT INTELLIGENCE')).toBeVisible();
    await expect(page.getByText('Navrangpura Commercial').first()).toBeVisible();
  });

  test('CYBER-06: Cyber sector search filters hotspots and focuses matching jurisdiction', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Search for "Satellite"
    const searchInput = page.getByPlaceholder('Search cyber sectors...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Satellite');

    // Verify list filtered to Satellite
    await expect(page.getByText('#1 Satellite Residential')).toBeVisible();
    await expect(page.getByText('#1 Navrangpura Commercial')).not.toBeVisible();

    // Search for non-existent sector
    await searchInput.fill('NonExistentZone');
    await expect(page.getByText(/No matching cyber sector found for "NonExistentZone"/i)).toBeVisible();
  });

  test('CYBER-07: Threat level filter buttons filter hotspots accurately', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/intelligence');

    // Switch to Cyber tab
    await page.getByRole('button', { name: /CYBER INTELLIGENCE/i }).click();

    // Click "High" filter
    const highBtn = page.getByRole('button', { name: /^High$/i });
    await expect(highBtn).toBeVisible();
    await highBtn.click();

    // Verify Satellite is visible (HIGH) and Navrangpura is filtered out (CRITICAL)
    await expect(page.getByText('#1 Satellite Residential')).toBeVisible();
    await expect(page.getByText('#1 Navrangpura Commercial')).not.toBeVisible();

    // Click "ALL" filter
    const allBtn = page.getByRole('button', { name: /^ALL$/i });
    await allBtn.click();
    await expect(page.getByText('#1 Navrangpura Commercial')).toBeVisible();
    await expect(page.getByText('#2 Satellite Residential')).toBeVisible();
  });
});
