import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// C
console.log('=== C: AI 对话语音输入 ===')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const micBtn = await page.locator('button[aria-label*="语音"], button[aria-label*="录音"]').count()
console.log(`语音按钮: ${micBtn > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-chat-mic.png', fullPage: true })

// D
console.log('\n=== D: 腾讯翻译 ===')
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect = page.locator('select').first()
const opts = await trSelect.locator('option').allTextContents()
console.log(`翻译渠道 (${opts.length}):`)
opts.forEach((o, i) => console.log(`  ${i+1}. ${o}`))
const tencentOpt = opts.findIndex(o => o.includes('腾讯'))
console.log(`腾讯在第 ${tencentOpt+1} 位: ${tencentOpt >= 0 ? '✅' : '❌'}`)
// 用 value 直接选
await trSelect.selectOption({ value: 'tencent' }).catch(e => console.log('selectOption tencent:', e.message.slice(0, 80)))
await page.waitForTimeout(500)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-translate-tencent.png', fullPage: true })
const tencentKey = await page.locator('text=SecretId\\|SecretKey').count()
console.log(`腾讯 Key 输入框: ${tencentKey > 0 ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.18b 验证完成')
