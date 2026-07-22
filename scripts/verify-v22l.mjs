import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.9 A+B 验证 ===')

// 1. Settings 学习提醒
console.log('1. Settings 学习提醒...')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const setText = await page.locator('body').innerText()
const hasReminder = setText.includes('学习提醒') || setText.includes('⏰')
const hasNotifPerm = setText.includes('通知权限') || setText.includes('已授权') || setText.includes('未授权')
console.log(`  "⏰ 学习提醒" 卡片: ${hasReminder ? '✅' : '❌'}`)
console.log(`  权限状态显示: ${hasNotifPerm ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-reminder.png', fullPage: true })

// 2. CardReview 路由
console.log('2. /cards 路由...')
await page.goto('http://127.0.0.1:4173/english-app/cards', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const cardsText = await page.locator('body').innerText()
const hasCards = cardsText.includes('卡片复习') || cardsText.includes('生词') || cardsText.includes('Anki') || cardsText.includes('翻卡')
console.log(`  卡片复习渲染: ${hasCards ? '✅' : '❌'}`)
const hasAgain = cardsText.includes('Again') || cardsText.includes('再认')
const hasGood = cardsText.includes('Good') || cardsText.includes('良好')
console.log(`  评级按钮 Again/Good: ${hasAgain && hasGood ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-cards.png', fullPage: true })

// 3. Notebook 入口
console.log('3. Notebook 入口...')
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const nbText = await page.locator('body').innerText()
const hasCardLink = nbText.includes('卡片复习')
console.log(`  Notebook "🎴 卡片复习" 链接: ${hasCardLink ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.22.9 验证完成')
