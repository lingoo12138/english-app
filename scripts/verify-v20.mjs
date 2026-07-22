import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
let dialogMsg = ''
page.on('dialog', async d => { dialogMsg = d.message(); await d.dismiss() })
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text()}`) })

// C: AI 对话持久化
console.log('=== C: AI 对话持久化 ===')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hasHistoryBtn = await page.locator('text=历史').count()
console.log(`历史按钮: ${hasHistoryBtn > 0 ? '✅' : '❌'}`)
const hasNewBtn = await page.locator('text=新对话').count()
console.log(`新对话按钮: ${hasNewBtn > 0 ? '✅' : '❌'}`)

// 模拟对话(Mock 渠道, 应该自动保存)
await page.locator('input[placeholder*="英文"]').fill('Hello, can you help me?')
await page.locator('button:has-text("发送")').click()
await page.waitForTimeout(2500)
const reply = await page.locator('text=/That|Great|Got it|Mock|interesting/').count()
console.log(`AI 回复: ${reply > 0 ? '✅' : '❌'} (${reply} 处)`)

// 等保存
await page.waitForTimeout(1000)
// 查 IndexedDB
const chatCount = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const req = indexedDB.open('EnglishAppDB')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('chats', 'readonly')
      const store = tx.objectStore('chats')
      const all = store.getAll()
      all.onsuccess = () => resolve(all.result.length)
    }
  })
})
console.log(`IndexedDB chats: ${chatCount} 个`)

// 点历史按钮
await page.locator('text=历史').first().click()
await page.waitForTimeout(500)
const historyVisible = await page.locator('text=历史对话').count()
console.log(`历史侧栏显示: ${historyVisible > 0 ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v20-history.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.20 验证完成')
