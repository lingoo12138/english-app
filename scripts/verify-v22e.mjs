import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.3 今日计划验证 ===')
await page.goto('http://127.0.0.1:4173/english-app/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const homeText = await page.locator('body').innerText()
const hasPlan = homeText.includes('今日学习计划') || homeText.includes('今日计划')
console.log(`  今日计划卡片: ${hasPlan ? '✅' : '❌'}`)
const hasProgress = /\d+\s*\/\s*\d+/.test(homeText) && homeText.includes('计划')
console.log(`  进度 X/Y 显示: ${hasProgress ? '✅' : '❌'}`)
console.log(`  Home 前 300: ${homeText.slice(0, 300)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-3-plan.png', fullPage: false })

// 点 ✓ 标记
const checkBtns = page.locator('button[aria-label="标记完成"]')
const checkCount = await checkBtns.count()
console.log(`  ✓ 按钮数: ${checkCount}`)
if (checkCount > 0) {
  await checkBtns.first().click()
  await page.waitForTimeout(1500)
  const afterText = await page.locator('body').innerText()
  // 查进度是否 +1
  const match1 = homeText.match(/(\d+)\s*\/\s*(\d+)/)
  const match2 = afterText.match(/(\d+)\s*\/\s*(\d+)/)
  console.log(`  标记前: ${match1?.[0]}, 标记后: ${match2?.[0]}`)
  if (match1 && match2 && parseInt(match2[1]) > parseInt(match1[1])) {
    console.log(`  标记后进度增加: ✅`)
  }
}

await browser.close()
console.log('\n✅ v0.22.3 验证完成')
