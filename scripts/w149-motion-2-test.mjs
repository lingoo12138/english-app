// W149 反馈 4-7: 验证 4 大动效
// 4. stagger-item hover scale
// 5. modal-popup spring (键盘快捷键面板 ? 触发)
// 6. progress-fill (Home XP 进度条)
// 7. 暗色切换 fade (Settings 主题切换)
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = 'screenshots/w149-motion-2'
mkdirSync(OUT, { recursive: true })

const KEY = 'english-app-settings-v2'
const LIGHT = JSON.stringify({ state: { darkMode: false, themeColor: 'green', fontSize: 'md' }, version: 0 })
const DARK = JSON.stringify({ state: { darkMode: true, themeColor: 'green', fontSize: 'md' }, version: 0 })

const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' })

// ── 1) 4. stagger-item hover ──
const ctxLight = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await ctxLight.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, LIGHT])
const page = await ctxLight.newPage()
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const firstCard = page.locator('.card-interactive').first()
await page.screenshot({ path: `${OUT}/01-card-static.png` })
const box1 = await firstCard.boundingBox()
await firstCard.hover()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/02-card-hover.png` })
const box2 = await firstCard.boundingBox()
console.log(`✓ 4. 卡片 hover: 静态 y=${box1?.y.toFixed(1)}, hover y=${box2?.y.toFixed(1)} (上移 ${(box1?.y - box2?.y).toFixed(1)}px)`)

// ── 2) 5. modal-popup spring (键盘 ? 触发) ──
await page.keyboard.press('?')
await page.waitForTimeout(100)
await page.screenshot({ path: `${OUT}/03-modal-100ms.png` })
await page.waitForTimeout(150)
await page.screenshot({ path: `${OUT}/04-modal-250ms.png` })
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/05-modal-450ms.png` })
console.log('✓ 5. 模态框 spring (100/250/450ms)')

// 关闭
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

// ── 3) 6. progress-fill (Home XP) ──
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/06-home-progress.png` })
console.log('✓ 6. Home 进度条')

// ── 4) 7. 暗色切换 fade ──
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/07-settings-light.png` })

// 触发暗色切换 (点主题按钮)
const themeBtn = page.locator('[data-testid="theme-toggle"], button:has-text("深色"), button:has-text("暗色"), button:has-text("Dark")').first()
if (await themeBtn.count() > 0) {
  await themeBtn.click()
  await page.waitForTimeout(50)
  await page.screenshot({ path: `${OUT}/08-dark-50ms.png` })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/09-dark-200ms.png` })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/10-dark-400ms.png` })
  console.log('✓ 7. 暗色切换 fade (50/200/400ms)')
} else {
  console.log('⚠ theme button not found, 直接切 darkMode via localStorage')
  await page.evaluate(() => {
    localStorage.setItem('english-app-settings-v2', JSON.stringify({ state: { darkMode: true, themeColor: 'green', fontSize: 'md' }, version: 0 }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${OUT}/08-dark-50ms.png` })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/09-dark-200ms.png` })
}

await browser.close()
console.log(`\n✅ 10 张动效截图 → ${OUT}/`)
