// W149 反馈 2: 验证切页面时不再有骨架一闪而过
// 拍 6 张: 切到 词库 0ms / 30ms / 60ms / 100ms / 200ms / 500ms
// 期望: 没有 "骨架" 帧, 只有平滑 fade-up
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-no-skeleton'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctx.newPage()

// 先访问 2 个页面, 让 chunk 全部 cache
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 1) Home (静止, 动效已完成)
await page.screenshot({ path: `${OUT}/01-home-static.png` })
console.log('✓ 01-home-static.png')

// 2) 点击 "词库" 导航链接, 拍 5 张不同时间点
const wordListLink = page.locator('a[href*="/words"]').first()
const t0 = Date.now()
await wordListLink.click()

const targets = [30, 60, 100, 200, 500]
let lastT = 0
for (const ms of targets) {
  const wait = ms - lastT
  if (wait > 0) await page.waitForTimeout(wait)
  lastT = ms
  const elapsed = Date.now() - t0
  await page.screenshot({ path: `${OUT}/02-wordlist-${ms}ms.png` })
  console.log(`✓ 02-wordlist-${ms}ms.png (actual ${elapsed}ms)`)
}

await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/03-wordlist-static.png` })
console.log('✓ 03-wordlist-static.png')

await browser.close()
console.log(`\n✅ 7 张 transition 截图 → ${OUT}/`)
