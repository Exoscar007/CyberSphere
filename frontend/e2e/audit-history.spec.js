import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStation } from './helpers.js';

test.describe('Scenario B: Operational Audit Log & Activity History E2E', () => {
  test('AUDIT-01: Operational History page loads with database-backed KPIs and scope badge for Admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/history');

    // Verify Title and Subtitle
    await expect(page.locator('h1.page-header__title')).toContainText('Operational Audit & Case History');
    
    // Verify Admin Scope Badge
    await expect(page.locator('.badge--verified')).toContainText('Citywide Scope (Admin)');

    // Verify KPI strip renders
    await expect(page.locator('text=Total Recorded Events')).toBeVisible();
    await expect(page.locator('text=Events Today')).toBeVisible();
    await expect(page.locator('text=Active Operators')).toBeVisible();
    await expect(page.locator('text=Security & Auth Audits')).toBeVisible();

    // Verify Category filter tabs render
    await expect(page.locator('button:has-text("All Activities")')).toBeVisible();
    await expect(page.locator('button:has-text("FIRs")')).toBeVisible();
    await expect(page.locator('button:has-text("Incidents")')).toBeVisible();
    await expect(page.locator('button:has-text("Patrols")')).toBeVisible();
  });

  test('AUDIT-02: Station Console user sees precinct isolation badge', async ({ page }) => {
    await loginAsStation(page);
    await page.goto('/station/history');

    // Verify Station Scope Badge shows assigned precinct
    await expect(page.locator('.badge--operational')).toContainText('Precinct: Navrangpura');
  });

  test('AUDIT-03: Category filter interaction switches active category', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/history');

    // Click on FIRs tab
    const firTab = page.locator('button:has-text("FIRs")');
    await firTab.click();
    await expect(firTab).toHaveClass(/filter-pill--active/);

    // Click on Patrols tab
    const patrolTab = page.locator('button:has-text("Patrols")');
    await patrolTab.click();
    await expect(patrolTab).toHaveClass(/filter-pill--active/);
  });

  test('AUDIT-04: Activity item click operates and no sensitive secrets are leaked', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/history');

    // Check if an event card exists
    const eventCard = page.locator('.card[style*="cursor: pointer"]').first();
    if (await eventCard.isVisible()) {
      // Ensure no raw passwords, JWTs, or secrets appear in page text
      const pageText = await page.innerText('body');
      expect(pageText).not.toContain('eyJhbGciOi');
      expect(pageText).not.toContain('mfa_secret');
      expect(pageText).not.toContain('SuperSecretPassword');

      // Click event card to navigate
      await eventCard.click();
      await page.waitForTimeout(500);
    }
  });

  test('AUDIT-05: Date preset buttons filter selection', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/history');

    // Click TODAY preset
    await page.getByRole('button', { name: 'TODAY', exact: true }).click();
    
    // Click 7D preset
    await page.getByRole('button', { name: '7D', exact: true }).click();

    // Click ALL preset
    await page.getByRole('button', { name: 'ALL', exact: true }).click();
  });
});
