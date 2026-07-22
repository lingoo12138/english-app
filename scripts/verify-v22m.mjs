import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== 真实验证(加 3 生词)===')
// 1. 词库收藏
await page.goto('http://127.0.0.1:4173/english-app/words', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const favBtns = page.locator('button:has-text("☆")')
const c = await favBtns.count()
console.log(`  词库 ☆: ${c}`)
for (let i = 0; i < 3; i++) {
  await favBtns.nth(i).click()
  await page.waitForTimeout(300)
}

// 2. Notebook 入口
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const nbText = await page.locator('body').innerText()
const hasLink = nbText.includes('卡片复习')
const hasWords = nbText.includes('共 3') || nbText.includes('3 个词')
console.log(`  Notebook "🎴 卡片复习" 链接: ${hasLink ? '✅' : '❌'}`)
console.log(`  Notebook 有 3 词: ${hasWords ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-notebook.png', fullPage: true })

// 3. /cards 路由
await page.goto('http://127.0.0.1:4173/english-app/cards', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const cardsText = await page.locator('body').innerText()
const hasAgain = cardsText.includes('Again')
const hasGood = cardsText.includes('Good')
const hasEasy = cardsText.includes('Easy')
const hasHard = cardsText.includes('Hard')
console.log(`  评级 Again/Hard/Good/Easy: ${[hasAgain,hasHard,hasGood,hasEasy].filter(Boolean).length}/4`)
const hasCards = cardsText.includes('卡片复习') || cardsText.includes('复习') || cardsText.includes('翻卡')
console.log(`  /cards 页面渲染: ${hasCards ? '✅' : '❌'}`)
console.log(`  Cards 文字前 200: ${cardsText.slice(0, 200)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-cards-full.png', fullPage: true })

await browser.close()
console.log('\n✅ 真实验证完成')
