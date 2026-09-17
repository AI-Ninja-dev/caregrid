import { test, expect } from '@playwright/test';

test('person profile requires a signed-in workspace', async ({ page }) => {
  await page.goto('/people/example-person/');
  await expect(page.getByRole('heading', { name: 'Connected-care profile' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Sign in to CareGrid to view this profile.');
  await expect(page.getByRole('link', { name: 'Open CareGrid' })).toHaveAttribute('href', '/');
});
