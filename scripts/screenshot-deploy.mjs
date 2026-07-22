import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text()}`) })

console.log('Opening home...')
try {
  await page.goto('https://lingoo12138.github.io/english-app/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '/workspace/english-app/screenshots/deploy-home.png', fullPage: false })
  console.log('Home OK')
} catch (e) {
  console.log('Home error:', e.message.slice(0, 200))
}

console.log('Opening report...')
try {
  await page.goto('https://lingoo12138.github.io/english-app/report', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/workspace/english-app/screenshots/deploy-report.png', fullPage: false })
  console.log('Report OK')
} catch (e) {
  console.log('Report error:', e.message.slice(0, 200))
}

await browser.close()
