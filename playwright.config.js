import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 90000, expect: { timeout: 20000 }, workers: 1,
  use: { baseURL: 'http://127.0.0.1:9417', channel: process.env.CI ? undefined : 'chrome', headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run start', url: 'http://127.0.0.1:9417/wp-content/uploads/demo-verification.json', timeout: 240000, reuseExistingServer: false },
  reporter: [['list'], ['json', { outputFile: 'evidence/test-results.json' }]],
});
