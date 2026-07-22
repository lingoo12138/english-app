import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.4 Google AI Studio + Mistral 验证 ===')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const setText = await page.locator('body').innerText()
const hasGoogle = setText.includes('Google AI Studio') || setText.includes('Gemini')
const hasMistral = setText.includes('Mistral')
console.log(`  Google AI Studio: ${hasGoogle ? '✅' : '❌'}`)
console.log(`  Mistral AI: ${hasMistral ? '✅' : '❌'}`)

// 选 Google AI Studio
const llmSel = page.locator('select').nth(2)  // 第一个是 Preferences, 第二个 TTS, 第三个 LLM
// 实际上 TTS 是 select, LLM 也是 select, 不确定顺序
// 用 label 选
const llmSelect = page.locator('select').filter({ hasText: /OpenAI|Google|Mistral/ }).first()
const llmCount = await llmSelect.count()
console.log(`  LLM select 找到: ${llmCount}`)

if (llmCount > 0) {
  const opts = await llmSelect.locator('option').allTextContents()
  console.log(`  渠道数: ${opts.length}`)
  const newChannels = opts.filter(o => o.includes('Google') || o.includes('Mistral'))
  console.log(`  新渠道: ${newChannels.join(' / ')}`)
}

await page.screenshot({ path: '/workspace/english-app/screenshots/v22-4-llm.png', fullPage: true })

// 选 Gemini 测 model select
if (llmCount > 0) {
  await llmSelect.selectOption({ label: /Google AI/ })
  await page.waitForTimeout(1500)
  // 找 model select
  const modelSel = page.locator('select').filter({ hasText: /gemini/ }).first()
  const modelCount = await modelSel.count()
  console.log(`  Model select: ${modelCount}`)
  if (modelCount > 0) {
    const models = await modelSel.locator('option').allTextContents()
    console.log(`  Gemini models: ${models.length} 个 - ${models.slice(0, 3).join(', ')}...`)
  }
}

await browser.close()
console.log('\n✅ v0.22.4 验证完成')
