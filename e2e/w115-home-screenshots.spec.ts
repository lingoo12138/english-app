// e2e/w115-home-screenshots.spec.ts - W115 Home 改版稿 落 地 截图
import { test, chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:4173/english-app/'

async function shoot(page: any, path: string, label: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  await page.waitForTimeout(8000) // 等 SPA 渲 染 (5,423 词 首 屏)
  await page.screenshot({ path: `screenshots/w115_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('W115 Home 改 版 落 地 截 图', async () => {
  test.setTimeout(180000)
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // Mobile Home (iPhone 13)
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, '', 'mobile_home')

  // Desktop Home (1280x800)
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, '', 'desktop_home')

  await browser.close()
})
