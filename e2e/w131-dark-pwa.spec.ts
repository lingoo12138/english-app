// e2e W131 — 暗色 + 高对比度 + 离线 banner (8 截图)
import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'
const VIEWPORT_DESKTOP = { width: 1280, height: 800 }

async function go(page: any, path: string) {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  // W132 P2-2 修复: 改 waitForSelector 等 main h1 渲染, 不用 5s 硬等
  //    5s 在 CI 慢时 false-fail, 快速 CI 浪费. waitForSelector 弹性 200ms-10s
  await page.waitForSelector('main h1', { timeout: 10000 })
  // 等 React lazy + 词库 fetch 完成 (有数据加载)
  await page.waitForFunction(() => {
    const body = document.body.textContent || ''
    return !body.includes('加载中')
  }, { timeout: 10000 })
}

async function setDarkAndContrast(page: any, dark: boolean, contrast: boolean) {
  // 切 暗 色
  await page.evaluate((d) => {
    if (d) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, dark)
  // 切 高 对 比 度
  await page.evaluate((c) => {
    if (c) document.documentElement.setAttribute('data-contrast', 'high')
    else document.documentElement.removeAttribute('data-contrast')
  }, contrast)
  await page.waitForTimeout(300)
}

test('W131 暗色 — 听写', async ({ page }) => {
  await go(page, '/dictation')
  await setDarkAndContrast(page, true, false)
  await page.screenshot({ path: 'screenshots/w131-dark-dictation.png' })
})

test('W131 暗色 — 拼写', async ({ page }) => {
  await go(page, '/spelling')
  await setDarkAndContrast(page, true, false)
  await page.screenshot({ path: 'screenshots/w131-dark-spelling.png' })
})

test('W131 暗色 — 错题历史', async ({ page }) => {
  await go(page, '/errors/history')
  await setDarkAndContrast(page, true, false)
  await page.screenshot({ path: 'screenshots/w131-dark-error-history.png' })
})

test('W131 暗色 — 课文评分', async ({ page }) => {
  await go(page, '/textbook')
  await setDarkAndContrast(page, true, false)
  await page.screenshot({ path: 'screenshots/w131-dark-textbook.png' })
})

test('W131 高对比度 — 听写', async ({ page }) => {
  await go(page, '/dictation')
  await setDarkAndContrast(page, false, true)
  await page.screenshot({ path: 'screenshots/w131-contrast-dictation.png' })
})

test('W131 高对比度 — 拼写', async ({ page }) => {
  await go(page, '/spelling')
  await setDarkAndContrast(page, false, true)
  await page.screenshot({ path: 'screenshots/w131-contrast-spelling.png' })
})

test('W131 高对比度 — 错题历史', async ({ page }) => {
  await go(page, '/errors/history')
  await setDarkAndContrast(page, false, true)
  await page.screenshot({ path: 'screenshots/w131-contrast-error-history.png' })
})

test('W131 高对比度 — 课文评分', async ({ page }) => {
  await go(page, '/textbook')
  await setDarkAndContrast(page, false, true)
  await page.screenshot({ path: 'screenshots/w131-contrast-textbook.png' })
})

test('W131 离线 banner 触发', async ({ page }) => {
  await go(page, '/dictation')
  // 切 离 线
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    window.dispatchEvent(new Event('offline'))
  })
  await page.waitForTimeout(500)
  // 验 banner 出 现
  const banner = await page.$('[data-testid="offline-banner"]')
  expect(banner).toBeTruthy()
  await page.screenshot({ path: 'screenshots/w131-offline-banner.png' })
})
