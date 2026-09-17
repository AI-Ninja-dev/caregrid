import { test, expect } from '@playwright/test';

test('pathway workload requires a signed-in workspace', async ({ page }) => {
  await page.goto('/pathways/');
  await expect(page.getByRole('heading', { name: 'Four pathways. One workload view.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Sign in to CareGrid to view pathway workload.');
  await expect(page.getByRole('link', { name: 'Open CareGrid' })).toHaveAttribute('href', '/');
});
