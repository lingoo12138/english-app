import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
let status = null
page.on('response', r => {
  if (r.url().includes('/english-app/')) {
    status = `${r.status()} ${r.url().slice(-40)}`
  }
})

console.log('Opening /report ...')
for (let i = 0; i < 5; i++) {
  try {
    await page.goto('https://lingoo12138.github.io/english-app/report', { waitUntil: 'domcontentloaded', timeout: 30000 })
    break
  } catch (e) {
    console.log(`Retry ${i+1}: ${e.message.slice(0, 80)}`)
    await new Promise(r => setTimeout(r, 3000))
  }
}

await page.waitForTimeout(5000)
const text = await page.locator('body').innerText()
console.log('Body text length:', text.length)
console.log('First 200 chars:', text.slice(0, 200))
console.log('Status:', status)

await page.screenshot({ path: '/workspace/english-app/screenshots/deploy-report-v2.png', fullPage: false })
await browser.close()
