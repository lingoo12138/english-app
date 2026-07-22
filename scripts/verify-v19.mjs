import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
let dialogMsg = ''
page.on('dialog', async d => { dialogMsg = d.message(); await d.dismiss() })
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// 1. 翻译页下拉选项
console.log('=== D: 翻译自定义端点 ===')
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect = page.locator('select').first()
const opts = await trSelect.locator('option').allTextContents()
console.log(`翻译渠道 (${opts.length}): ${opts.join(' | ')}`)

// 2. Settings 加自定义翻译端点 UI
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasCustomTr = await page.locator('text=自定义翻译端点').count()
console.log(`自定义翻译端点 UI: ${hasCustomTr > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v19-settings.png', fullPage: true })

// 3. 加自定义翻译(非法 URL)
const addBtns = await page.locator('text=+ 添加').all()
console.log(`+ 添加 按钮数: ${addBtns.length}`)
// 找到"自定义翻译端点"section 的 + 添加按钮
const customTrSection = page.locator('text=自定义翻译端点').locator('..').locator('..')
await customTrSection.locator('text=+ 添加').click()
await page.waitForTimeout(500)

// 填非法 URL
const lastNameInput = page.locator('input[placeholder*="显示名"]').last()
await lastNameInput.fill('我的翻译代理')
const lastEndpointInput = page.locator('input[placeholder="endpoint URL"]')
await lastEndpointInput.fill('not-a-url')
dialogMsg = ''
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
console.log(`非法 URL 报警: ${dialogMsg.includes('http') ? '✅' : '❌'} (${dialogMsg.slice(0, 50)})`)

// 填合法 URL
await lastEndpointInput.fill('https://api.example.com/translate')
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
const hasCustom = await page.locator('text=我的翻译代理').count()
console.log(`合法 URL 添加: ${hasCustom > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v19-settings-after.png', fullPage: true })

// 4. 翻译页用自定义渠道
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect2 = page.locator('select').first()
const newOpts = await trSelect2.locator('option').allTextContents()
console.log(`翻译渠道 (${newOpts.length}): 含我的翻译代理: ${newOpts.some(o => o.includes('我的翻译代理')) ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.19 验证完成')
