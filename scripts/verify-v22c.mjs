import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.1 验证 P2-3 + P2-4 ===')

// 1. Camera 顶部提示
console.log('1. P2-3: Camera 顶部 1-5 提示...')
await page.goto('http://127.0.0.1:4173/english-app/camera', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const camText = await page.locator('body').innerText()
const has15 = camText.includes('1-5') || camText.includes('每次识别')
console.log(`  Camera 顶部 "1-5": ${has15 ? '✅' : '❌'}`)
console.log(`  Camera 前 100: ${camText.slice(0, 100)}`)

// 2. LearnReport 准确率透明度
console.log('2. P2-4: LearnReport 准确率透明度...')
// 加 1 个对话记录
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.evaluate(async () => {
  return new Promise((resolve) => {
    const req = indexedDB.open('EnglishAppDB')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('chats', 'readwrite')
      const store = tx.objectStore('chats')
      store.put({
        scenario: 'cafe',
        level: 'A2',
        title: 'Coffee shop',
        messages: [
          { id: 'm1', role: 'user', content: 'I want a cup of coffee please', ts: Date.now() - 1000 },
          { id: 'm2', role: 'assistant', content: 'Sure!', ts: Date.now() },
        ],
        createdAt: Date.now() - 2000,
        updatedAt: Date.now(),
      })
      tx.oncomplete = () => resolve(true)
    }
  })
})
console.log('  加 1 对话')

await page.goto('http://127.0.0.1:4173/english-app/report', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const repText = await page.locator('body').innerText()
const hasTransparency = repText.includes('未匹配') || repText.includes('停用词')
const hasMatchDetail = /\d+\s*\/\s*\d+/.test(repText)  // "5 / 6 = XX%"
console.log(`  显示"未匹配"说明: ${hasTransparency ? '✅' : '❌'}`)
console.log(`  显示"X / Y"分数: ${hasMatchDetail ? '✅' : '❌'}`)
console.log(`  Report 关键文: ${repText.slice(0, 200)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-1-report.png', fullPage: false })

await browser.close()
console.log('\n✅ v0.22.1 验证完成')
