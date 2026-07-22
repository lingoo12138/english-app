import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// C: 语音按钮
console.log('=== C: 语音输入 ===')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const micBtn = await page.locator('button[aria-label*="语音"]').count()
console.log(`语音按钮: ${micBtn > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-chat-mic.png', fullPage: true })

// D: 腾讯翻译
console.log('\n=== D: 腾讯翻译 ===')
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect = page.locator('select').first()
const opts = await trSelect.locator('option').allTextContents()
console.log(`翻译渠道: ${opts.length} (含腾讯: ${opts.some(o => o.includes('腾讯')) ? '✅' : '❌'})`)

await trSelect.selectOption('tencent')
await page.waitForTimeout(500)
const hasKey = await page.locator('input[placeholder*="SecretId"]').count()
console.log(`腾讯 Key 输入框: ${hasKey > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-translate-tencent.png', fullPage: true })

// 腾讯翻译无 key 报错
await page.locator('textarea').fill('Hello')
await page.locator('button:has-text("翻译")').click()
await page.waitForTimeout(1500)
const hasErr = await page.locator('text=SecretId\\|SecretKey').count()
console.log(`腾讯无 key 友好报错: ${hasErr > 0 ? '✅' : '⚠️'}`)

await browser.close()
console.log('\n✅ v0.18 验证完成')
