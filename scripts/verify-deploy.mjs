// 验证线上 v0.10 部署
// 截图 + 检查关键文本是否存在
import { chromium } from 'playwright'

const URL = 'https://lingoo12138.github.io/english-app'
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

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`❌ [console.error] ${msg.text()}`)
  })

  console.log(`\n=== 访问 ${URL} ===`)
  const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  console.log(`状态码: ${resp.status()}`)

  await page.waitForTimeout(1500)
  await shot(page, 'v10-home')

  // 检查关键文本
  const hasTitle = await page.getByText('句刻').first().isVisible().catch(() => false)
  console.log(`首页有"句刻"标题: ${hasTitle ? '✅' : '❌'}`)

  // 每日一句
  await page.goto(URL + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-daily')
  const dailyCount = await page.locator('text=历史精选').count()
  console.log(`每日一句历史: ${dailyCount > 0 ? '✅' : '❌'}`)

  // 词库
  await page.goto(URL + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-words')
  const wordCount = await page.locator('text=共').first().textContent().catch(() => '')
  console.log(`词库: ${wordCount}`)

  // 复习中心
  await page.goto(URL + '/review', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-review')

  // 场景课(验证 P0-1 修复: 已学完徽章)
  await page.goto(URL + '/scenes', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-scenes')
  const completedBadge = await page.locator('text=已学完').count()
  console.log(`场景课"已学完"徽章: ${completedBadge} 个`)

  // 设置(验证 P1-1 修复: 两个清空按钮)
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-settings')
  const clearBtn1 = await page.locator('text=清空生词本 + 错题本').count()
  const clearBtn2 = await page.locator('text=清空所有数据').count()
  console.log(`Settings 清空按钮(应各1个): 生词本=${clearBtn1}, 全部=${clearBtn2}`)

  // 移动端首页
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'v10-home-mobile')

  await browser.close()
  console.log('\n✅ 验证完成')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
