// 真正切到暗色模式截图
import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:4173/english-app'
const OUT = '/workspace/english-app/screenshots'

async function main() {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',  // 关键
    locale: 'zh-CN',
  })
  const page = await context.newPage()

  // 在 settings 实际开 dark mode
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 点击暗色模式 toggle (button 是 onClick={toggleDark},背景是 stone-300/brand-600)
  const darkToggle = page.locator('button.bg-stone-300, button.bg-brand-600').first()
  await darkToggle.click().catch(() => console.log('暗色模式 toggle 没找到'))
  await page.waitForTimeout(800)

  // 验证 dark class 加上
  const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  console.log(`dark class 加上: ${hasDark ? '✅' : '❌'}`)

  await page.screenshot({ path: `${OUT}/v10-real-dark-settings.png`, fullPage: true })
  console.log('📸 v10-real-dark-settings.png')

  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/v10-real-dark-home.png`, fullPage: true })
  console.log('📸 v10-real-dark-home.png')

  await page.goto(URL + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/v10-real-dark-words.png`, fullPage: true })
  console.log('📸 v10-real-dark-words.png')

  await page.goto(URL + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/v10-real-dark-daily.png`, fullPage: true })
  console.log('📸 v10-real-dark-daily.png')

  await browser.close()
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
