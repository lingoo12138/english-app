// scripts/w112-screenshots.spec.ts - W112 移 动 Tab UI 验 证
import { test, chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:4173/english-app/'

// 截 1 张 (mobile home)
async function shoot(page: any, path: string, label: string) {
  // W99 验 证: 沙 盒 networkidle 不 稳, 用 domcontentloaded + 长 等 待
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  // 业务: 沙 盒 慢, 8s 等 渲 染 (5,423 词 首 屏)
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `screenshots/w112_${label}.png`, fullPage: false })
  console.log(`✓ ${label}`)
}

test('W112 移 动 Tab UI 验 证', async () => {
  test.setTimeout(120000) // 7 张 × 8s + 重 试
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome'
  })

  // 1) Mobile (iPhone 13, 390x844)
  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mPage = await iphone.newPage()
  await shoot(mPage, '', 'mobile_home')
  await shoot(mPage, 'words', 'mobile_words')
  await shoot(mPage, 'translation-favs', 'mobile_translation_favs')

  // 2) Tablet (iPad Mini, 768x1024)
  const ipad = await browser.newContext({ ...devices['iPad Mini'] })
  const tPage = await ipad.newPage()
  await shoot(tPage, '', 'tablet_home')

  // 3) Desktop (1280x800)
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dPage = await desk.newPage()
  await shoot(dPage, '', 'desktop_home')
  await shoot(dPage, 'words', 'desktop_words')
  await shoot(dPage, 'translation-favs', 'desktop_translation_favs')

  await browser.close()
})
