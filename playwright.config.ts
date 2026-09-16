import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3010', channel: process.env.CI ? undefined : 'chrome', headless: true },
  webServer: { command: 'npm run start -- --hostname 127.0.0.1 --port 3010', url: 'http://127.0.0.1:3010/api/auth/', reuseExistingServer: false, timeout: 60000, env: { CAREGRID_DB_PATH: `test-results/workspace-${Date.now()}.sqlite`, CAREGRID_ORIGIN: 'http://127.0.0.1:3010', CAREGRID_ALLOW_LOCAL_SETUP: 'true' } },
  workers: 1,
  reporter: 'list',
});
