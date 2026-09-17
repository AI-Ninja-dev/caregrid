import { test, expect } from '@playwright/test';

const testEmail = 'browser@example.test';
const testPassword = ['browser', 'test', 'password', 'long'].join('-');

test('unauthenticated visitors enter the guest demo', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/demo\/?$/);
});

test('first administrator opens the adaptive RPM dashboard without a token', async ({ page }) => {
  await page.goto('/setup/');
  await page.getByLabel('Email', { exact: true }).fill(testEmail);
  await page.getByLabel('Password · at least 14 characters', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Create administrator' }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole('heading', { name: 'Care, visible in real time.' })).toBeVisible();
  await expect(page.getByText('Patient monitoring')).toBeVisible();
  await expect(page.getByText('Connectivity health')).toBeVisible();
  expect((await page.request.get('/api/dashboard/')).status()).toBe(200);

  for (const viewport of [
    { width: 320, height: 760 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: 'Care, visible in real time.' })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Patients' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation' }).click();

  await page.goto('/login/');
  await expect(page).toHaveURL(/\/dashboard\/?$/);
});
