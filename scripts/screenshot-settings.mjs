// 截 Settings 页面(LLM 配置区)
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-features=ServiceWorker'],
})
const page = await (await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
})).newPage()

await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'load' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/workspace/english-app/screenshots/20-settings-llm.png', fullPage: true })
console.log('📸 20-settings-llm.png')
await browser.close()
