// e2e/v217-final-screenshots.spec.ts - v2.1.7 终 态 截 图 (Skeleton + 4 大 组 折 叠)
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
  await page.screenshot({ path: `screenshots/v217_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('v2.1.7 终 态 截 图 (4 大 组 折 叠 + Skeleton)', async () => {
  test.setTimeout(180000)
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // Desktop Home (default 学习 展 开)
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, '', 'desktop_home_default')

  // Desktop Home (展 开 设 置 组)
  const dPage2 = await desk.newPage()
  await dPage2.goto(BASE, { waitUntil: 'domcontentloaded' })
  await dPage2.waitForTimeout(5000)
  // 点 "设 置" 折 叠 头
  const settingsBtn = dPage2.locator('button[aria-expanded]:has-text("设置")')
  if (await settingsBtn.count() > 0) {
    await settingsBtn.first().click()
    await dPage2.waitForTimeout(500)
  }
  await dPage2.screenshot({ path: 'screenshots/v217_desktop_home_settings_open.png', fullPage: false })
  console.log('✓ desktop_home_settings_open')

  // Mobile Home
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, '', 'mobile_home')

  await browser.close()
})
