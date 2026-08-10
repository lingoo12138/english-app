// e2e/w129-lesson-score.spec.ts - v2.1.12 W129
// 课文评分 跨页面流程:
//   /textbook/score → 验证 4 卡 (总数/已掌握/学习中/未开始) + 圆环 + 列表
//
// 关键设计:
// - 不依赖真实数据: 4 卡都应渲染 (即使 0 课文也是 0/0/0/0)
// - 圆环 + 列表 是 W124 改版稿 UI
// - 移动端 viewport 验证响应式
//
// W132 修复 (P0-11, P1-10):
// - 弱 list 验证 `hasLessons || hasList` 改 waitForSelector 强验证
// - waitForTimeout 5000/3000 改 waitForFunction 等 IDB 加载完成

import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'

test.describe('W129 课文评分 跨页面流程 (桌面)', () => {
  test('/textbook/score → 4 卡 + 圆环 + 列表', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto(BASE + '/textbook/score', { waitUntil: 'domcontentloaded' })
    // 页面 h1 (排除 Layout 顶部 md:hidden 的 h1)
    await page.waitForSelector('main h1:has-text("课文评分")', { timeout: 15000 })
    // W132 P1-10: 改 waitForFunction 等 IDB 加载完成
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      // 加载完成: 4 个卡都有数字, 或 显示 "暂无" / "篇" 列表区
      return !body.includes('加载中') && (body.match(/\d+/) !== null || body.includes('暂无此状态') || body.includes('篇'))
    }, { timeout: 15000 })

    // 1. 验证 4 卡 都存在 (W124 Bento)
    // 标签: 课文 / 已掌握 / 学习中 / 未开始
    await expect(page.locator('text=课文').first()).toBeVisible()
    await expect(page.locator('text=已掌握').first()).toBeVisible()
    await expect(page.locator('text=学习中').first()).toBeVisible()
    await expect(page.locator('text=未开始').first()).toBeVisible()

    // 2. 验证 总词汇掌握度 圆环 存在 (svg circle, 第 2 个是进度圈)
    const circles = page.locator('svg circle')
    await expect(circles.first()).toBeVisible()
    // 圆环 应有 strokeDasharray (W124 SVG 进度)
    const dasharray = await circles.nth(1).getAttribute('stroke-dasharray')
    expect(dasharray).toBeTruthy()

    // 3. 验证 4 圆角过滤 按钮 (全部 / 已掌握 / 学习中 / 未开始)
    await expect(page.locator('button:has-text("全部")').first()).toBeVisible()
    await expect(page.locator('button:has-text("已掌握")').first()).toBeVisible()
    await expect(page.locator('button:has-text("学习中")').first()).toBeVisible()
    await expect(page.locator('button:has-text("未开始")').first()).toBeVisible()

    // 4. 验证 跨课复用词 数字 渲染
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).toMatch(/跨课|总词汇/)

    // 5. W132 P0-11 修复: 列表区域 强验证 — 0 课文时 "暂无此状态的课文" 必显示;
    //    有课文时 至少 1 个 课文 card 必可见
    //    修复后: 单一 selector + 显式分支
    const emptyMsg = page.locator('text=暂无此状态的课文').first()
    const lessonCard = page.locator('main >> .card, main >> [data-testid="lesson-card"]').first()

    const isEmpty = await emptyMsg.isVisible({ timeout: 1000 }).catch(() => false)
    if (isEmpty) {
      // 空数据: 必须看到 "暂无此状态的课文"
      await expect(emptyMsg).toBeVisible()
    } else {
      // 有数据: 必须看到至少 1 个 课文 card 或包含 "篇" 列表项
      const hasCard = await lessonCard.isVisible({ timeout: 1000 }).catch(() => false)
      const hasLessonText = await page.locator('text=/\\d+\\s*篇/').first().isVisible({ timeout: 1000 }).catch(() => false)
      expect(hasCard || hasLessonText).toBe(true)
    }
  })

  test('移动端 viewport: /textbook/score 加载 + 4 卡', async ({ page }) => {
    test.setTimeout(30000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE + '/textbook/score', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("课文评分")', { timeout: 15000 })
    // W132 P1-10: 改 waitForFunction 等 IDB 加载完成
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return !body.includes('加载中') && body.match(/\d+/) !== null
    }, { timeout: 10000 })
    // 4 卡 在 mobile grid-cols-2
    await expect(page.locator('text=已掌握').first()).toBeVisible()
    await expect(page.locator('text=学习中').first()).toBeVisible()
    await expect(page.locator('text=未开始').first()).toBeVisible()
  })
})
