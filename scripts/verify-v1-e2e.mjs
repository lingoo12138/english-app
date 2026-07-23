// v1.0 集成测试 - 5 闭环
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:4173/english-app'
const OUT = '/workspace/english-app/screenshots/v1-e2e'
mkdirSync(OUT, { recursive: true })

const results = []
function log(name, ok, msg = '') {
  results.push({ name, ok, msg })
  console.log(`${ok ? '✅' : '❌'} ${name}${msg ? ' — ' + msg : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // 0. 清 IndexedDB
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => new Promise(res => {
    const req = indexedDB.deleteDatabase('EnglishAppDB')
    req.onsuccess = req.onerror = () => res()
  }))
  await page.waitForTimeout(500)

  // === 闭环 1: 学习闭环 (Daily → Plan → WordDetail → Pronunciation) ===
  console.log('\n--- 闭环 1: 学习闭环 ---')
  await page.goto(BASE + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/01-daily.png` })
  const dailyHas = await page.locator('h1:has-text("每日一句")').count() > 0
  log('闭环1: /daily 加载', dailyHas)

  await page.goto(BASE + '/plan', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/01-plan.png` })
  const planHas = await page.locator('h1:has-text("学习计划")').count() > 0
  log('闭环1: /plan 加载', planHas)

  // === 闭环 2: AI 闭环 (Chat → Real-time Review → Errors Page) ===
  console.log('\n--- 闭环 2: AI 对话纠错闭环 ---')
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/02-chat.png` })
  const chatHas = await page.locator('h1:has-text("AI 对话陪练")').count() > 0
  log('闭环2: /chat 加载', chatHas)

  // 写一条 chat source error
  await page.evaluate(() => {
    return new Promise((res, rej) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('writingErrors', 'readwrite')
        const store = tx.objectStore('writingErrors')
        const r = store.add({
          source: 'chat',
          original: 'I am go to school',
          corrected: '',
          errors: [{ original: 'am go', suggestion: 'go', type: 'grammar', explanation: '现在进行时', severity: 0.85 }],
          ts: Date.now(),
        })
        r.onsuccess = () => res()
        r.onerror = () => rej('failed')
      }
    })
  })

  await page.goto(BASE + '/errors', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/02-errors.png` })
  const errorsHas = await page.locator('h1:has-text("改错本")').count() > 0
  log('闭环2: /errors 加载', errorsHas)
  // 切到 时间 tab
  const tlTab = page.locator('button:has-text("时间")')
  if (await tlTab.count() > 0) {
    await tlTab.click()
    await page.waitForTimeout(500)
  }
  const errCount = await page.locator('text=I am go to school').count() > 0
  log('闭环2: chat 错误显示 (timeline tab)', errCount)

  // === 闭环 3: 听力闭环 ===
  console.log('\n--- 闭环 3: 听力闭环 ---')
  await page.goto(BASE + '/listen', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const listenHas = await page.locator('h1:has-text("听力模式")').count() > 0
  log('闭环3: /listen 加载', listenHas)
  await page.screenshot({ path: `${OUT}/03-listen.png` })

  // === 闭环 4: 写作闭环 ===
  console.log('\n--- 闭环 4: 写作闭环 ---')
  await page.goto(BASE + '/write', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const writeHas = await page.locator('h1:has-text("写作批改")').count() > 0
  log('闭环4: /write 加载', writeHas)
  await page.screenshot({ path: `${OUT}/04-write.png` })

  // === 闭环 5: Anki 卡片闭环 ===
  console.log('\n--- 闭环 5: Anki 卡片闭环 ---')
  // 先 add favorite
  await page.evaluate(() => {
    return new Promise((res) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('favorites', 'readwrite')
        tx.objectStore('favorites').put({ wordId: 'w-fund', addedAt: Date.now() })
        tx.oncomplete = () => res()
      }
    })
  })

  await page.goto(BASE + '/cards', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/05-cards.png` })
  const cardsH1 = await page.locator('h1').first().textContent()
  log('闭环5: /cards 加载', cardsH1?.length > 0, cardsH1?.slice(0, 30))

  // === 跨页面状态 (Zustand persist) ===
  console.log('\n--- 跨页面状态 ---')
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const settingsHas = await page.locator('h1').first().textContent()
  log('设置页加载', settingsHas?.length > 0, settingsHas?.slice(0, 30))

  await page.goto(BASE + '/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/06-report.png` })
  const reportHas = await page.locator('h1').first().textContent()
  log('学习报告加载', reportHas?.length > 0, reportHas?.slice(0, 30))

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
