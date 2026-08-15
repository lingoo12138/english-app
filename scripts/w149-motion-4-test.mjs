// W149 反馈 11-14: 验证 4 大动效
// 11. count-up (Home XP 涨)
// 12. nav-item active 指示器 (切侧边栏选中态)
// 13. AIChat 消息 stagger
// 14. NotFound 404 错误页
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-motion-4'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctx.newPage()

// 1) Home 数字 count-up
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/01-home-countup-early.png` })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/02-home-countup-done.png` })
console.log('✓ 1. Home 数字 count-up')

// 2) 侧边栏 active 指示器 (切到词库)
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/03-sidebar-home.png` })

await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/04-sidebar-words-300ms.png` })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/05-sidebar-words-800ms.png` })
console.log('✓ 2. 侧边栏指示器滑动')

// 3) 404 错误页
await page.goto('http://127.0.0.1:4173/english-app/some-nonexistent-path', { waitUntil: 'networkidle' })
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/06-404-200ms.png` })
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/07-404-400ms.png` })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/08-404-static.png` })
console.log('✓ 3. 404 错误页')

await browser.close()
console.log(`\n✅ 8 张动效截图 → ${OUT}/`)
