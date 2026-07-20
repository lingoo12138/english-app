// v0.12 验证: 统一 OpenAI 协议 + 自定义 TTS/LLM 端点
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

  // Settings
  console.log('=== Settings 多渠道 ===')
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/v12-settings.png`, fullPage: true })

  const customTts = await page.locator('text=🎤 自定义 TTS 端点').count()
  const customLlm = await page.locator('text=🛠 自定义 LLM 端点').count()
  console.log(`自定义 TTS 端点 UI: ${customTts > 0 ? '✅' : '❌'}`)
  console.log(`自定义 LLM 端点 UI: ${customLlm > 0 ? '✅' : '❌'}`)

  // LLM 渠道下拉选项数
  const llmSelect = page.locator('select').filter({ has: page.locator('option:has-text("OpenRouter")') }).first()
  const llmOpts = await llmSelect.locator('option').count()
  console.log(`LLM 渠道下拉选项数: ${llmOpts} (内置 8 + 自定义 0)`)

  // 添加自定义 LLM
  console.log('\n=== 添加自定义 LLM ===')
  await page.locator('text=+ 添加').nth(1).click()  // 第 2 个 + 添加 (LLM)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/v12-settings-add-llm.png`, fullPage: true })

  // 模拟添加
  await page.locator('input[placeholder*="显示名"]').last().fill('我的 vLLM 本地')
  await page.locator('input[placeholder*="baseUrl"]').last().fill('http://localhost:8000/v1')
  await page.locator('input[placeholder*="默认模型"]').last().fill('meta-llama/Llama-3-8B')
  await page.locator('button:has-text("➕ 添加")').click()
  await page.waitForTimeout(500)

  const hasCustomLlm = await page.locator('text=我的 vLLM 本地').count()
  console.log(`自定义 LLM 添加成功: ${hasCustomLlm > 0 ? '✅' : '❌'}`)
  await page.screenshot({ path: `${OUT}/v12-settings-after-add.png`, fullPage: true })

  // AI 对话(用 Mock 渠道)
  console.log('\n=== AI 对话(用 Mock 渠道) ===')
  await page.goto(URL + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.locator('input[placeholder*="英文"]').fill('Hello')
  await page.locator('button:has-text("发送")').click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/v12-chat-mock.png`, fullPage: true })

  const reply = await page.locator('text=/That|Great|I see|Got it|Mock/').count()
  console.log(`Mock 回复: ${reply > 0 ? '✅' : '❌'}`)

  await browser.close()
  console.log('\n✅ v0.12 验证完成')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
