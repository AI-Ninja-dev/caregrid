import { test, expect } from '@playwright/test';

test('health endpoint is reachable and browser hardening headers are present', async ({ request }) => {
  const response = await request.get('/api/health/');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok', database: 'reachable' });
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response.headers()['permissions-policy']).toContain('camera=()');
});
