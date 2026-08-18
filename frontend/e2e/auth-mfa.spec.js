import { test, expect } from '@playwright/test';
import { clearSession, loginAsAdmin } from './helpers.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

test.describe('Multi-Factor Authentication (MFA/TOTP) Verification Suite', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    // Automatically handle CORS preflight requests
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
        });
      } else {
        await route.continue();
      }
    });
  });

  test('MFA-01: Standard password-only login succeeds with zero MFA prompt', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          mfa_required: false,
          access: 'mock-access-token-standard',
          refresh: 'mock-refresh-token-standard',
          user: { id: 1, username: 'admin', role: 'ADMIN', mfa_enabled: false },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'Admin@12345');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/city\/overview/);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBe('mock-access-token-standard');
  });

  test('MFA-02: MFA-enabled account displays Step 2 Security Verification challenge', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          mfa_required: true,
          mfa_token: 'mock-short-lived-challenge-jwt',
          user: { id: 1, username: 'mfa_officer', role: 'ADMIN', mfa_enabled: true },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'mfa_officer');
    await page.fill('input#password', 'SecOps@2026!');
    await page.click('button[type="submit"]');

    // Verification screen assertions
    await expect(page.getByText('Security Verification', { exact: true })).toBeVisible();
    await expect(page.getByText('Multi-factor authentication is required', { exact: false })).toBeVisible();
    await expect(page.locator('input#otp_code')).toBeVisible();
    await expect(page.locator('button#mfa-verify-button')).toBeVisible();
    await expect(page.getByText('← Back to sign in')).toBeVisible();

    // Ensure tokens are NOT set before MFA verification
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });

  test('MFA-03: Valid 6-digit TOTP verification issues JWT and navigates to operations', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          mfa_required: true,
          mfa_token: 'mock-challenge-jwt',
          user: { id: 1, username: 'mfa_officer', role: 'ADMIN', mfa_enabled: true },
        }),
      });
    });

    await page.route('**/api/auth/mfa/verify/', async (route) => {
      const payload = JSON.parse(route.request().postData());
      expect(payload.mfa_token).toBe('mock-challenge-jwt');
      expect(payload.otp_code).toBe('482910');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          access: 'mock-mfa-verified-jwt-token',
          refresh: 'mock-mfa-refresh-jwt-token',
          user: { id: 1, username: 'mfa_officer', role: 'ADMIN', mfa_enabled: true },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'mfa_officer');
    await page.fill('input#password', 'SecOps@2026!');
    await page.click('button[type="submit"]');

    await expect(page.locator('input#otp_code')).toBeVisible();
    await page.fill('input#otp_code', '482910');
    await page.click('button#mfa-verify-button');

    await expect(page).toHaveURL(/\/city\/overview/);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBe('mock-mfa-verified-jwt-token');
  });

  test('MFA-04: Invalid 6-digit TOTP code displays error without issuing session', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          mfa_required: true,
          mfa_token: 'mock-challenge-jwt',
          user: { id: 1, username: 'mfa_officer', role: 'ADMIN', mfa_enabled: true },
        }),
      });
    });

    await page.route('**/api/auth/mfa/verify/', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          detail: 'That verification code is invalid. Please try again.',
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'mfa_officer');
    await page.fill('input#password', 'SecOps@2026!');
    await page.click('button[type="submit"]');

    await page.fill('input#otp_code', '000000');
    await page.click('button#mfa-verify-button');

    await expect(page.getByText('That verification code is invalid', { exact: false })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });

  test('MFA-05: Back to sign in button returns to credentials form', async ({ page }) => {
    await page.route('**/api/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          mfa_required: true,
          mfa_token: 'mock-challenge-jwt',
          user: { id: 1, username: 'mfa_officer', role: 'ADMIN', mfa_enabled: true },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#username', 'mfa_officer');
    await page.fill('input#password', 'SecOps@2026!');
    await page.click('button[type="submit"]');

    await expect(page.locator('input#otp_code')).toBeVisible();
    await page.click('text=← Back to sign in');

    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#otp_code')).not.toBeVisible();
  });

  test('MFA-06: Security & MFA Settings modal opens from header and displays status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/city/overview');

    // Click profile badge
    await page.click('.user-profile-badge');
    await expect(page.getByText('Security & MFA Settings')).toBeVisible();
    await page.click('text=Security & MFA Settings');

    // Modal is rendered
    await expect(page.getByText('Authentication & Security Settings')).toBeVisible();
    await expect(page.getByText('MFA DISABLED', { exact: true })).toBeVisible();
    await expect(page.getByText('Setup Authenticator App (TOTP)')).toBeVisible();

    // Close modal
    await page.click('text=Close');
    await expect(page.getByText('Authentication & Security Settings')).not.toBeVisible();
  });
});
