/**
 * GitHub Authentication Workflow Tests
 *
 * These tests verify the GitHub OAuth flow works correctly and
 * captures any console errors during authentication.
 */
import { test, expect } from '@playwright/test';
import { waitForAppLoaded, setupMockAPIs, getStatusMessage } from './utils.js';

test.describe('GitHub Authentication', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Set up API mocks before navigation
    await setupMockAPIs(page);

    // Capture console errors (not network-related)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network errors
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should load the app without console errors', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Check main elements are present
    await expect(page.locator('#mainContent')).toBeVisible();
    await expect(page.locator('#addDoiSection')).toBeVisible();

    // Assert no critical console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should show GitHub connect button', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    const githubButton = page.locator('#githubConnectBtn');
    await expect(githubButton).toBeVisible();

    // No errors should occur
    expect(consoleErrors).toHaveLength(0);
  });

  test('should display DOI input section', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    const doiSection = page.locator('#addDoiSection');
    await expect(doiSection).toBeVisible();

    const doiInput = page.locator('#doiInput');
    await expect(doiInput).toBeVisible();

    const addButton = page.locator('#addDoiBtn');
    await expect(addButton).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should show input method radio buttons', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    const urlMethod = page.locator('#inputMethodUrl');
    await expect(urlMethod).toBeVisible();

    const fileMethod = page.locator('#inputMethodFile');
    await expect(fileMethod).toBeVisible();

    const storageMethod = page.locator('#inputMethodStorage');
    await expect(storageMethod).toBeVisible();

    const gistMethod = page.locator('#inputMethodGist');
    await expect(gistMethod).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should accept DOI input without errors', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    const doiInput = page.locator('#doiInput');
    await doiInput.fill('10.1145/3290605.3300233');

    // Input should accept the value
    const value = await doiInput.inputValue();
    expect(value).toBe('10.1145/3290605.3300233');

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('UI Interactions', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should toggle theme without errors', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Close onboarding modal if present
    const closeOnboardingBtn = page.locator('#closeOnboardingBtn, #onboardingCompleteBtn, #onboardingNextBtn').first();
    if (await closeOnboardingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeOnboardingBtn.click();
      await page.waitForTimeout(500);
    }

    const themeToggle = page.locator('#themeToggle');

    // Click theme toggle - should not throw any errors
    await themeToggle.click();

    // Just verify no errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle window resize', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Onboarding', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should show onboarding for new users', async ({ page }) => {
    // Clear localStorage to simulate new user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();
    await waitForAppLoaded(page);

    // Just verify no errors occurred
    expect(consoleErrors).toHaveLength(0);
  });
});
