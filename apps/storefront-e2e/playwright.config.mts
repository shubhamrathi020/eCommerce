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
  // One retry always on: six browser/viewport projects share the same two dev servers, so a slow
  // response under that combined load is a timing flake, not a bug (see BRD 12, FH-09).
  retries: 1,
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
    // Cross-browser and viewport coverage (BRD 12, FH-09). These need `pnpm exec playwright install
    // firefox webkit` once locally; CI installs every engine as part of its own Playwright setup step.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'] } },
  ],
});
