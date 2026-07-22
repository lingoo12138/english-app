import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.8 导出/导入验证 ===')

// 1. AIChat 加 3 个对话
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.evaluate(async () => {
  return new Promise((resolve) => {
    const req = indexedDB.open('EnglishAppDB')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('chats', 'readwrite')
      const store = tx.objectStore('chats')
      store.clear()
      ;[
        { id: 1, title: 'Coffee order', scenario: 'cafe', level: 'A2' },
        { id: 2, title: 'Hotel booking', scenario: 'hotel', level: 'B1' },
      ].forEach((c, i) => {
        store.put({
          ...c,
          messages: [{ id: 'm1', role: 'user', content: 'hello', ts: 1 }],
          createdAt: Date.now() - (3 - i) * 1000,
          updatedAt: Date.now() - (3 - i) * 1000,
        })
      })
      tx.oncomplete = () => resolve(true)
    }
  })
})

// 2. AIChat 顶部有"📤 导出"按钮
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const aiText = await page.locator('body').innerText()
const hasExportAll = aiText.includes('📤 导出')
console.log(`  AIChat 顶部"📤 导出": ${hasExportAll ? '✅' : '❌'}`)

// 3. 历史侧栏每条对话有 📤 单条导出按钮
await page.locator('text=历史').first().click()
await page.waitForTimeout(800)
const singleExport = await page.locator('button[aria-label="导出对话"]').count()
console.log(`  每条对话"📤"按钮: ${singleExport} (期望 2)`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-8-export.png', fullPage: true })

// 4. Settings 有"💬 AI 对话数据"section + 导入/清空按钮
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const setText = await page.locator('body').innerText()
const hasAISection = setText.includes('AI 对话数据')
const hasImport = setText.includes('导入对话')
const hasClear = setText.includes('清空所有 AI 对话')
console.log(`  Settings "💬 AI 对话数据": ${hasAISection ? '✅' : '❌'}`)
console.log(`  "📥 导入对话"按钮: ${hasImport ? '✅' : '❌'}`)
console.log(`  "清空所有 AI 对话"按钮: ${hasClear ? '✅' : '❌'}`)

await page.screenshot({ path: '/workspace/english-app/screenshots/v22-8-import.png', fullPage: true })

await browser.close()
console.log('\n✅ v0.22.8 验证完成')
