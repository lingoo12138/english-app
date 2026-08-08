// e2e/w116-w117-screenshots.spec.ts - W116 字母索引 + W117 字体 落 地 截 图
import { test, chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:4173/english-app/'

async function shoot(page: any, path: string, label: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  await page.waitForTimeout(8000) // 等 SPA + 字 体 加 载
  await page.screenshot({ path: `screenshots/w117_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('W116+W117 落 地 截 图 (字 母 索 引 + 字 体)', async () => {
  test.setTimeout(180000)
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // Desktop words
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, 'words', 'desktop_words')

  // Mobile words
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, 'words', 'mobile_words')

  await browser.close()
})
