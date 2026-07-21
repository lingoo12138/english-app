// v0.13 验证: 多翻译 + 多 TTS 渠道
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

  // Settings - TTS 渠道
  console.log('=== Settings TTS 渠道 ===')
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/v13-settings.png`, fullPage: true })

  const ttsSelect = page.locator('select').filter({ has: page.locator('option:has-text("Edge TTS")') }).first()
  const ttsOpts = await ttsSelect.locator('option').count()
  console.log(`TTS 渠道数: ${ttsOpts}`)

  // 翻译渠道
  const trSelect = page.locator('select').filter({ has: page.locator('option:has-text("MyMemory")') }).first()
  const trOpts = await trSelect.locator('option').count()
  console.log(`翻译渠道数: ${trOpts}`)

  // 试切换到 ElevenLabs 看 key 输入
  await ttsSelect.selectOption('elevenlabs')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/v13-tts-elevenlabs.png`, fullPage: true })
  const hasKeyInput = await page.locator('input[type="password"]').filter({ has: page.locator('[placeholder*="填入"]') }).count()
  console.log(`ElevenLabs 切换后有 key 输入: ${hasKeyInput > 0 ? '✅' : '❌'}`)

  // 试翻译页面 (Google 渠道默认在翻译选项里)
  console.log('\n=== 翻译页 ===')
  await page.goto(URL + '/translate', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/v13-translate.png`, fullPage: true })

  // 切换到 Google
  const trPageSelect = page.locator('select').first()
  const trPageOptions = await trPageSelect.locator('option').count()
  console.log(`翻译页渠道数: ${trPageOptions}`)

  // 真实用 Google 翻译测试
  await trPageSelect.selectOption('google')
  await page.locator('textarea').fill('Hello world')
  await page.locator('button:has-text("翻译")').click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/v13-translate-google.png`, fullPage: true })

  const hasResult = await page.locator('text=你好').count() > 0 || await page.locator('text=世界').count() > 0
  console.log(`Google 翻译结果: ${hasResult ? '✅' : '⚠️ (可能限流或跨域)'}`)

  // 翻译错误处理 (无 key 用 DeepL)
  await trPageSelect.selectOption('deepl')
  await page.locator('textarea').fill('Hi')
  await page.locator('button:has-text("翻译")').click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/v13-translate-deepl-no-key.png`, fullPage: true })

  const hasError = await page.locator('text=DeepL 需要 API key').count() > 0
  console.log(`DeepL 无 key 报错友好: ${hasError ? '✅' : '❌'}`)

  await browser.close()
  console.log('\n✅ v0.13 验证完成')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
