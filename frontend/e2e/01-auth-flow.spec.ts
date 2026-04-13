import { test, expect } from '@playwright/test';
import { registerAndVerify, loginAs, resetDb, TEST_USER, API } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

test.describe('Auth flow — inscription → vérification email → connexion', () => {
  test('inscription affiche le message de succès', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.fill('[formControlName="pseudo"]', TEST_USER.pseudo);
    await page.fill('[formControlName="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('.auth-card__success')).toBeVisible();
    await expect(page.locator('.auth-card__success')).toContainText('Vérifie tes emails');
  });

  test('vérification email via token → message confirmé', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.fill('[formControlName="pseudo"]', TEST_USER.pseudo);
    await page.fill('[formControlName="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.auth-card__success');

    const res = await page.request.get(`${API}/test/last-verification-token`);
    const { token } = await res.json();
    expect(token).toBeTruthy();

    await page.goto(`/verify-email?token=${token}`);
    await expect(page.locator('.auth-card__success')).toContainText('confirmé');
  });

  test('connexion après vérification redirige vers le feed', async ({ page }) => {
    await registerAndVerify(page);
    await loginAs(page);
    await expect(page).toHaveURL(/\/app\/feed/);
  });

  test('connexion sans vérification affiche erreur 403', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.fill('[formControlName="pseudo"]', TEST_USER.pseudo);
    await page.fill('[formControlName="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.auth-card__success');

    await page.goto('/login');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.fill('[formControlName="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('.auth-card__error')).toBeVisible();
  });

  test('mot de passe oublié → reset → connexion avec nouveau mot de passe', async ({ page }) => {
    await registerAndVerify(page);

    // Request reset
    await page.goto('/forgot-password');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.auth-card__success');

    // Get reset token
    const res = await page.request.get(`${API}/test/last-reset-token`);
    const { token } = await res.json();
    expect(token).toBeTruthy();

    // Reset password
    await page.goto(`/reset-password?token=${token}`);
    await page.fill('[formControlName="password"]', 'NewPass1word!');
    await page.fill('[formControlName="confirm"]', 'NewPass1word!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.auth-card__success')).toBeVisible();

    // Login with new password
    await page.goto('/login');
    await page.fill('[formControlName="email"]', TEST_USER.email);
    await page.fill('[formControlName="password"]', 'NewPass1word!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app\/feed/);
  });

  test('déconnexion efface la session', async ({ page }) => {
    await registerAndVerify(page);
    await loginAs(page);

    await page.click('button:has-text("Déconnexion")');
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
