import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.7 B+D 验证 ===')

// 1. AIChat 历史搜索
console.log('1. AIChat 历史搜索...')
// 加 3 个对话
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
        { id: 1, title: 'Coffee shop ordering', scenario: 'cafe', level: 'A2', messages: [{ id: 'm1', role: 'user', content: 'I want a cup of coffee', ts: 1 }] },
        { id: 2, title: 'Hotel check-in', scenario: 'hotel', level: 'B1', messages: [{ id: 'm2', role: 'user', content: 'I have a reservation', ts: 2 }] },
        { id: 3, title: 'Airport gate', scenario: 'airport', level: 'A1', messages: [{ id: 'm3', role: 'user', content: 'Where is gate 12?', ts: 3 }] },
      ].forEach((c, i) => {
        store.put({ ...c, createdAt: Date.now() - (3 - i) * 1000, updatedAt: Date.now() - (3 - i) * 1000 })
      })
      tx.oncomplete = () => resolve(true)
    }
  })
})

await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.locator('text=历史').first().click()
await page.waitForTimeout(800)
const histText = await page.locator('body').innerText()
const hasSearch = histText.includes('搜索标题') || histText.includes('搜索')
const hasFilter = histText.includes('全部') || histText.includes('☕')
console.log(`  搜索框: ${hasSearch ? '✅' : '❌'}`)
console.log(`  场景过滤: ${hasFilter ? '✅' : '❌'}`)

await page.screenshot({ path: '/workspace/english-app/screenshots/v22-7-history-search.png', fullPage: true })

// 测搜索
const searchIn = page.locator('input[placeholder*="搜索"]')
await searchIn.fill('hotel')
await page.waitForTimeout(500)
const filtered = await page.locator('body').innerText()
const hasHotel = filtered.includes('Hotel check-in')
const hasCoffee = !filtered.includes('Coffee shop')
console.log(`  搜 "hotel" 找到 Hotel: ${hasHotel ? '✅' : '❌'}`)
console.log(`  搜 "hotel" 排除 Coffee: ${hasCoffee ? '✅' : '❌'}`)

await searchIn.fill('')
await page.waitForTimeout(500)

// 2. Mistral UI 警告
console.log('\n2. Mistral UI 警告...')
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const llmSection = page.locator('h3:has-text("AI 渠道")').locator('..')
const llmSel = llmSection.locator('select').first()
const opts = await llmSel.locator('option').allTextContents()
const mistralOpt = opts.find(o => o.includes('Mistral'))
console.log(`  Mistral option: ${mistralOpt ? '✅' : '❌'}`)
if (mistralOpt) {
  await llmSel.selectOption({ label: mistralOpt })
  await page.waitForTimeout(1500)
  const setText = await page.locator('body').innerText()
  const hasWarn = setText.includes('Mistral 不支持图像')
  console.log(`  Mistral 警告显示: ${hasWarn ? '✅' : '❌'}`)
  await page.screenshot({ path: '/workspace/english-app/screenshots/v22-7-mistral-warn.png', fullPage: false })
}

// 3. cleanupOldProgress
console.log('\n3. cleanupOldProgress 启动...')
// 加 60 天前 key
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const before = await page.evaluate(() => {
  const d = new Date()
  d.setDate(d.getDate() - 60)
  const k = `plan-progress-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.setItem(k, '{"completed":[],"goal":10}')
  const has = localStorage.getItem(k) !== null
  return { k, has }
})
console.log(`  加 60 天前 key: ${before.has ? '✅' : '❌'}`)
// 刷新触发 useEffect
await page.reload()
await page.waitForTimeout(2000)
const after = await page.evaluate(() => {
  const d = new Date()
  d.setDate(d.getDate() - 60)
  const k = `plan-progress-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return localStorage.getItem(k) === null
})
console.log(`  60 天前 key 已清理: ${after ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.22.7 验证完成')
