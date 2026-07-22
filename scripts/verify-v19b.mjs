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

console.log('=== D: 翻译自定义端点 + 自定义 TTS apiKey 集成 ===')
// TTS 自定义端点测 apiKey
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 加自定义 TTS
const customTtsSection = page.locator('text=自定义 TTS 端点').locator('..').locator('..')
await customTtsSection.locator('text=+ 添加').click()
await page.waitForTimeout(500)
await page.locator('input[placeholder*="显示名"]').last().fill('我的 TTS 代理')
const lastUrl = page.locator('input[placeholder*="endpoint"]').last()
await lastUrl.fill('https://api.example.com/tts')
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
const hasTts = await page.locator('text=我的 TTS 代理').count()
console.log(`自定义 TTS 添加: ${hasTts > 0 ? '✅' : '❌'}`)

// 加自定义 LLM
const customLlmSection = page.locator('text=自定义 LLM 端点').locator('..').locator('..')
await customLlmSection.locator('text=+ 添加').click()
await page.waitForTimeout(500)
await page.locator('input[placeholder*="显示名"]').last().fill('我的 vLLM')
await page.locator('input[placeholder*="baseUrl"]').last().fill('http://localhost:8000/v1')
await page.locator('input[placeholder*="默认模型"]').last().fill('llama-3-8b')
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
const hasLlm = await page.locator('text=我的 vLLM').count()
console.log(`自定义 LLM 添加: ${hasLlm > 0 ? '✅' : '❌'}`)

// 加自定义翻译
const customTrSection = page.locator('text=自定义翻译端点').locator('..').locator('..')
await customTrSection.locator('text=+ 添加').click()
await page.waitForTimeout(500)
await page.locator('input[placeholder*="显示名"]').last().fill('我的翻译代理')
await page.locator('input[placeholder="endpoint URL"]').fill('https://api.example.com/translate')
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
const hasTr = await page.locator('text=我的翻译代理').count()
console.log(`自定义翻译添加: ${hasTr > 0 ? '✅' : '❌'}`)

await page.screenshot({ path: '/workspace/english-app/screenshots/v19b-all-custom.png', fullPage: true })

// 翻译页确认 9 渠道
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect = page.locator('select').first()
const opts = await trSelect.locator('option').allTextContents()
console.log(`翻译页渠道: ${opts.length} (含自定义: ${opts.some(o => o.includes('我的翻译代理')) ? '✅' : '❌'})`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v19b-translate.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.19b 验证完成')
