// 演示脚本: 用 Playwright 跑应用,截图 + 录视频
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'http://127.0.0.1:4173/english-app'
const OUT = '/workspace/english-app/screenshots'

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? true })
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

  // ===== 1. 首页 =====
  console.log('\n=== 1. 首页 ===')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '01-home')

  // ===== 2. 词库 =====
  console.log('\n=== 2. 词库列表 ===')
  await page.goto(BASE + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '02-wordlist')

  // 搜索 + 字母索引交互
  await page.waitForSelector('input', { timeout: 10000 })
  await page.locator('input').first().fill('hello')
  await page.waitForTimeout(300)
  await shot(page, '02b-wordlist-search', { full: false })
  await page.locator('input').first().fill('')
  await page.waitForTimeout(300)

  // ===== 3. 单词详情 =====
  console.log('\n=== 3. 单词详情 ===')
  await page.goto(BASE + '/words/w-hello', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '03-worddetail')

  // ===== 4. 跟读评测 =====
  console.log('\n=== 4. 跟读评测 ===')
  await shot(page, '04-pronunciation', { full: false })

  // ===== 5. 场景课 =====
  console.log('\n=== 5. 场景课列表 ===')
  await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '05-scenes')

  // 场景详情
  await page.goto(BASE + '/scenes/restaurant', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '06-scene-detail')

  // ===== 6. 翻译 =====
  console.log('\n=== 6. 翻译 ===')
  await page.goto(BASE + '/translate', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.fill('textarea', 'Where is the nearest subway station?')
  await page.waitForTimeout(300)
  await shot(page, '07-translate', { full: false })

  // ===== 7. 每日一句 =====
  console.log('\n=== 7. 每日一句 ===')
  await page.goto(BASE + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '08-daily')

  // ===== 8. 复习中心 =====
  console.log('\n=== 8. 复习中心 ===')
  await page.goto(BASE + '/review', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '09-review')

  // ===== 9. 设置 =====
  console.log('\n=== 9. 设置 ===')
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '10-settings')

  // ===== 10. 移动端视图(首页 + 词库) =====
  console.log('\n=== 10. 移动端视图 ===')
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
  })
  const mp = await mobile.newPage()
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(800)
  await mp.screenshot({ path: `${OUT}/11-mobile-home.png` })
  console.log('📸 11-mobile-home.png')

  await mp.goto(BASE + '/words', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(800)
  await mp.screenshot({ path: `${OUT}/12-mobile-words.png`, fullPage: true })
  console.log('📸 12-mobile-words.png')

  await mp.goto(BASE + '/scenes/restaurant', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(800)
  await mp.screenshot({ path: `${OUT}/13-mobile-scene.png`, fullPage: true })
  console.log('📸 13-mobile-scene.png')

  // ===== 11. 暗色模式 =====
  console.log('\n=== 11. 暗色模式 ===')
  const dark = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'zh-CN',
  })
  const dp = await dark.newPage()
  // 切到暗色
  await dp.addInitScript(() => {
    localStorage.setItem('english-app-settings', JSON.stringify({
      state: { darkMode: true, themeColor: 'green', fontSize: 'md', targetLevel: 'cet4', dailyGoal: 10 },
      version: 0,
    }))
  })
  await dp.goto(BASE + '/', { waitUntil: 'networkidle' })
  await dp.waitForTimeout(800)
  await dp.screenshot({ path: `${OUT}/14-home-dark.png`, fullPage: true })
  console.log('📸 14-home-dark.png')

  await browser.close()
  console.log('\n✅ 全部截图完成!')
}

main().catch(e => { console.error(e); process.exit(1) })
