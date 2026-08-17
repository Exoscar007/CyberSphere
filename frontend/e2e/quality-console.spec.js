import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Quality & Console Runtime Error Guardrail', () => {
  test('QUAL-01: Zero uncaught runtime errors across key pages', async ({ page }) => {
    const uncaughtErrors = [];
    page.on('pageerror', (err) => {
      uncaughtErrors.push(err.message);
    });

    await loginAsAdmin(page);

    const routesToTest = [
      '/city/overview',
      '/city/intelligence',
      '/city/firs',
      '/city/users',
      '/city/reports',
      '/city/history',
    ];

    for (const route of routesToTest) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }

    expect(uncaughtErrors).toEqual([]);
  });
});
