// 截场景页 viewport 截图(不 fullPage)
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
// viewport screenshot (用户首次看到的)
await page.screenshot({ path: '/workspace/english-app/screenshots/13b-mobile-scene-vp.png', fullPage: false })
console.log('📸 13b-mobile-scene-vp.png (viewport)')

// 滚到底再截
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(500)
await page.screenshot({ path: '/workspace/english-app/screenshots/13c-mobile-scene-bottom.png', fullPage: false })
console.log('📸 13c-mobile-scene-bottom.png (滚到底)')

await browser.close()
