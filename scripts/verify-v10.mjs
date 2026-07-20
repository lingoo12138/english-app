// v0.10 验证脚本: 验证 P0/P1 修复
import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:4173/english-app'
const OUT = '/workspace/english-app/screenshots'

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`📸 ${name}.png`)
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: 'zh-CN',
  })
  const page = await context.newPage()

  // === P0-3 验证: 每日一词确定性 ===
  console.log('\n=== P0-3: 每日一词确定性 ===')
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const word1 = await page.locator('[class*="text-2xl"]').first().textContent().catch(() => '')
  console.log(`第1次加载: ${word1?.slice(0, 30)}`)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const word2 = await page.locator('[class*="text-2xl"]').first().textContent().catch(() => '')
  console.log(`第2次加载: ${word2?.slice(0, 30)}`)
  console.log(`同一天同一个词: ${word1 === word2 ? '✅' : '❌'}`)
  await shot(page, 'v10-home')

  // === P1-1 验证: Settings 两个清空按钮 ===
  console.log('\n=== P1-1: Settings 选择性清空 ===')
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const btn1 = await page.locator('text=清空生词本 + 错题本').count()
  const btn2 = await page.locator('text=清空所有数据').count()
  console.log(`两个清空按钮: ${btn1 === 1 && btn2 === 1 ? '✅' : '❌'} (生词本=${btn1}, 全部=${btn2})`)
  await shot(page, 'v10-settings')

  // === P1-2 验证: DailyPage 历史 30 句都加收藏 ===
  console.log('\n=== P1-2: DailyPage 历史收藏 ===')
  await page.goto(URL + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const favBtns = await page.locator('button[aria-label*="收藏"]').count()
  console.log(`收藏按钮数量: ${favBtns} (应>=30)`)
  await shot(page, 'v10-daily')

  // === P1-7 验证: 搜索 debounce ===
  console.log('\n=== P1-7: 搜索 debounce ===')
  await page.goto(URL + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const searchInput = page.locator('input[placeholder*="搜索"]')
  await searchInput.fill('a')
  await page.waitForTimeout(100)
  const beforeDebounce = await page.locator('[class*="text-stone"]').first().textContent().catch(() => '')
  await page.waitForTimeout(400)
  const afterDebounce = await page.locator('[class*="text-stone"]').first().textContent().catch(() => '')
  console.log(`搜索 "a" 100ms: ${beforeDebounce}`)
  console.log(`搜索 "a" 500ms: ${afterDebounce}`)

  // === P1-3 验证: 移动端安全区 ===
  console.log('\n=== P1-3: 移动端 ===')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-mobile-home')

  await page.goto(URL + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-mobile-words')

  // === 暗色模式 ===
  await page.evaluate(() => {
    const html = document.documentElement
    html.classList.add('dark')
    localStorage.setItem('theme-mode', 'dark')
  })
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-dark-home')
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-dark-settings')

  await browser.close()
  console.log('\n✅ v0.10 验证完成')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
