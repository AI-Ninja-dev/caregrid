import { test, expect } from '@playwright/test';

test('operational attention route requires a signed-in workspace', async ({ page }) => {
  await page.goto('/attention/');
  await expect(page.getByRole('heading', { name: 'Attention without clinical guesswork.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Sign in to CareGrid to view this workspace.');
  await expect(page.getByRole('link', { name: 'Open CareGrid' })).toHaveAttribute('href', '/');
});
