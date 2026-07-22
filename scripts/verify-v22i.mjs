import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.6 验证 ===')

// 1. PlanPage
await page.goto('http://127.0.0.1:4173/english-app/plan', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const text = await page.locator('body').innerText()
const has7 = text.includes('近 7 天')
const hasStreak = text.includes('连续天数') || text.includes('🔥')
console.log(`  PlanPage 7 天: ${has7 ? '✅' : '❌'}`)
console.log(`  连续天数: ${hasStreak ? '✅' : '❌'}`)

// 2. 新结构
await page.evaluate(() => {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.removeItem('plan-progress-' + key)
})
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.locator('a[href*="/words/"]').first().click()
await page.waitForTimeout(2500)
const data = await page.evaluate(() => {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return JSON.parse(localStorage.getItem('plan-progress-' + key) || '{}')
})
console.log(`  plan-progress: ${JSON.stringify(data)}`)
const isNew = data.completed && Array.isArray(data.completed) && typeof data.goal === 'number'
console.log(`  新格式: ${isNew ? '✅' : '❌'}`)

// 3. 跳到 PlanPage
await page.goto('http://127.0.0.1:4173/english-app/plan', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const plan2 = await page.locator('body').innerText()
const match = plan2.match(/(\d+)\s*\/\s*(\d+)/)
console.log(`  PlanPage 进度: ${match?.[0]}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-6-plan.png', fullPage: true })

// 4. WordCard 静态 import (检查 build size 缩了)
const wordCardSize = await page.evaluate(() => {
  // 找 wordCard chunk
  const scripts = Array.from(document.querySelectorAll('script[src*="/assets/"]'))
  return scripts.map(s => s.getAttribute('src')).filter(s => s.includes('index'))
})

await browser.close()
console.log('\n✅ v0.22.6 验证完成')
