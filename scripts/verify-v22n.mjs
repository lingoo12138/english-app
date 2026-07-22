import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== 直接 IndexedDB 加 3 生词 ===')
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.evaluate(async () => {
  return new Promise((resolve) => {
    const req = indexedDB.open('EnglishAppDB')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('favorites', 'readwrite')
      const store = tx.objectStore('favorites')
      ;['w-abruptly', 'w-absent', 'w-absorb'].forEach(id => {
        store.put({ wordId: id, addedAt: Date.now() })
      })
      tx.oncomplete = () => resolve(true)
    }
  })
})
console.log('  加 3 生词 ✅')

// Notebook
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const nbText = await page.locator('body').innerText()
console.log(`  Notebook "🎴 卡片复习" 链接: ${nbText.includes('卡片复习') ? '✅' : '❌'}`)
console.log(`  共 3 词: ${nbText.includes('共 3') ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-notebook.png', fullPage: true })

// /cards
await page.goto('http://127.0.0.1:4173/english-app/cards', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const cardsText = await page.locator('body').innerText()
const ratings = ['Again', 'Hard', 'Good', 'Easy'].filter(r => cardsText.includes(r))
console.log(`  评级 4 按钮: ${ratings.length}/4 ${ratings.join(', ')}`)
console.log(`  Cards 文字: ${cardsText.slice(0, 300)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-9-cards-full.png', fullPage: true })

// 翻卡
const card = page.locator('[class*="card-container"], [class*="cursor-pointer"]').first()
const cardCount = await card.count()
console.log(`  卡片元素: ${cardCount}`)

await browser.close()
console.log('\n✅ 完成')
