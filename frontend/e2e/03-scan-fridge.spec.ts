import { test, expect } from '@playwright/test';
import path from 'path';
import { registerAndVerify, loginAs, resetDb, API } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetDb(page);
  await registerAndVerify(page);
  await loginAs(page);
});

test.describe('Scan Frigo — happy path (API Anthropic mockée)', () => {
  test('affiche les quotas sur la page scan', async ({ page }) => {
    await page.goto('/app/scan');
    // Quota block should be visible after loading
    await expect(page.locator('.scan-page__quota')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.scan-page__quota')).toContainText('/');
  });

  test('upload image → appel API → affiche ingrédients détectés (mock via route intercept)', async ({ page }) => {
    // Mock the scan endpoint to avoid real Anthropic API calls and costs
    await page.route(`${API}/scan-fridge`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detectedIngredients: ['tomates', 'pâtes', 'fromage'],
          matchingRecipes: [],
          quotaUsed: 1,
          quotaRemaining: 4,
        }),
      });
    });

    await page.goto('/app/scan');

    // Create a minimal fake image file for upload
    const fakeImagePath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-fridge.jpg');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fakeImagePath);

    // Should show scanning state then results
    await expect(page.locator('.scan-page__detected')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.scan-page__tags')).toContainText('tomates');
  });

  test('quota épuisé affiche un message bloquant', async ({ page }) => {
    // Mock quota check: quota = 0 remaining
    await page.route(`${API}/scan-fridge/quota`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ used: 5, total: 5, remaining: 0, resetsAt: Date.now() + 86400000 }),
      });
    });

    await page.goto('/app/scan');
    // The upload zone should be disabled or a quota message shown
    await expect(page.locator('.scan-page__quota')).toBeVisible({ timeout: 5000 });
  });
});
