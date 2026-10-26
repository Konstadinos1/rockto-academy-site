import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build served by `vite preview`.
// CHROMIUM_PATH lets sandboxed environments point at a preinstalled browser.
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Low-RAM dev boxes (6 GB) thrash with the default worker count; CI keeps defaults.
  workers: process.env.CI ? undefined : 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } }],
});
