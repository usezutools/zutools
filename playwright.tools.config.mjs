import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/tools',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [['list']],
  outputDir: 'artifacts/tools-browser',
  use: { baseURL: 'http://127.0.0.1:4184', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'webkit-mobile-layout', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev --prefix examples/react -- --host 127.0.0.1 --port 4184 --strictPort',
    url: 'http://127.0.0.1:4184',
    reuseExistingServer: !process.env.CI,
  },
});
