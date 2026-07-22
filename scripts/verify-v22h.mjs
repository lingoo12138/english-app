import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.5 A+B 验证 ===')

// 1. PlanPage
console.log('1. /plan 页...')
await page.goto('http://127.0.0.1:4173/english-app/plan', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const planText = await page.locator('body').innerText()
const hasPlan = planText.includes('学习计划') || planText.includes('近 7 天')
const has7 = planText.includes('近 7 天') || planText.includes('完成日')
const hasStreak = planText.includes('连续天数') || planText.includes('🔥')
console.log(`  PlanPage 渲染: ${hasPlan ? '✅' : '❌'}`)
console.log(`  7 天曲线: ${has7 ? '✅' : '❌'}`)
console.log(`  连续天数: ${hasStreak ? '✅' : '❌'}`)
console.log(`  Plan 文字: ${planText.slice(0, 200)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-5-plan.png', fullPage: true })

// 2. 访问词自动 mark
console.log('\n2. 访问词详情自动 mark...')
// 清空 plan-progress 之前
await page.evaluate(() => {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.removeItem('plan-progress-' + key)
})
// 访问词卡
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const cards = await page.locator('a[href*="/words/"]').count()
console.log(`  词卡数: ${cards}`)
// 点第一个
await page.locator('a[href*="/words/"]').first().click()
await page.waitForTimeout(2500)
// 看是否自动 mark
const afterMark = await page.evaluate(() => {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return JSON.parse(localStorage.getItem('plan-progress-' + key) || '[]')
})
console.log(`  访问词后 plan-progress: ${afterMark.length} 个 (期望 1)`)

// 3. Home 今日计划 + 看完整链接
console.log('\n3. Home 计划卡片...')
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const homeText = await page.locator('body').innerText()
const hasHome = homeText.includes('今日学习计划') || homeText.includes('今日计划')
const hasViewAll = homeText.includes('看完整')
console.log(`  Home 计划卡片: ${hasHome ? '✅' : '❌'}`)
console.log(`  "看完整"链接: ${hasViewAll ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.22.5 验证完成')
