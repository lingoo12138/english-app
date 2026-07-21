import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`❌ ${m.text()}`) })
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// 找按钮
const btns = await page.locator('button').all()
console.log(`Total buttons: ${btns.length}`)
for (let i = 0; i < Math.min(btns.length, 20); i++) {
  const t = await btns[i].textContent()
  if (t && t.length < 30) console.log(`  #${i}: "${t}"`)
}
// 找 'list' 或 '字母' 或 '分组' 或 '🔤' 字符
const anyMatch = await page.locator('text=/列表|字母|🔤|📋/').count()
console.log(`Match count: ${anyMatch}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v14-notebook-fresh.png', fullPage: true })
await browser.close()
