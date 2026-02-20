// Test utilities - shared helper functions for all tests
import { test as base, expect } from '@playwright/test';

/**
 * Wait for app to be fully loaded
 */
export async function waitForAppLoaded(page) {
  await page.waitForLoadState('domcontentloaded');
  // Wait for any key element to appear
  await page.waitForFunction(() => {
    return document.querySelector('#mainContent') ||
           document.querySelector('#addDoiSection') ||
           document.querySelector('body');
  }, { timeout: 15000 });
}

/**
 * Setup all API mocks for testing
 */
export async function setupMockAPIs(page) {
  // Mock the Cloudflare worker session endpoint
  await page.route('https://argonaut-github-proxy.shernren.workers.dev/**', async route => {
    const url = route.request().url();

    if (url.includes('/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: false })
      });
    } else if (url.includes('/login')) {
      // Return a redirect to GitHub (but don't actually follow it)
      await route.fulfill({
        status: 302,
        headers: {
          'Location': 'https://github.com/login/oauth/authorize?client_id=test'
        }
      });
    } else if (url.includes('/api/github/gists')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    } else {
      await route.continue();
    }
  });

  // Mock DOI.org requests
  await page.route('https://doi.org/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-bibtex',
      body: `@article{test, title={Test Paper}, author={Test Author}, year={2024}}`
    });
  });
}

/**
 * Get status message text
 */
export async function getStatusMessage(page) {
  const statusElement = page.locator('#status');
  return await statusElement.textContent().catch(() => '');
}
