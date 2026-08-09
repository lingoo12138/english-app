import { test } from '@playwright/test'
const BASE = 'http://127.0.0.1:4173/english-app'

async function go(page: any, path: string) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
}

test('W123d Desktop AIChat v2', async ({ page }) => {
  await go(page, '/chat')
  await page.screenshot({ path: 'screenshots/w123d-desktop-aichat.png' })
})
test('W123d Mobile AIChat v2', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/chat')
  await page.screenshot({ path: 'screenshots/w123d-mobile-aichat.png' })
})
test('W124 Desktop LessonScore', async ({ page }) => {
  await go(page, '/textbook/score')
  await page.screenshot({ path: 'screenshots/w124-desktop-lesson-score.png' })
})
test('W124 Mobile LessonScore', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/textbook/score')
  await page.screenshot({ path: 'screenshots/w124-mobile-lesson-score.png' })
})
test('W125 High contrast', async ({ page }) => {
  await go(page, '/')
  await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'))
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'screenshots/w125-high-contrast.png' })
})
test('W125 Dark mode', async ({ page }) => {
  await go(page, '/')
  await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('app-dark-mode', '1')
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'screenshots/w125-dark-mode.png' })
})
