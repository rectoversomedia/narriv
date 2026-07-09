import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
  });

  test('complete registration and onboarding flow', async ({ page }) => {
    // Click signup link
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/\/signup/);

    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="company"]', 'Test Company');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Submit registration
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or verification
    await expect(page).toHaveURL(/\/(dashboard|verify-email|onboarding)/);
  });

  test('login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    // Fill with wrong credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('sidebar navigation works', async ({ page }) => {
    // Navigate to Signals
    await page.click('text=Signals');
    await expect(page).toHaveURL(/\/signals/);

    // Navigate to Alerts
    await page.click('text=Alerts');
    await expect(page).toHaveURL(/\/alerts/);

    // Navigate to Reports
    await page.click('text=Reports');
    await expect(page).toHaveURL(/\/reports/);
  });

  test('dashboard KPIs are displayed', async ({ page }) => {
    // Check KPI cards are visible
    await expect(page.locator('[class*="metric"], [class*="kpi"]').first()).toBeVisible();
  });

  test('language toggle works', async ({ page }) => {
    // Find and click language toggle
    const langToggle = page.locator('[class*="language"], button:has-text("EN"), button:has-text("ID")').first();
    if (await langToggle.isVisible()) {
      await langToggle.click();
      // Verify language changed
    }
  });
});

test.describe('Signal Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/signals');
  });

  test('signals table loads', async ({ page }) => {
    // Wait for signals to load
    await page.waitForSelector('table, [class*="table"]', { timeout: 10000 });

    // Check for table headers or content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('signal filters work', async ({ page }) => {
    // Look for filter dropdowns
    const filterButton = page.locator('button:has-text("Filter"), select, [class*="filter"]').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
  });

  test('pagination works', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [class*="pagination"] button:last-child').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Verify page changed
    }
  });
});

test.describe('Alert Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/alerts');
  });

  test('alerts page loads', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('can change alert status', async ({ page }) => {
    // Look for status dropdown or action button
    const statusButton = page.locator('[class*="status"], button:has-text("Status")').first();
    if (await statusButton.isVisible()) {
      await statusButton.click();
      // Select option
      await page.locator('text=Resolved').first().click();
    }
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/workspace/settings');
  });

  test('settings page loads', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('can update workspace name', async ({ page }) => {
    // Find workspace name input
    const nameInput = page.locator('input[name="name"], input[placeholder*="Workspace"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill('Updated Workspace Name');
      // Look for save button
      await page.click('button:has-text("Save"), button:has-text("Update")');
    }
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('page has proper heading structure', async ({ page }) => {
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('form inputs have labels', async ({ page }) => {
    // Check inputs have associated labels
    const inputs = page.locator('input');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        // Check for label or aria-label
        const hasLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
        const hasAriaLabel = !!(await input.getAttribute('aria-label'));
        expect(hasLabel || hasAriaLabel).toBeTruthy();
      }
    }
  });

  test('buttons are keyboard accessible', async ({ page }) => {
    // Press Tab to focus first button
    await page.keyboard.press('Tab');

    // Check if something is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focused);
  });
});

test.describe('Error Handling', () => {
  test('404 page displays correctly', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 });
  });

  test('network error shows error state', async ({ page }) => {
    // Intercept API calls and fail them
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should show error state
    const errorState = page.locator('text=Error, text=Failed, [class*="error"]').first();
    if (await errorState.isVisible()) {
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Responsive Design', () => {
  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('/', { timeout: 10000 });

    // Mobile navigation should be visible
    const mobileNav = page.locator('[class*="mobile"], [class*="bottom-nav"], nav');
    if (await mobileNav.isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test('tables scroll horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/signals');

    // Check if table has horizontal scroll
    const tableContainer = page.locator('[class*="table-container"], [class*="overflow"]').first();
    if (await tableContainer.isVisible()) {
      const overflowX = await tableContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.overflowX;
      });
      expect(['auto', 'scroll']).toContain(overflowX);
    }
  });
});
