// 验证 v0.25 W3: 词根扩充 + 改错本
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

  // 1. 写一些 writingErrors 到 IndexedDB
  await page.goto(BASE + '/write', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    return new Promise((res, rej) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('writingErrors', 'readwrite')
        const store = tx.objectStore('writingErrors')
        const items = [
          { source: 'write', original: 'I go to school yesterday', corrected: 'I went to school yesterday',
            errors: [
              { original: 'go', suggestion: 'went', type: 'tense', explanation: '不规则过去式', severity: 0.9 },
              { original: 'school yesterday', suggestion: 'school yesterday', type: 'style', explanation: '顺序', severity: 0.3 },
            ], ts: Date.now() - 5000 },
          { source: 'chat', original: 'I am go to school', corrected: '',
            errors: [
              { original: 'am go', suggestion: 'go', type: 'grammar', explanation: '现在进行时 be going', severity: 0.85 },
            ], ts: Date.now() - 3000 },
          { source: 'write', original: 'There is many book', corrected: 'There are many books',
            errors: [
              { original: 'is', suggestion: 'are', type: 'grammar', explanation: '主谓一致', severity: 0.8 },
              { original: 'book', suggestion: 'books', type: 'grammar', explanation: '可数名词复数', severity: 0.7 },
            ], ts: Date.now() - 1000 },
        ]
        let added = 0
        for (const item of items) {
          const r = store.add(item)
          r.onsuccess = () => { if (++added === items.length) res() }
          r.onerror = () => rej('add failed')
        }
      }
    })
  })
  log('IndexedDB 写入 3 条 writingErrors', true)

  // 2. 进 /errors 页
  await page.goto(BASE + '/errors', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const errorsH1 = await page.locator('h1:has-text("改错本")').first().textContent().catch(() => '')
  log('改错本标题', errorsH1.length > 0, errorsH1)

  // 3. 总览 Tab
  const overviewTab = page.locator('button:has-text("总览")')
  await overviewTab.click()
  await page.waitForTimeout(500)
  const statCards = await page.locator('.card .text-3xl').count()
  log('总览有 4 个统计卡', statCards === 4, `count=${statCards}`)
  await page.screenshot({ path: `${OUT}/v25-errors-overview.png`, fullPage: false })

  // 4. 类型 Tab
  const typesTab = page.locator('button:has-text("类型")')
  await typesTab.click()
  await page.waitForTimeout(500)
  const typeRows = await page.locator('.text-sm:has-text("tense"), .text-sm:has-text("grammar")').count()
  log('类型 Tab 显示错误类型', typeRows > 0, `count=${typeRows}`)
  await page.screenshot({ path: `${OUT}/v25-errors-types.png`, fullPage: false })

  // 5. Top 错词 Tab
  const topTab = page.locator('button:has-text("高频错词")')
  await topTab.click()
  await page.waitForTimeout(500)
  const topWords = await page.locator('text=/went|are|books|go/').count()
  log('Top 错词 Tab 显示错词', topWords > 0, `count=${topWords}`)
  await page.screenshot({ path: `${OUT}/v25-errors-top.png`, fullPage: false })

  // 6. 时间线 Tab
  const timelineTab = page.locator('button:has-text("时间")')
  await timelineTab.click()
  await page.waitForTimeout(500)
  const timelineItems = await page.locator('text=/写作|对话/').count()
  log('时间线 Tab 显示记录', timelineItems >= 3, `count=${timelineItems}`)
  await page.screenshot({ path: `${OUT}/v25-errors-timeline.png`, fullPage: false })

  // 7. 过滤器: only write
  const writeFilter = page.locator('button:has-text("✍️ 写作")')
  await writeFilter.click()
  await page.waitForTimeout(500)
  // 看记录行(text-stone-500 里包含 "对话" 的应该不出现)
  const writeOnly = await page.locator('.text-stone-500:has-text("对话")').count()
  log('写作过滤后无对话项', writeOnly === 0, `对话count=${writeOnly}`)

  // 8. 切回全部 + Home 看 /errors 入口
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const errorsLink = await page.locator('a[href*="errors"]').count()
  log('Home 有改错本入口(nav 中)', errorsLink > 0, `count=${errorsLink}`)

  // 9. WordDetail 看词根显示
  await page.goto(BASE + '/words/w-abruptly', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const rootLabel = await page.locator('text=/词根|root/i').count()
  log('WordDetail 有词根标签', rootLabel > 0, `count=${rootLabel}`)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
