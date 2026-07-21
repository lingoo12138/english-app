import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })

// 验证 D: 3 个新 TTS 渠道
console.log('=== D: 3 个新 TTS 渠道 ===')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const ttsSelect = page.locator('select').nth(1)
const opts = await ttsSelect.locator('option').allTextContents()
console.log(`TTS 渠道总数: ${opts.length}`)
console.log(`包含百度: ${opts.some(o => o.includes('百度')) ? '✅' : '❌'}`)
console.log(`包含 Google: ${opts.some(o => o.includes('Google')) ? '✅' : '❌'}`)
console.log(`包含讯飞: ${opts.some(o => o.includes('讯飞')) ? '✅' : '❌'}`)

// 切到百度
await ttsSelect.selectOption('baidu-tts')
await page.waitForTimeout(500)
const baiduKey = await page.locator('text=API Key|Secret Key').count()
console.log(`百度 Key 输入框: ${baiduKey > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15d-baidu.png', fullPage: true })

// 切到讯飞
await ttsSelect.selectOption('iflytek-tts')
await page.waitForTimeout(500)
const iflytekKey = await page.locator('text=APPID|APIKey|APISecret').count()
console.log(`讯飞 Key 输入框: ${iflytekKey > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15d-iflytek.png', fullPage: true })

// 切到 Google
await ttsSelect.selectOption('google-tts')
await page.waitForTimeout(500)
const googleKey = await page.locator('text=API Key (Google Cloud)').count()
console.log(`Google Key 输入框: ${googleKey > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v15d-google.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.15d 验证完成')
