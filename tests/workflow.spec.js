/**
 * User Workflow Tests
 *
 * These tests emulate common user workflows and ensure
 * the app handles them without console errors.
 */
import { test, expect } from '@playwright/test';
import { waitForAppLoaded, setupMockAPIs, getStatusMessage } from './utils.js';

test.describe('Paper Management - UI Flow', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network errors from external APIs
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch') && !text.includes('doi.org') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should display all main UI sections', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Verify all major sections are present
    await expect(page.locator('#addDoiSection')).toBeVisible();
    await expect(page.locator('#loadJsonSection')).toBeVisible();
    await expect(page.locator('#githubSection')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should have working DOI input', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    const doiInput = page.locator('#doiInput');
    await doiInput.fill('10.1234/test');

    const doiKeyInput = page.locator('#doiKeyInput');
    await doiKeyInput.fill('Test2024');

    expect(await doiInput.inputValue()).toBe('10.1234/test');
    expect(await doiKeyInput.inputValue()).toBe('Test2024');

    expect(consoleErrors).toHaveLength(0);
  });

  test('should display load buttons', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Check for load buttons
    await expect(page.locator('#loadUrlBtn')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should display GitHub section correctly', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // GitHub section should have connect button
    await expect(page.locator('#githubConnectBtn')).toBeVisible();
    await expect(page.locator('#githubNotLoggedIn')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Close onboarding modal if present
    const closeOnboardingBtn = page.locator('#closeOnboardingBtn, #onboardingCompleteBtn, #onboardingNextBtn').first();
    if (await closeOnboardingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeOnboardingBtn.click();
      await page.waitForTimeout(500);
    }

    const themeToggle = page.locator('#themeToggle');
    await expect(themeToggle).toBeVisible();

    // Click theme toggle
    await themeToggle.click();

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Window and Viewport', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should handle window resize to mobile', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // App should still be functional
    await expect(page.locator('#mainContent')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle window resize to tablet', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Resize to tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    await expect(page.locator('#mainContent')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle window resize to desktop', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Resize to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    await expect(page.locator('#mainContent')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Accessibility', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should have proper ARIA labels on buttons', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Check key buttons have ARIA labels
    const themeToggle = page.locator('#themeToggle');
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should have proper role attributes', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Status should have aria-live
    const status = page.locator('#status');
    const ariaLive = await status.getAttribute('aria-live');
    expect(ariaLive).toBeTruthy();

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Local Storage Operations', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    await setupMockAPIs(page);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('net::') && !text.includes('favicon') && !text.includes('Failed to fetch')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
  });

  test('should clear localStorage without errors', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Set some data
    await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
    });

    // Clear it
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Verify cleared
    const value = await page.evaluate(() => localStorage.getItem('test_key'));
    expect(value).toBeNull();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle sessionStorage', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoaded(page);

    // Set session data
    await page.evaluate(() => {
      sessionStorage.setItem('test_session', 'test_value');
    });

    // Read it back
    const value = await page.evaluate(() => sessionStorage.getItem('test_session'));
    expect(value).toBe('test_value');

    expect(consoleErrors).toHaveLength(0);
  });
});
