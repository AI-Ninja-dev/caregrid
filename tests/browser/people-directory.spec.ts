import { test, expect } from '@playwright/test';

test('people directory requires a signed-in workspace', async ({ page }) => {
  await page.goto('/people/');
  await expect(page.getByRole('heading', { name: 'People, pathways and follow-through.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Sign in to CareGrid to view the people directory.');
  await expect(page.getByRole('link', { name: 'Open CareGrid' })).toHaveAttribute('href', '/');
});
