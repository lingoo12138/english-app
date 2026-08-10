// playwright.config.ts - E2E 配置
// v2.1.12 W129: 加 webServer 自动起本地 spa_server.py
import { defineConfig, devices } from '@playwright/test'

const LOCAL_BASE = 'http://127.0.0.1:4173/english-app/'

export default defineConfig({
  testDir: './e2e',
  // 沙盒慢, 单测 60s, 整体 5min
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-report.json' }]],
  use: {
    // v2.1.12: 优先用本地 spa_server (离 409 部署), 失败回 GitHub Pages
    baseURL: LOCAL_BASE,
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // v2.1.12 W129: webServer 自动起本地静态服 (scripts/spa_server.py)
  // 默认 port 4173, CI/local 都通
  webServer: {
    command: 'python3 scripts/spa_server.py 4173',
    url: LOCAL_BASE,
    reuseExistingServer: true,
    timeout: 30000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'],
      launchOptions: { executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' } } },
  ],
})
