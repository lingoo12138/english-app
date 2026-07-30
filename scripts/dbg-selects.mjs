import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const selects = await page.locator('select').all()
for (let i = 0; i < selects.length; i++) {
  const opts = await selects[i].locator('option').allTextContents()
  console.log(`select[${i}]: ${opts.length} opts, sample: ${opts.slice(0, 3).join('|')}`)
}
await browser.close()
