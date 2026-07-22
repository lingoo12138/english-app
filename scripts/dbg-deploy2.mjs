import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()

// 监听所有响应
page.on('response', r => {
  if (r.url().includes('/english-app/') || r.url().includes('lingoo12138')) {
    console.log(`  ${r.status()} ${r.url().slice(-50)}`)
  }
})
page.on('console', m => console.log(`[${m.type()}] ${m.text()}`))

console.log('--- /report ---')
await page.goto('https://lingoo12138.github.io/english-app/report', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(3000)

const text = await page.locator('body').innerText()
console.log('Body:', text.slice(0, 300))
await browser.close()
