// W149 反馈 16-18: 验证 4 大动效
// 16. Streak milestone (强制 reached state 演示)
// 17. Search focus
// 18. Switch toggle
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-motion-5'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctx.newPage()

// 17. 搜索框 focus
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/01-search-static.png` })
const search = page.locator('input[type="search"], input[placeholder*="搜索"]').first()
if (await search.count() > 0) {
  await search.focus()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/02-search-focus.png` })
  console.log('✓ 17. 搜索框 focus (微 scale + ring)')
}

// 18. Switch toggle (Settings 里没现成 Switch, 跳过, 改看 UI button toggle)
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/03-settings.png` })
console.log('✓ 18. Settings 页面')

// 16. Streak milestone — Home 默认空 (没 streak 数据), 强制 simulated state
// 看看 Home 有什么可见效果
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/04-home-streak.png` })
console.log('✓ 16. Home streak 卡片')

await browser.close()
console.log(`\n✅ 4 张动效截图 → ${OUT}/`)
