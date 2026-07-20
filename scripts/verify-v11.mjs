// v0.11 验证: 多渠道架构
import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:4173/english-app'
const OUT = '/workspace/english-app/screenshots'

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

  page.on('console', m => {
    if (m.type() === 'error') console.log(`❌ [console.error] ${m.text()}`)
  })

  // 首页
  console.log('=== 首页 ===')
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-home.png`, fullPage: true })

  const hasChat = await page.locator('text=AI 对话陪练').count()
  console.log(`首页 AI 对话入口: ${hasChat > 0 ? '✅' : '❌'} (${hasChat} 处)`)

  // AI 对话页
  console.log('\n=== AI 对话页 ===')
  await page.goto(URL + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-chat.png`, fullPage: true })
  const scenarioCount = await page.locator('text=☕').count()
  console.log(`场景选择: ${scenarioCount >= 1 ? '✅' : '❌'}`)

  // 拍照识物页
  console.log('\n=== 拍照识物页 ===')
  await page.goto(URL + '/camera', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-camera.png`, fullPage: true })
  const hasProvider = await page.locator('text=当前渠道').count()
  console.log(`当前渠道显示: ${hasProvider > 0 ? '✅' : '❌'}`)

  // 翻译页
  console.log('\n=== 翻译页 ===')
  await page.goto(URL + '/translate', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-translate.png`, fullPage: true })
  const hasProviderSelect = await page.locator('text=翻译渠道').count()
  console.log(`翻译渠道选择器: ${hasProviderSelect > 0 ? '✅' : '❌'}`)

  // 设置页(多渠道)
  console.log('\n=== 设置页(多渠道) ===')
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-settings.png`, fullPage: true })
  const ttsLabel = await page.locator('text=🔊 语音朗读').count()
  const translateLabel = await page.locator('text=🌐 翻译渠道').count()
  const aiLabel = await page.locator('text=🤖 AI 渠道').count()
  console.log(`设置含 TTS(${ttsLabel}) + 翻译(${translateLabel}) + AI(${aiLabel}): ${
    ttsLabel === 1 && translateLabel === 1 && aiLabel === 1 ? '✅' : '❌'
  }`)

  // 移动端首页(底部 tab AI 入口)
  console.log('\n=== 移动端 ===')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(URL + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v11-mobile-home.png`, fullPage: true })
  const aiTab = await page.locator('nav button:has-text("AI")').count()
  console.log(`底部 AI tab: ${aiTab > 0 ? '✅' : '❌'}`)

  // AI 对话模拟对话(Mock)
  await page.goto(URL + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const input = page.locator('input[placeholder*="英文"]')
  await input.fill('Hello, I want to order a coffee')
  await page.locator('button:has-text("发送")').click()
  await page.waitForTimeout(2500)  // 等 mock 响应
  await page.screenshot({ path: `${OUT}/v11-chat-mock.png`, fullPage: true })

  const userMsg = await page.locator('text=Hello, I want to order a coffee').count()
  const replyCount = await page.locator('text=/That|Great|I see|Mock response|Got it/').count()
  console.log(`用户消息显示: ${userMsg > 0 ? '✅' : '❌'}`)
  console.log(`AI 回复(Mock): ${replyCount > 0 ? '✅' : '❌'} (${replyCount} 处)`)

  await browser.close()
  console.log('\n✅ v0.11 验证完成')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
