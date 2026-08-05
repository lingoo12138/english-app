// playwright.config.ts - E2E 配置
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-report.json' }]],
  use: {
    baseURL: 'https://lingoo12138.github.io/english-app/',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'],
      launchOptions: { executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' } } },
  ],
})
