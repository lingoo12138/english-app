// 验证 v0.23.1 W1-B: AI 对话中单词收藏
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

  // 0. 先清 IndexedDB
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    return new Promise(res => {
      const req = indexedDB.deleteDatabase('EnglishAppDB')
      req.onsuccess = req.onerror = () => res()
    })
  })
  await page.waitForTimeout(500)

  // 1. 进 /chat
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 2. 用 LLM Mock 渠道(应该会有欢迎语或自动响应)
  // 或者直接发消息
  const input = page.locator('input[placeholder*="输入"]').first()
  await input.fill('hello world')
  await page.locator('button:has-text("发送")').click()
  await page.waitForTimeout(2000)

  // 3. 检查消息渲染
  const msgCount = await page.locator('.whitespace-pre-wrap').count()
  log('AIChat 消息已渲染', msgCount > 0, `count=${msgCount}`)
  await page.screenshot({ path: `${OUT}/v23b-chat.png`, fullPage: false })

  // 4. 模拟选词: 用 Playwright 的 mouse API 选中 + mouseup
  const userMsg = page.locator('.whitespace-pre-wrap').first()
  const text = await userMsg.textContent()
  log('用户消息存在', text?.length > 0, text?.slice(0, 30))

  // 用 page.evaluate 找到单词位置,然后用 mouse 模拟 select + up
  const wordBox = await userMsg.evaluate((el) => {
    const match = el.textContent.match(/[a-zA-Z]{3,}/)
    if (!match) return null
    const word = match[0]
    const idx = el.textContent.indexOf(word)
    // 创建 selection
    const range = document.createRange()
    const textNode = el.firstChild
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + word.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    // 拿单词的 rect
    const rect = range.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })
  log('拿到单词坐标', wordBox !== null, JSON.stringify(wordBox))

  if (wordBox) {
    // Playwright 模拟: 鼠标 down + 微移 + up
    const px = wordBox.x
    const py = wordBox.y
    await page.mouse.move(px - 20, py)
    await page.mouse.down()
    await page.mouse.move(px + 20, py, { steps: 5 })
    await page.mouse.up()
  }
  // 检查 selection 状态
  const sel = await page.evaluate(() => {
    const s = window.getSelection()
    return s ? s.toString() : 'no-selection'
  })
  console.log('  selection after mouse:', sel)
  // 强制 dispatchEvent 触 onMouseUp (Playwright 的 mouse.up 不一定被 React 17+ root delegation 处理)
  await page.evaluate(() => {
    const el = document.querySelector('.whitespace-pre-wrap')
    if (el) {
      const event = new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 600, clientY: 400 })
      el.dispatchEvent(event)
    }
  })
  await page.waitForTimeout(1500)

  // 5. 看 tooltip 出现
  const tooltipCount = await page.locator('.fixed.bg-stone-900').count()
  log('选词 tooltip 弹出', tooltipCount > 0, `count=${tooltipCount}`)
  if (tooltipCount > 0) {
    const tooltipText = await page.locator('.fixed.bg-stone-900').first().textContent()
    log('tooltip 包含翻译', (tooltipText || '').length > 0, tooltipText?.slice(0, 50))
  }
  await page.screenshot({ path: `${OUT}/v23b-tooltip.png`, fullPage: false })

  // 6. tooltip 自动消失(4s)
  await page.waitForTimeout(4500)
  const tooltipAfter = await page.locator('.fixed.bg-stone-900').count()
  log('tooltip 4s 后自动消失', tooltipAfter === 0, `after=${tooltipAfter}`)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
