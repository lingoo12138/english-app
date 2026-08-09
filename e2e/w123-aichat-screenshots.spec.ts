// e2e/w123-aichat-screenshots.spec.ts - W123 AIChat 优 化 截 图
import { test, chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:4173/english-app/'

async function shoot(page: any, path: string, label: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `screenshots/w123_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('W123 AIChat UI 优 化 截 图 (桌 面 + 移 动)', async () => {
  test.setTimeout(120000)
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // Desktop
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, 'chat', 'desktop_chat')

  // Mobile
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, 'chat', 'mobile_chat')

  await browser.close()
})
