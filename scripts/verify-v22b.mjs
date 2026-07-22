import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== P2-2 字母索引相邻词验证 ===')
// 先查真词 id
// 先去首页让 fetch base 正确
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const wordIds = await page.evaluate(async () => {
  const r = await fetch('/english-app/data/words.json')
  const words = await r.json()
  return words.slice(0, 5).map(w => ({ id: w.id, word: w.word }))
})
console.log(`  前 5 词:`, wordIds.slice(0, 3))

// 访问第 3 个 (索引 2)
const target = wordIds[2]
console.log(`\n访问 ${target.word} (id=${target.id})...`)
await page.goto(`http://127.0.0.1:4173/english-app/words/${target.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const text = await page.locator('body').innerText()
const hasPrev = text.includes(`← ${wordIds[1].word}`)
const hasNext = text.includes(`${wordIds[3].word} →`)
console.log(`  显示"← ${wordIds[1].word}": ${hasPrev ? '✅' : '❌'}`)
console.log(`  显示"${wordIds[3].word} →": ${hasNext ? '✅' : '❌'}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-neighbors.png', fullPage: false })

// 点 next 跳
if (hasNext) {
  console.log(`\n点击 ${wordIds[3].word} → ...`)
  await page.locator(`button:has-text("${wordIds[3].word} →")`).click()
  await page.waitForTimeout(2000)
  const text2 = await page.locator('body').innerText()
  const newPrev = text2.includes(`← ${wordIds[2].word}`)
  const newNext = text2.includes(`${wordIds[4].word} →`)
  console.log(`  跳到 ${wordIds[3].word}: 邻居重新计算 ${newPrev && newNext ? '✅' : '❌'}`)
}

await browser.close()
console.log('\n✅ P2-2 验证完成')
