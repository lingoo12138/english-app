import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-product'
mkdirSync(OUT, { recursive: true })

const URL = 'http://127.0.0.1:4173/english-app/'
const VIEWPORT = { width: 1440, height: 900 }

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })
const DARK = JSON.stringify({ state: { darkMode: true, themeColor: 'green', fontSize: 'md' }, version: 0 })

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`✓ ${name}.png`)
}

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })

// ── 1) 明色 ──
const ctxLight = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
await ctxLight.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const pageLight = await ctxLight.newPage()

await pageLight.goto(URL, { waitUntil: 'networkidle' })
await pageLight.waitForTimeout(1500)
await shot(pageLight, '01-home')

await pageLight.goto(URL + 'words', { waitUntil: 'networkidle' })
await pageLight.waitForTimeout(1200)
await shot(pageLight, '02-wordlist')

const firstCard = await pageLight.$('.card-interactive')
if (firstCard) {
  await firstCard.click()
  await pageLight.waitForTimeout(1500)
  await shot(pageLight, '03-worddetail')
}

await pageLight.goto(URL + 'usage', { waitUntil: 'networkidle' })
await pageLight.waitForTimeout(1500)
await shot(pageLight, '04-usage')

// 改错复习 — 没有错题时也截图空状态
await pageLight.goto(URL + 'errors/review', { waitUntil: 'networkidle' })
await pageLight.waitForTimeout(1500)
await shot(pageLight, '05-error-review')

// 改错本列表 (空状态)
await pageLight.goto(URL + 'errors', { waitUntil: 'networkidle' })
await pageLight.waitForTimeout(1200)
await shot(pageLight, '06-errors-empty')

// ── 2) 暗色 ──
const ctxDark = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
await ctxDark.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, DARK])
const pageDark = await ctxDark.newPage()

await pageDark.goto(URL, { waitUntil: 'networkidle' })
await pageDark.waitForTimeout(2000)
await shot(pageDark, '07-home-dark')

await pageDark.goto(URL + 'words', { waitUntil: 'networkidle' })
await pageDark.waitForTimeout(1500)
await shot(pageDark, '08-wordlist-dark')

await pageDark.goto(URL + 'usage', { waitUntil: 'networkidle' })
await pageDark.waitForTimeout(1500)
await shot(pageDark, '09-usage-dark')

await browser.close()
console.log(`\n✅ 9 张截图 → ${OUT}/`)
