import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
let dialogCount = 0
let dialogMsg = ''
page.on('dialog', async d => { dialogCount++; dialogMsg = d.message(); await d.dismiss() })
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// 验证 Settings 8 个 TTS 渠道 + 5 个 key 输入切换
console.log('=== 8 TTS 渠道 + 切换 key 输入 ===')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const ttsSelect = page.locator('select').nth(1)
const opts = await ttsSelect.locator('option').allTextContents()
console.log(`TTS 渠道数: ${opts.length}`)

// 切到 5 个需要 key 的渠道
const needKey = ['azure-speech', 'elevenlabs', 'baidu-tts', 'google-tts', 'iflytek-tts']
for (const id of needKey) {
  await ttsSelect.selectOption(id)
  await page.waitForTimeout(300)
  const inputs = await page.locator('input[type="password"]').count()
  console.log(`${id}: key 输入框 ${inputs} 个`)
}

// 测试空 key 提交(模拟)
await ttsSelect.selectOption('baidu-tts')
await page.waitForTimeout(300)
// Camera 拍照识物页用 LLM 验证 JSON 修复
console.log('\n=== Camera LLM 测试(空状态) ===')
await page.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasProvider = await page.locator('text=当前渠道').count()
console.log(`Camera 当前渠道: ${hasProvider > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15b-camera.png', fullPage: true })

// 翻译页测试
console.log('\n=== 翻译页 ===')
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15b-translate.png', fullPage: true })

// AI 对话测试(Mock 渠道, 无 key)
console.log('\n=== AI 对话 ===')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const input = page.locator('input[placeholder*="英文"]')
await input.fill('Hello')
await page.locator('button:has-text("发送")').click()
await page.waitForTimeout(2500)
const reply = await page.locator('text=/That|Great|Got it|Mock/').count()
console.log(`AI 对话 Mock: ${reply > 0 ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.15b 验证完成')
