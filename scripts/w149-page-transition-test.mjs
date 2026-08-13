// W149 反馈 1: 验证页面切换动效
// 拍 4 张: 切到 词库 0ms / 60ms / 120ms / 240ms (0=开始 / 60=中 / 120=大半 / 240=完成)
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-page-transition'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctx.newPage()

await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 1) Home (静止, 动效已完成)
await page.screenshot({ path: `${OUT}/01-home-static.png` })
console.log('✓ 01-home-static.png')

// 2) 点击 "词库" 导航链接, 拍 4 张不同时间点
const wordListLink = page.locator('a[href*="/words"]').first()
await wordListLink.click()

// 拍 4 张
const delays = [40, 100, 200, 400]
for (let i = 0; i < delays.length; i++) {
  await page.waitForTimeout(delays[i] - (i === 0 ? 0 : delays[i - 1]))
  await page.screenshot({ path: `${OUT}/02-wordlist-${delays[i]}ms.png` })
  console.log(`✓ 02-wordlist-${delays[i]}ms.png`)
}

// 3) 等动画完成, 拍静止
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/03-wordlist-static.png` })
console.log('✓ 03-wordlist-static.png')

// 4) 切到 "错题复习" 同样拍 4 张
const errorLink = page.locator('a[href*="/errors/review"]').first()
if (await errorLink.count() > 0) {
  await errorLink.click()
  for (let i = 0; i < delays.length; i++) {
    await page.waitForTimeout(delays[i] - (i === 0 ? 0 : delays[i - 1]))
    await page.screenshot({ path: `${OUT}/04-error-review-${delays[i]}ms.png` })
    console.log(`✓ 04-error-review-${delays[i]}ms.png`)
  }
}

await browser.close()
console.log(`\n✅ 9 张 transition 截图 → ${OUT}/`)
