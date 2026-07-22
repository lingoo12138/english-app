import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text()}`) })

console.log('=== C: 学习报告 ===')
// 步骤 1: 跑 AI 对话
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const messages = [
  'I want a cup of coffee please',
  'How much is this dress?',
  'Where is the gate 12?',
]
for (const msg of messages) {
  await page.locator('input[placeholder*="英文"]').fill(msg)
  await page.locator('button:has-text("发送")').click()
  await page.waitForTimeout(2500)
}

// 步骤 2: 报告页
await page.goto('http://127.0.0.1:4173/english-app/report', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const hasReport = await page.locator('text=AI 对话学习报告').count()
console.log(`学习报告页: ${hasReport > 0 ? '✅' : '❌'}`)
const hasWords = await page.locator('text=/去重词数/').count()
console.log(`去重词数: ${hasWords > 0 ? '✅' : '❌'}`)

const stats = await page.evaluate(() => {
  const text = document.body.innerText
  return {
    chats: (text.match(/(\d+)\s*个?/g) || []).slice(0, 5),
  }
})
console.log('报告内容:', JSON.stringify(stats))

// 切 tab
await page.locator('text=🔥 高频词').click()
await page.waitForTimeout(800)
const topWords = await page.locator('text=/^\\d+\\.\\s/').count()
console.log(`🔥 高频词列表: ${topWords > 0 ? '✅' : '❌'} (${topWords} 项)`)

await page.screenshot({ path: '/workspace/english-app/screenshots/v21-report.png', fullPage: true })

await page.locator('text=💎 难词').click()
await page.waitForTimeout(500)
await page.screenshot({ path: '/workspace/english-app/screenshots/v21-rare.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.21 验证完成')
