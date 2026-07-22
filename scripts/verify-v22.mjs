import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
let dialogMsg = ''
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22 修复验证 ===')

// P1-1: WordDetail 词不存在
console.log('1. P1-1: /words/nonexistent-id-xxx...')
await page.goto('http://127.0.0.1:4173/english-app/words/nonexistent-id-xxx', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const t1 = await page.locator('body').innerText()
const isOnlyLoading = t1.trim() === '加载中...'
const showsNotFound = t1.includes('找不到这个词') || t1.includes('不存在')
console.log(`  不再永远加载中: ${!isOnlyLoading ? '✅' : '❌'}`)
console.log(`  显示"找不到": ${showsNotFound ? '✅' : '❌'}`)
const hasReturnBtn = await page.locator('button:has-text("返回词库")').count() > 0
console.log(`  返回词库按钮: ${hasReturnBtn ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-word-not-found.png', fullPage: false })

// P1-2: AIChat race
console.log('2. P1-2: AIChat race...')
await page.goto('http://127.0.0.1:4173/english-app/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const aiIn = page.locator('input[placeholder*="英文"]')
await aiIn.fill('Race test 1')
await page.locator('button:has-text("发送")').click()
await page.waitForTimeout(100)
await aiIn.fill('Race test 2')
await page.locator('button:has-text("发送")').click({ force: true }).catch(() => {})
await page.waitForTimeout(4000)
const t2 = await page.locator('body').innerText()
const replies = (t2.match(/Mock|AI|This|interesting|replying|understood|sure/g) || []).length
console.log(`  AI 回复数: ${replies} (<3 = race 防住, ✅)`)

// P2-1: Notebook 单条删除 confirm (用 IndexedDB 直接加)
console.log('3. P2-1: Notebook 单条删除 confirm...')
// 直接 IndexedDB 加
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const ok = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const req = indexedDB.open('EnglishAppDB')
    req.onsuccess = () => {
      const db = req.result
      // 先清空 favorites
      const tx1 = db.transaction('favorites', 'readwrite')
      tx1.objectStore('favorites').clear()
      tx1.oncomplete = () => {
        // 从词库找一个真 ID
        fetch('/english-app/data/words.json').then(r => r.json()).then(words => {
          if (!words || !words[0]) return resolve(false)
          const tx2 = db.transaction('favorites', 'readwrite')
          tx2.objectStore('favorites').put({ wordId: words[0].id, addedAt: Date.now() })
          tx2.oncomplete = () => resolve(words[0].id)
        })
      }
    }
  })
})
console.log(`  IndexedDB 加 fav: ${ok}`)
await page.goto('http://127.0.0.1:4173/english-app/notebook', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const nbText = await page.locator('body').innerText()
console.log(`  Notebook 文字前 100: ${nbText.slice(0, 100)}`)
const xBtns = await page.locator('button[aria-label="从生词本移除"]').count()
console.log(`  ✕ 按钮: ${xBtns}`)
if (xBtns > 0) {
  let confirmShown = false
  let confirmMsg = ''
  const handler = async d => { confirmShown = true; confirmMsg = d.message(); await d.accept().catch(() => {}) }
  page.on('dialog', handler)
  await page.locator('button[aria-label="从生词本移除"]').first().click()
  await page.waitForTimeout(1500)
  page.off('dialog', handler)
  console.log(`  Confirm 弹出: ${confirmShown ? '✅' : '❌'}`)
  console.log(`  Confirm msg: "${confirmMsg}"`)
}

await browser.close()
console.log('\n✅ v0.22 验证完成')
