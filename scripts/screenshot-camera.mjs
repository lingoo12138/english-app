// 截 Camera 页面
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-features=ServiceWorker'],
})
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
})
const page = await context.newPage()

await page.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/workspace/english-app/screenshots/17-camera-empty.png', fullPage: true })
console.log('📸 17-camera-empty.png')

// 模拟填了 API key
await page.evaluate(() => {
  const k = 'english-app-settings'
  const s = JSON.parse(localStorage.getItem(k) || '{}')
  s.state = { ...(s.state || {}), llmApiKey: 'sk-or-v1-demo' }
  localStorage.setItem(k, JSON.stringify(s))
})
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/workspace/english-app/screenshots/18-camera-ready.png', fullPage: true })
console.log('📸 18-camera-ready.png')

// 移动端
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
})
const mp = await mobile.newPage()
await mp.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'load' })
await mp.waitForTimeout(2000)
await mp.screenshot({ path: '/workspace/english-app/screenshots/19-mobile-camera.png', fullPage: true })
console.log('📸 19-mobile-camera.png')

await browser.close()
