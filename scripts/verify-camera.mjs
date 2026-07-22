import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== P2-3 Camera 1-5 提示验证 ===')
await page.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const camText = await page.locator('body').innerText()
const has15 = camText.includes('1-5')
console.log(`  Camera 顶部 "1-5": ${has15 ? '✅' : '❌'}`)
console.log(`  Camera 副标题: ${camText.split('\n').find(l => l.includes('拍照') || l.includes('AI')) || '(not found)'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-1-camera.png', fullPage: false })
await browser.close()
