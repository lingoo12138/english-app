// e2e/v215-full-screenshots.spec.ts - v2.1.6 全套 截 图 (4 viewport × 4 page)
import { test, chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:4173/english-app/'

async function shoot(page: any, path: string, label: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  await page.waitForTimeout(8000) // 等 SPA + 字 体 + 词 库
  await page.screenshot({ path: `screenshots/v215_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('v2.1.6 全套 截 图 (mobile+tablet+desktop × Home+Words+WordDetail+Settings)', async () => {
  test.setTimeout(300000) // 12 截 图 + 8s 等 待
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // Desktop (1280x800)
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, '', 'desktop_home')
  await shoot(dPage, 'words', 'desktop_words')
  await shoot(dPage, 'settings', 'desktop_settings')

  // Mobile (iPhone 13)
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, '', 'mobile_home')
  await shoot(mPage, 'words', 'mobile_words')
  await shoot(mPage, 'settings', 'mobile_settings')

  // Tablet (iPad Mini)
  const ipad = await browser.newContext({ ...devices['iPad Mini'] })
  const tPage = await ipad.newPage()
  await shoot(tPage, '', 'tablet_home')

  await browser.close()
})
