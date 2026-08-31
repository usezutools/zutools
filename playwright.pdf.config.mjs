import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pdf', timeout: 60000, expect: { timeout: 20000 }, workers: 2,
  reporter: [['list'], ['json', { outputFile: 'artifacts/pdf-browser-results.json' }]],
  outputDir: 'artifacts/pdf-browser',
  use: { baseURL: 'http://127.0.0.1:4183', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'webkit-mobile-layout', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run preview --prefix examples/react -- --host 127.0.0.1 --port 4183 --strictPort', url: 'http://127.0.0.1:4183', reuseExistingServer: !process.env.CI },
});
