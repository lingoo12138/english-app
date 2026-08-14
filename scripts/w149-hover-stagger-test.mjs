// W149 反馈 3: 验证卡片 hover lift + 列表 stagger fade-in
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-hover-stagger'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctx.newPage()

// 1) Settings (3 sections stagger)
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })

// 拍 0ms (stagger 初期) / 200ms (中) / 500ms (完)
const targets = [40, 200, 500]
let lastT = 0
const t0 = Date.now()
for (const ms of targets) {
  await page.waitForTimeout(ms - lastT)
  lastT = ms
  const elapsed = Date.now() - t0
  await page.screenshot({ path: `${OUT}/01-settings-${ms}ms.png` })
  console.log(`✓ 01-settings-${ms}ms.png (actual ${elapsed}ms)`)
}
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/02-settings-static.png` })
console.log('✓ 02-settings-static.png')

// 2) WordList (分页模式 stagger)
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 拍 stagger 0/200/500ms
const t1 = Date.now()
let lastT2 = 0
for (const ms of [40, 200, 500]) {
  await page.waitForTimeout(ms - lastT2)
  lastT2 = ms
  const elapsed = Date.now() - t1
  await page.screenshot({ path: `${OUT}/03-wordlist-${ms}ms.png` })
  console.log(`✓ 03-wordlist-${ms}ms.png (actual ${elapsed}ms)`)
}
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/04-wordlist-static.png` })
console.log('✓ 04-wordlist-static.png')

// 3) 词卡 hover lift: 静态 vs hover
const firstCard = page.locator('.card-interactive').first()
const box1 = await firstCard.boundingBox()
await page.screenshot({ path: `${OUT}/05-wordcard-static.png` })
await firstCard.hover()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/06-wordcard-hover.png` })
const box2 = await firstCard.boundingBox()
console.log(`✓ hover lift: 静态 y=${box1?.y.toFixed(1)}, hover y=${box2?.y.toFixed(1)} (差 ${(box1?.y - box2?.y).toFixed(1)}px 上移)`)

await browser.close()
console.log(`\n✅ 8 张动效截图 → ${OUT}/`)
