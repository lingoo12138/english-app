// e2e W126 4 大激活功能页 — 真实 URL
import { test } from '@playwright/test'
const BASE = 'http://127.0.0.1:4173/english-app'

async function go(page: any, path: string) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000) // lazy + 词库 加载
}

test('W126 Dictation Desktop', async ({ page }) => {
  await go(page, '/dictation')
  await page.screenshot({ path: 'screenshots/w126-desktop-dictation.png' })
})
test('W126 Spelling Desktop', async ({ page }) => {
  await go(page, '/spelling')
  await page.screenshot({ path: 'screenshots/w126-desktop-spelling.png' })
})
test('W126 ErrorHistory Desktop', async ({ page }) => {
  await go(page, '/errors/history')
  await page.screenshot({ path: 'screenshots/w126-desktop-error-history.png' })
})
