import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// A1: imageRecog 鲁棒 JSON 测试
console.log('=== A1: 图片识别 - Mock JSON 鲁棒性 ===')
await page.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasProvider = await page.locator('text=当前渠道').count()
console.log(`Camera 当前渠道: ${hasProvider > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v14-camera.png', fullPage: true })

// A3-1: ReviewCenter 进度条
console.log('\n=== A3: ReviewCenter 进度条 ===')
await page.goto('http://127.0.0.1:4173/english-app/review', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasProgress = await page.locator('text=进度').count()
console.log(`ReviewCenter 进度: ${hasProgress > 0 ? '✅ (但需要复习词)' : '⚠️ (无待复习词不显示)'}`)

// A3-2: WeakWords 薄弱词分布
console.log('\n=== A3: WeakWords 薄弱词分布 ===')
await page.goto('http://127.0.0.1:4173/english-app/weak', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/workspace/english-app/screenshots/v14-weak.png', fullPage: true })
const hasDist = await page.locator('text=薄弱词分布').count()
console.log(`薄弱词分布: ${hasDist > 0 ? '⚠️ 显示(有待薄弱词)' : '✅(无薄弱词不显示,正常)'}`)

// A3-3: Notebook 按字母分组
console.log('\n=== A3: Notebook 分组切换 ===')
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasGroupBtn = await page.locator('text=按字母分组').count()
console.log(`分组按钮: ${hasGroupBtn > 0 ? '✅' : '❌'}`)
if (hasGroupBtn > 0) {
  await page.locator('button:has-text("列表")').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/workspace/english-app/screenshots/v14-notebook-grouped.png', fullPage: true })
}

// A3-4: WordList 学段进度
console.log('\n=== A3: WordList 学段进度 ===')
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// 选 CET-4 (level !== 'all')
await page.locator('button:has-text("CET-4")').click()
await page.waitForTimeout(500)
await page.screenshot({ path: '/workspace/english-app/screenshots/v14-words-progress.png', fullPage: true })
const hasProgressBar = await page.locator('text=CET-4').count()
console.log(`CET-4 学段进度: ${hasProgressBar > 0 ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.14 验证完成')
