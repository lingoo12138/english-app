// e2e W123d + W124 + W125 视觉验证 — 截图
import { test, expect } from '@playwright/test'

test.describe('W123d AIChat v2 — 3 折叠 + 居中标题', () => {
  test('Desktop AIChat v2', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/aichat', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/w123d-desktop-aichat.png', fullPage: false })
  })

  test('Mobile AIChat v2', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/aichat', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/w123d-mobile-aichat.png', fullPage: false })
  })
})

test.describe('W124 LessonScore — Bento + 圆环', () => {
  test('Desktop LessonScore', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/lesson-score', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/w124-desktop-lesson-score.png', fullPage: false })
  })

  test('Mobile LessonScore', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/lesson-score', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/w124-mobile-lesson-score.png', fullPage: false })
  })
})

test.describe('W125 高对比度模式', () => {
  test('High contrast — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/w125-high-contrast.png', fullPage: false })
  })

  test('Dark mode 强化 — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
      localStorage.setItem('app-dark-mode', '1')
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/w125-dark-mode.png', fullPage: false })
  })
})
