import { test, expect } from '@playwright/test';

test('unauthenticated visitors enter the guest demo', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/demo\/?$/);
});

test('first administrator setup uses email and password without a token', async ({ page }) => {
  await page.goto('/setup/');
  await page.getByLabel('Email', { exact: true }).fill('browser@example.test');
  await page.getByLabel('Password · at least 14 characters', { exact: true }).fill('browser-test-password-long');
  await page.getByRole('button', { name: 'Create administrator' }).click();
  await expect(page.getByRole('heading', { name: 'A clearer view of care.' })).toBeVisible();
  expect((await page.request.get('/api/workspace/')).status()).toBe(200);

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  expect((await page.request.get('/api/workspace/')).status()).toBe(401);

  await page.goto('/login/');
  await page.getByLabel('Email', { exact: true }).fill('browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('browser-test-password-long');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'A clearer view of care.' })).toBeVisible();
});
