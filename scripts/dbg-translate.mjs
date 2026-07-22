import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// 切到腾讯
const trSelect = page.locator('select').filter({ has: page.locator('option:has-text("腾讯")') }).first()
await trSelect.selectOption('tencent')
await page.waitForTimeout(800)
const inputs = await page.locator('input').all()
console.log(`Total inputs: ${inputs.length}`)
for (let i = 0; i < inputs.length; i++) {
  const t = await inputs[i].getAttribute('placeholder')
  const ty = await inputs[i].getAttribute('type')
  if (t || ty === 'password') console.log(`  #${i}: type=${ty} placeholder=${t}`)
}
await page.screenshot({ path: '/workspace/english-app/screenshots/v18-settings-tencent.png', fullPage: true })
await browser.close()
