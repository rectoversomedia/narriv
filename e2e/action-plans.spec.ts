import { test, expect } from '@playwright/test';
import { humanClick, humanType } from './helpers/human-interaction';

test.describe('Narriv Action Plans E2E Starter', () => {
  test('login and verify action plans list is rendered', async ({ page }) => {
    // 1. Navigate to login with return path to /action-plans
    await page.goto('/login?next=/action-plans');
    await page.waitForLoadState('domcontentloaded');

    // Verify login form inputs are visible
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // 2. Perform login with test credentials
    const testEmail = process.env.TEST_USER_EMAIL || 'dashtest1786689849@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPass123!';

    await humanType(emailInput, testEmail, { delayMin: 15, delayMax: 35 });
    await humanType(passwordInput, testPassword, { delayMin: 15, delayMax: 35 });

    const submitButton = page.locator('button[type="submit"]');
    await humanClick(page, submitButton);

    // 3. Wait for post-login redirect to reach /action-plans
    await page.waitForURL((url) => url.pathname.includes('/action-plans'), {
      timeout: 20000,
    });
    await page.waitForLoadState('networkidle');

    // 4. Verify Action Plans header is rendered
    const pageHeading = page.locator('h1');
    await expect(pageHeading).toBeVisible({ timeout: 10000 });

    // 5. Verify Action Plans list or cards are rendered
    const actionCards = page.locator('button:has(h3)');
    const cardCount = await actionCards.count();

    if (cardCount > 0) {
      await expect(actionCards.first()).toBeVisible();
      const firstCardTitle = await actionCards.first().locator('h3').textContent();
      expect(firstCardTitle).toBeTruthy();
    } else {
      const panel = page.locator('main, section');
      await expect(panel.first()).toBeVisible();
    }

    // Capture verification screenshot inside e2e/artifacts
    await page.screenshot({ path: 'e2e/artifacts/action-plans-starter-verified.png' });
  });
});
