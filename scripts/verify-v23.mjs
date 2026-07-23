// 验证 v0.23.0 W1: 写作批改 + 每日一句跟读
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

  // 1. Home 看写作批改入口
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const hasWriteLink = await page.locator('a[href="/english-app/write"]').count() > 0
  log('Home 有写作批改入口', hasWriteLink)
  await page.screenshot({ path: `${OUT}/v23-home.png`, fullPage: false })

  // 2. /write 页面
  await page.goto(BASE + '/write', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // 找包含"写作批改"的 H1
  const writeTitle = await page.locator('h1:has-text("写作批改")').first().textContent().catch(() => '')
  log('WritePage 标题', writeTitle.length > 0, writeTitle)

  // 2.1 输入有错误英文
  const textarea = page.locator('textarea')
  await textarea.fill('I go to school yesterday and play with my friend. There is many book on the desk. I am interesting in learn English.')
  await page.screenshot({ path: `${OUT}/v23-write-input.png`, fullPage: false })

  // 2.2 检查字符计数
  const counterText = await page.locator('text=/\\d+\\/500/').first().textContent().catch(() => '')
  log('WritePage 字符计数', counterText.length > 0, counterText)

  // 2.3 检查 Tab
  const historyTab = await page.locator('text=我的作文').count() > 0
  log('WritePage 历史 Tab', historyTab)

  // 2.4 触发批改(没 API Key 会报错)
  const reviewBtn = page.locator('button:has-text("开始批改")')
  const reviewBtnVisible = await reviewBtn.isVisible()
  log('WritePage 批改按钮', reviewBtnVisible)
  if (reviewBtnVisible) {
    await reviewBtn.click()
    await page.waitForTimeout(2000)
    const errorVisible = await page.locator('text=/API Key|渠道|重试|失败/').count() > 0
    log('WritePage 批改触发(无 key 报错预期)', errorVisible)
  }
  await page.screenshot({ path: `${OUT}/v23-write-error.png`, fullPage: false })

  // 3. DailyPage 跟读链接
  await page.goto(BASE + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const pronounceLink = await page.locator('a:has-text("跟读")').count() > 0
  log('DailyPage 有 🎤 跟读', pronounceLink)
  await page.screenshot({ path: `${OUT}/v23-daily.png`, fullPage: false })

  // 4. 跟读页 /pronounce-custom
  if (pronounceLink) {
    const linkHref = await page.locator('a:has-text("跟读")').first().getAttribute('href')
    log('跟读链接带 text 参数', linkHref?.includes('text='), linkHref)
    // href 已含 /english-app prefix,直接拼 origin
    const fullUrl = linkHref.startsWith('http') ? linkHref : 'http://localhost:4173' + linkHref
    await page.goto(fullUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)  // 等 PronunciationPractice 渲染
    const ppTitle = await page.locator('h1, h2').first().textContent().catch(() => '')
    log('跟读页加载', ppTitle.length > 0, ppTitle)
    // PronunciationPractice 组件应该有"开始跟读"按钮
    const allBtnCount = await page.locator('button').count()
    const recordBtn = await page.locator('button[aria-label*="跟读"]').count()
    log('PronunciationPractice 跟读按钮', recordBtn > 0, `all=${allBtnCount} target=${recordBtn}`)
    await page.screenshot({ path: `${OUT}/v23-pronounce.png`, fullPage: false })
  }

  // 5. 无 text 时的 fallback
  await page.goto(BASE + '/pronounce-custom', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const emptyState = await page.locator('text=/没有可跟读|请从/').count() > 0
  log('pronounce-custom 无 text 引导回 /daily', emptyState)

  // 6. /chat 看 AI 对话(W1-B 我会接着做)
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
