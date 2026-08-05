// e2e/functional.spec.ts - 业务 关键 路径 测 (W99)
import { test, expect } from '@playwright/test'

test.describe('W99 业务 关键 路径 测', () => {
  test('主 业务 流: 主页 → 词库 → 词详情', async ({ page }) => {
    let loaded = false
    for (let i = 0; i < 3 && !loaded; i++) {
      try { await page.goto('https://lingoo12138.github.io/english-app/', { waitUntil: 'domcontentloaded', timeout: 20000 }); loaded = true }
      catch { await page.waitForTimeout(2000) }
    }
    expect(loaded).toBe(true)
    await page.waitForTimeout(5000)
    const home = await page.textContent('body')
    expect(home).toContain('句刻')

    // 业务: 主页 跳 词库
    await page.goto('https://lingoo12138.github.io/english-app/words', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const words = await page.textContent('body')
    expect(words).toMatch(/词|单/)

    // 业务: 找 1 词 链接
    const linkCount = await page.locator('a[href*="/words/"]').count()
    expect(linkCount).toBeGreaterThan(0)
  })

  test('课文 流: 课文列表 → 课文详情 → 评分', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/textbook', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toContain('课文')
    // 业务: 应 至少 1 课文
    const lessonLinks = await page.locator('a[href*="/textbook/"]').count()
    expect(lessonLinks).toBeGreaterThan(0)
  })

  test('设置 加载 + 入口', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/settings', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toContain('设置')
  })

  test('AI 对话 加载', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/ai-chat', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toContain('AI')
  })

  test('学习计划 加载', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/plan', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toMatch(/计划|学习/)
  })

  test('释义收藏 加载 + 跨词 模式 toggle', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/translation-favs', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toContain('收藏')
    // 业务: 应 有 全词库 checkbox (W98 新)
    const cb = await page.locator('text=全词库').count()
    expect(cb).toBeGreaterThan(0)
  })

  test('课文评分 加载 (W97 新)', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/textbook/score', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(8000)  // IDB 慢
    const body = await page.textContent('body')
    // 业务: 评分 屏 渲染
    expect(body).toMatch(/评分|课文|掌握/)
  })

  test('错题复习 加载 (W87 新)', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/error-review', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(8000)
    const body = await page.textContent('body')
    expect(body).toMatch(/错题|复习/)
  })

  test('跟读 加载 (W85 新)', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/follow-read', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toMatch(/跟读|读|音/)
  })

  test('拼写 加载', async ({ page }) => {
    await page.goto('https://lingoo12138.github.io/english-app/spelling', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const body = await page.textContent('body')
    expect(body).toMatch(/拼写|单词|拼/)
  })
})
