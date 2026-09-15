import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3001', channel: 'chrome', headless: true },
  workers: 1,
  reporter: 'list',
});
