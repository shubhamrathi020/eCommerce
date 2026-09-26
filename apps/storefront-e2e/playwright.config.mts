import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const storefrontUrl = process.env['BASE_URL'] || 'http://localhost:4200';
const adminUrl = process.env['ADMIN_URL'] || 'http://localhost:4201';
const workspaceRoot = resolve(import.meta.dirname, '../..');

/**
 * Smoke tests for the main journeys. They run against the dev servers (started here when not already running).
 * Locally the installed Microsoft Edge is used so no browser download is needed; CI installs Chromium.
 */
export default defineConfig({
  testDir: './src',
  outputDir: resolve(workspaceRoot, 'dist/.playwright/output'),
  reporter: [['list'], ['html', { outputFolder: resolve(workspaceRoot, 'dist/.playwright/report'), open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env['CI'] ? 1 : 0,
  fullyParallel: true,
  use: {
    baseURL: storefrontUrl,
    trace: 'on-first-retry',
  },
  webServer: [
    { command: 'pnpm exec nx run storefront:serve', url: storefrontUrl, reuseExistingServer: true, cwd: workspaceRoot, timeout: 180_000 },
    { command: 'pnpm exec nx run admin:serve', url: adminUrl, reuseExistingServer: true, cwd: workspaceRoot, timeout: 180_000 },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(process.env['CI'] ? {} : { channel: 'msedge' }) },
    },
  ],
});
