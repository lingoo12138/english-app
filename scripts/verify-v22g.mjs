import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.4 LLM 渠道验证 ===')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const setText = await page.locator('body').innerText()
const hasGoogle = setText.includes('Google AI Studio') || setText.includes('Gemini')
const hasMistral = setText.includes('Mistral')
console.log(`  Google AI Studio: ${hasGoogle ? '✅' : '❌'}`)
console.log(`  Mistral AI: ${hasMistral ? '✅' : '❌'}`)

// 找 LLM select (用 AI 渠道 标题)
const llmSection = page.locator('h3:has-text("AI 渠道")').locator('..')
const llmSel = llmSection.locator('select').first()
const llmCount = await llmSel.count()
if (llmCount === 0) {
  console.log('  LLM select 没找到')
  await browser.close()
  process.exit(1)
}
const opts = await llmSel.locator('option').allTextContents()
console.log(`  LLM 渠道数: ${opts.length} (期望 10, 8 + Google + Mistral)`)
opts.forEach((o, i) => console.log(`    ${i+1}. ${o}`))

// 选 Google AI Studio
const optGoogle = opts.find(o => o.includes('Google AI Studio'))
const optMistral = opts.find(o => o.includes('Mistral'))
console.log(`\n  选 Google AI Studio: ${optGoogle ? '✅' : '❌'} (${optGoogle})`)
console.log(`  选 Mistral AI: ${optMistral ? '✅' : '❌'} (${optMistral})`)

if (optGoogle) {
  await llmSel.selectOption({ label: optGoogle })
  await page.waitForTimeout(1000)
  // model select
  const allSels = page.locator('select').filter({ hasText: /gemini|mistral|qwen|gpt/ })
  const modelSels = await allSels.count()
  console.log(`\n  Model selects: ${modelSels}`)
  if (modelSels > 0) {
    const models = await allSels.first().locator('option').allTextContents()
    console.log(`  Gemini models: ${models.length}`)
    models.forEach((m, i) => console.log(`    ${i+1}. ${m}`))
  }
}

await page.screenshot({ path: '/workspace/english-app/screenshots/v22-4-llm.png', fullPage: true })
await browser.close()
console.log('\n✅ v0.22.4 验证完成')
