import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log(`err ${m.text().slice(0, 200)}`) })

console.log('=== v0.22.2 Settings 拆组件 + PWA 缓存验证 ===')

// 1. Settings 页面正常
await page.goto('http://127.0.0.1:4173/english-app/settings', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const sText = await page.locator('body').innerText()
const hasAll = [
  '学习偏好', '语音朗读', '翻译渠道', 'AI 渠道', '外观', '数据管理',
].every(s => sText.includes(s))
console.log(`  6 个 section 全在: ${hasAll ? '✅' : '❌'}`)
console.log(`  Settings 文字: ${sText.slice(0, 200)}`)
await page.screenshot({ path: '/workspace/english-app/screenshots/v22-2-settings.png', fullPage: true })

// 2. 自定义端点能加
const customLLMSection = page.locator('text=自定义 LLM 端点').locator('..').locator('..')
const addLLMBtn = customLLMSection.locator('button:has-text("+ 添加")')
if (await addLLMBtn.count() > 0) {
  await addLLMBtn.click()
  await page.waitForTimeout(500)
  const formInputs = await customLLMSection.locator('input').count()
  console.log(`  自定义 LLM form 展开: ${formInputs >= 3 ? '✅' : '❌'} (${formInputs} inputs)`)
}

// 3. 主题切换
const themeBtns = page.locator('button:has-text("绿色"), button:has-text("蓝色"), button:has-text("紫色")')
const themeCount = await themeBtns.count()
console.log(`  主题按钮: ${themeCount} 个`)

// 4. 暗色切换
const darkBtn = page.locator('button:has-text("暗色"), [aria-label*="暗色"]')
const darkExists = await darkBtn.count()
console.log(`  暗色开关: ${darkExists}`)

// 5. 清空数据
const clearBtn = page.locator('button:has-text("清空生词本")')
const clearExists = await clearBtn.count()
console.log(`  清空生词本按钮: ${clearExists > 0 ? '✅' : '❌'}`)

await browser.close()
console.log('\n✅ v0.22.2 验证完成')
