import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })
let dialogMsg = ''
page.on('dialog', async dialog => {
  dialogMsg = dialog.message()
  console.log(`Alert: ${dialogMsg}`)
  await dialog.dismiss()
})

// 1. Settings P0-1 修复
console.log('=== P0-1 Settings id 修复 ===')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const ttsSelect = page.locator('select').nth(1)
const opts = await ttsSelect.locator('option').allTextContents()
console.log(`TTS 选项数: ${opts.length}`)

await ttsSelect.selectOption('edge-tts')
await page.waitForTimeout(500)
const edgeWarn = await page.locator('text=Edge TTS 浏览器直连可能受 CORS 限制').count()
console.log(`Edge TTS CORS 警告: ${edgeWarn > 0 ? '✅' : '❌'}`)

await ttsSelect.selectOption('azure-speech')
await page.waitForTimeout(500)
const azureKeyInput = await page.locator('text=API Key (Azure Speech)').count()
console.log(`Azure API Key 输入框: ${azureKeyInput > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v13b-azure.png', fullPage: true })

// 2. P1-2 baseUrl 校验 - 试非法 URL
console.log('\n=== P1-2 baseUrl 校验 ===')
// 自定义 LLM 在第 2 个 + 添加(translate 1 个, llm 1 个, ...)
const addBtns = await page.locator('text=+ 添加').all()
console.log(`+ 添加 按钮数: ${addBtns.length}`)
await addBtns[1].click()  // LLM
await page.waitForTimeout(500)

// 填非法 baseUrl
await page.locator('input[placeholder*="显示名"]').last().fill('非法 URL 测试')
await page.locator('input[placeholder*="baseUrl"]').last().fill('not-a-url')
await page.locator('input[placeholder*="默认模型"]').last().fill('test')
dialogMsg = ''
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(800)
console.log(`非法 URL 报警: ${dialogMsg.includes('http') ? '✅' : '❌'} (${dialogMsg.slice(0, 50)})`)

// 填合法 URL
await page.locator('input[placeholder*="baseUrl"]').last().fill('http://localhost:8000/v1')
await page.locator('button:has-text("➕ 添加")').last().click()
await page.waitForTimeout(500)
const hasCustom = await page.locator('text=非法 URL 测试').count()
console.log(`合法 URL 添加: ${hasCustom > 0 ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.13b 验证完成')
