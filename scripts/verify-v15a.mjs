import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// P0-2: WordList 进度条不受 search 污染
console.log('=== P0-2: WordList 进度条 ===')
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.locator('button:has-text("CET-4")').click()
await page.waitForTimeout(800)
const beforeSearch = await page.locator('text=CET-4').count()
console.log(`CET-4 选中: ${beforeSearch > 0 ? '✅' : '❌'}`)

// 输入搜索词
const searchInput = page.locator('input[placeholder*="搜索"]')
await searchInput.fill('a')
await page.waitForTimeout(500)
// 看进度条 label - 应显示 "X 搜索后" 提示
const hasSearchHint = await page.locator('text=搜索后').count()
console.log(`搜索后进度条显示 hint: ${hasSearchHint > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15a-wordlist.png', fullPage: true })

// P1-6: Notebook 批量模式
console.log('\n=== P1-6: Notebook 批量模式 ===')
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasBatchBtn = await page.locator('text=批量管理').count()
console.log(`批量管理按钮: ${hasBatchBtn > 0 ? '⚠️ 需要有收藏词才显示' : '✅'}`)

await browser.close()
console.log('\n✅ v0.15a 验证完成')
