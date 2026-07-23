// v1.3-F2 成就墙闭环
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:4173/english-app'
const OUT = '/workspace/english-app/screenshots/v1.3-f2'
mkdirSync(OUT, { recursive: true })

const results = []
function log(name, ok, msg = '') {
  results.push({ name, ok, msg })
  console.log(`${ok ? '✅' : '❌'} ${name}${msg ? ' — ' + msg : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => new Promise(res => {
    const req = indexedDB.deleteDatabase('EnglishAppDB')
    req.onsuccess = req.onerror = () => res()
  }))
  await page.waitForTimeout(500)

  // 闭环 16: 成就墙
  console.log('\n--- 闭环 16: 成就墙 ---')
  await page.goto(BASE + '/achievements', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/16-achievements.png` })
  const achH1 = await page.locator('h1').first().textContent()
  log('闭环16: /achievements 加载', !!achH1 && achH1.length > 0, achH1?.slice(0, 20))
  const tabs = await page.locator('button').filter({ hasText: /连续学习|词量|改错|收藏/ }).count()
  log('闭环16: 4 个分类 Tab 存在', tabs >= 4, `找到 ${tabs} 个`)
  // 切到 词量
  const wordTab = page.locator('button:has-text("词量")').first()
  if (await wordTab.count() > 0) {
    await wordTab.click()
    await page.waitForTimeout(500)
    log('闭环16: 切到词量 Tab', true)
    await page.screenshot({ path: `${OUT}/16-words.png` })
  }
  // 至少 1 个成就卡 (锁定或解锁)
  const achCards = await page.locator('text=/解锁|已解锁/').count()
  log('闭环16: 成就卡渲染', achCards >= 1, `找到 ${achCards} 个`)
  // 进度条
  const progress = await page.locator('text=/\\d+%/').count()
  log('闭环16: 进度百分比显示', progress >= 1, `找到 ${progress} 个`)

  // 闭环 17: Home 成就入口
  console.log('\n--- 闭环 17: Home 成就卡 ---')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/17-home.png` })
  const homeAchLink = await page.locator('a[href*="/achievements"]').count()
  log('闭环17: Home 成就卡存在', homeAchLink > 0, `找到 ${homeAchLink} 个`)

  await browser.close()
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) process.exit(1)
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
