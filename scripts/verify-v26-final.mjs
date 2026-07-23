// v0.26.1 全模块最终验证
// 4 周路线图 v0.23-v0.26 收官
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:4173/english-app'
const OUT = '/workspace/english-app/screenshots'
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
  await page.evaluate(() => {
    return new Promise(res => {
      const req = indexedDB.deleteDatabase('EnglishAppDB')
      req.onsuccess = req.onerror = () => res()
    })
  })
  await page.waitForTimeout(500)

  // 1. 全部 19 页面都能访问
  const routes = [
    '/', '/words', '/words/w-fund', '/daily', '/translate', '/notebook',
    '/weak', '/review', '/cards', '/settings', '/scenes', '/camera',
    '/chat', '/plan', '/write', '/errors', '/listen', '/report',
  ]
  for (const r of routes) {
    const url = r === '/' ? BASE + '/' : BASE + r
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })
      const status = resp ? resp.status() : 0
      log(`页面 ${r}`, status === 200 || status === 304, `status=${status}`)
    } catch (e) {
      log(`页面 ${r}`, false, e.message)
    }
  }

  // 2. PWA 注册
  const swReg = await page.evaluate(() => {
    return new Promise(res => {
      if (!navigator.serviceWorker) { res('no SW API'); return }
      navigator.serviceWorker.getRegistrations().then(regs => {
        res(regs.length > 0 ? `${regs.length} SWs registered` : 'no SW')
      })
    })
  })
  log('PWA SW 注册', swReg.includes('registered'), swReg)

  // 3. /listen 已有 5 篇短文
  await page.goto(BASE + '/listen', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const listenCount = await page.locator('button:has-text("咖啡店"), button:has-text("机场"), button:has-text("酒店"), button:has-text("商店"), button:has-text("工作")').count()
  log('5 篇听力短文', listenCount === 5, `count=${listenCount}`)

  // 4. /errors 加载
  await page.goto(BASE + '/errors', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const errorsTitle = await page.locator('h1:has-text("改错本")').count() > 0
  log('改错本页加载', errorsTitle)

  // 5. /write 加载
  await page.goto(BASE + '/write', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const writeTitle = await page.locator('h1:has-text("写作批改")').count() > 0
  log('写作批改页加载', writeTitle)

  // 6. /plan 加载
  await page.goto(BASE + '/plan', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const planTitle = await page.locator('h1:has-text("学习计划")').count() > 0
  log('学习计划页加载', planTitle)

  // 7. Home 拆组件渲染
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const todayPlanCard = await page.locator('text=今日学习计划').count() > 0
  const dailySentence = await page.locator('text=每日一句').count() > 0
  log('Home TodayPlanCard 渲染', todayPlanCard)
  log('Home DailySentenceCard 渲染', dailySentence)

  // 8. AIChat 选词 tooltip(v0.23.3 回归)
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.locator('input[placeholder*="输入"]').first().fill('hello world')
  await page.locator('button:has-text("发送")').click()
  await page.waitForTimeout(2500)
  const userMsg = page.locator('.bg-brand-600 .whitespace-pre-wrap').first()
  const wordBox = await userMsg.evaluate((el) => {
    const match = el.textContent?.match(/[a-zA-Z]{3,}/)
    if (!match) return null
    const word = match[0]
    const range = document.createRange()
    const textNode = el.firstChild
    const idx = el.textContent.indexOf(word)
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + word.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    const rect = range.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })
  if (wordBox) {
    await page.evaluate(({ x, y }) => {
      const pTag = document.querySelector('.bg-brand-600 .whitespace-pre-wrap')
      if (pTag) {
        const event = new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y })
        pTag.dispatchEvent(event)
      }
    }, wordBox)
  }
  await page.waitForTimeout(1500)
  const tooltip = await page.locator('[data-word-tooltip]').count()
  log('AIChat 选词 tooltip 仍工作', tooltip > 0, `count=${tooltip}`)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
