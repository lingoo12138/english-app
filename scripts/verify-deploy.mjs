import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('pageerror', e => console.log('pageerror:', e.message.slice(0, 100)))
page.on('console', m => { if (m.type() === 'error') console.log('console err:', m.text().slice(0, 100)) })

console.log('=== GitHub Pages 部署验证 ===')
for (let i = 0; i < 5; i++) {
  try {
    await page.goto('https://lingoo12138.github.io/english-app/report', { waitUntil: 'domcontentloaded', timeout: 30000 })
    break
  } catch (e) {
    console.log(`  retry ${i+1}: ${e.message.slice(0, 60)}`)
    await new Promise(r => setTimeout(r, 3000))
  }
}
await page.waitForTimeout(5000)

const text = await page.locator('body').innerText()
console.log('body length:', text.length)
console.log('first 100:', text.slice(0, 100))
console.log('has AI 对话学习报告:', text.includes('AI 对话学习报告'))
console.log('has 学习报告:', text.includes('学习报告'))

await page.screenshot({ path: '/workspace/english-app/screenshots/deploy-report-final.png', fullPage: false })
await browser.close()
