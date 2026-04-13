import type { Page } from '@playwright/test';

export const API = 'http://localhost:3001/api';
export const BASE = 'http://localhost:4200';

export const TEST_USER = {
  email: 'e2e@cookpote.fr',
  pseudo: 'e2etester',
  password: 'E2eTest1!',
};

/** Register, retrieve verification token via test endpoint, verify email. */
export async function registerAndVerify(page: Page, user = TEST_USER): Promise<void> {
  // Register
  await page.goto('/register');
  await page.fill('[formControlName="email"]', user.email);
  await page.fill('[formControlName="pseudo"]', user.pseudo);
  await page.fill('[formControlName="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.auth-card__success');

  // Get verification token from test endpoint
  const res = await page.request.get(`${API}/test/last-verification-token`);
  const { token } = await res.json();

  // Visit verification URL
  await page.goto(`/verify-email?token=${token}`);
  await page.waitForSelector('.auth-card__success');
}

/** Login and wait for redirect to feed. */
export async function loginAs(page: Page, user = TEST_USER): Promise<void> {
  await page.goto('/login');
  await page.fill('[formControlName="email"]', user.email);
  await page.fill('[formControlName="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/feed');
}

/** Clear all test data between scenarios. */
export async function resetDb(page: Page): Promise<void> {
  await page.request.post(`${API}/test/reset-token-store`);
  // Delete all rows via a direct DB wipe (test route)
  await page.request.post(`${API}/test/clear-db`);
}
