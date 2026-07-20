// 截场景页(修复后)
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-features=ServiceWorker'],
})
const page = await (await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
})).newPage()

await page.goto('http://127.0.0.1:4173/english-app/scenes/restaurant', { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/workspace/english-app/screenshots/13-mobile-scene.png', fullPage: true })
console.log('📸 13-mobile-scene.png (修复后)')

// 桌面版
const desktop = await (await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
})).newPage()
await desktop.goto('http://127.0.0.1:4173/english-app/scenes/restaurant', { waitUntil: 'load' })
await desktop.waitForTimeout(2000)
await desktop.screenshot({ path: '/workspace/english-app/screenshots/06-scene-detail.png', fullPage: true })
console.log('📸 06-scene-detail.png (修复后)')

await browser.close()
