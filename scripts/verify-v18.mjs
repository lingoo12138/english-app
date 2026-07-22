import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// C: AI 对话语音输入按钮
console.log('=== C: AI 对话语音输入 ===')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const micBtn = await page.locator('button[aria-label*="语音"], button[aria-label*="录音"]').count()
console.log(`语音按钮: ${micBtn > 0 ? '✅' : '❌'} (${micBtn} 个)`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-chat-mic.png', fullPage: true })

// 点语音按钮测试(浏览器会问麦克风权限)
const micClick = page.locator('button[aria-label*="语音"]').first()
if (await micClick.count() > 0) {
  await micClick.click().catch(e => console.log('麦克风按钮点击:', e.message.slice(0, 50)))
  await page.waitForTimeout(1500)
  const micActive = await page.locator('button[aria-label*="停止"]').count()
  console.log(`麦克风激活状态: ${micActive > 0 ? '✅ 录音中' : '⚠️ 未激活(可能权限/不支持)'}`)
  await page.screenshot({ path: '/workspace/english-app/screenshots/v18-chat-mic-active.png', fullPage: true })
  // 停掉
  await micClick.click().catch(() => {})
}

// D: 腾讯翻译渠道
console.log('\n=== D: 腾讯翻译 ===')
await page.goto('http://127.0.0.1:4173/english-app/translate', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trSelect = page.locator('select').first()
const opts = await trSelect.locator('option').allTextContents()
console.log(`翻译渠道数: ${opts.length}`)
console.log(`包含腾讯: ${opts.some(o => o.includes('腾讯')) ? '✅' : '❌'}`)
await trSelect.selectOption('tencent')
await page.waitForTimeout(500)
const tencentKey = await page.locator('text=SecretId\\|SecretKey').count()
console.log(`腾讯 Key 输入框: ${tencentKey > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-translate-tencent.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.18 验证完成')
