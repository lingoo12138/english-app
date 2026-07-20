// 截一个原本 0 句的词,看补充效果
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

// 选一个原本 0 句的词(脚本补充后) - 找 abruptly, 显示效果
await page.goto('http://127.0.0.1:4173/english-app/words/w-abruptly', { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/workspace/english-app/screenshots/15-abruptly-after.png', fullPage: true })
console.log('📸 15-abruptly-after.png')

// 再选一个 1 句补充到 3 句的:okay
await page.goto('http://127.0.0.1:4173/english-app/words/w-okay', { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/workspace/english-app/screenshots/16-okay-after.png', fullPage: true })
console.log('📸 16-okay-after.png')

await browser.close()
