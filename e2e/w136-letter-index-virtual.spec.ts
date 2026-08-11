// e2e/w136-letter-index-virtual.spec.ts - W136 P0-1 验证
// 验证: 5,423 词主用例 virtual 模式下, 字母索引按钮点击有效
//
// 关键: W135 抗审查 找 到 W116 字母索引在 virtual 模式 (>200 词) 完全失效
//  - 修复前: data-letter-anchor 只在非 virtual 分支渲染 → querySelector null → 静默
//  - 修复后: VirtualList 内部 渲染 data-letter-anchor, onContainerRef 暴露 scroll container
//
// W137 修: 桌面端 viewport 移动端按钮被 md:hidden 隐藏, .first() 选到 hidden 元素
//  - 解决: 用 :visible 过滤拿当前 viewport 真正可见的按钮
//
// 测试:
//  1. 加载 /words 等待列表渲染
//  2. 验证字母按钮存在 (移动端横排 + 桌面端竖排)
//  3. 验证存在至少 1 个 data-letter-anchor 元素
//  4. 点击字母 'L' 按钮 → 等待 scrollTop 变化 → 验证滚动到 L 字母位置
//  5. 验证 activeLetter 状态正确 (字母按钮变 active)

import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'
const VIEWPORT_DESKTOP = { width: 1280, height: 800 }
const VIEWPORT_MOBILE = { width: 375, height: 800 }

async function go(page: any, path: string, isMobile = false) {
  await page.setViewportSize(isMobile ? VIEWPORT_MOBILE : VIEWPORT_DESKTOP)
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { timeout: 15000 })
  // 等 virtual list 渲染 (data-virtual-list 或 .card 之一)
  await page.waitForSelector('[data-virtual-list], .card', { timeout: 15000 })
  // 等字母索引 加载到 DOM (attached 即可, mobile+desktop 各 26 个)
  await page.waitForSelector('button[data-letter="A"]', { state: 'attached', timeout: 10000 })
}

/**
 * 当前 viewport 真正可见的字母按钮 (排除被 md:hidden / hidden md:flex 隐藏的副本)
 *  - 桌面端: 右侧固定竖排, .md\\:flex 容器内的
 *  - 移动端: 横排 sticky, .md\\:hidden 容器内的
 *  - 用 :visible Playwright 伪选择器自动过滤 hidden 元素
 */
function visibleLetterButton(page: any, letter: string) {
  return page.locator(`button[data-letter="${letter}"]:visible`).first()
}

test.describe('W136 P0-1: 字母索引 virtual 模式', () => {
  test('桌面端 /words: 字母 L 按钮 + data-letter-anchor 存在', async ({ page }) => {
    test.setTimeout(60000)
    await go(page, '/words')

    // 1. 桌面端 字母按钮 L 真正可见
    const lButton = visibleLetterButton(page, 'L')
    await expect(lButton).toBeVisible()

    // 2. 至少 1 个 data-letter-anchor (virtual 模式 修复前为 0)
    const anchorCount = await page.locator('[data-letter-anchor]').count()
    expect(anchorCount, 'virtual 模式应渲染字母锚点').toBeGreaterThan(0)

    // 3. 'L' 字母 锚点 ID 存在
    const lAnchor = page.locator('#letter-anchor-L')
    await expect(lAnchor).toHaveCount(1)
  })

  test('桌面端 /words: 点击字母 L → scrollTop 跳到 L 字母位置', async ({ page }) => {
    test.setTimeout(60000)
    await go(page, '/words')

    // 取初始 scrollTop
    const initialScrollTop = await page.evaluate(() => {
      const el = document.querySelector('[data-virtual-list]') as HTMLElement | null
      return el ? el.scrollTop : 0
    })
    expect(initialScrollTop).toBe(0)  // 初始 应在 顶部

    // 点 L 字母 按钮 (用 :visible 拿当前 viewport 真正可见的)
    const lButton = visibleLetterButton(page, 'L')
    await lButton.click()

    // 等待 滚动完成 (虚拟列表 触发 scrollTop > 100)
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-virtual-list]') as HTMLElement | null
      return el !== null && el.scrollTop > 100
    }, { timeout: 10000 })

    const afterScrollTop = await page.evaluate(() => {
      const el = document.querySelector('[data-virtual-list]') as HTMLElement | null
      return el ? el.scrollTop : 0
    })
    expect(afterScrollTop).toBeGreaterThan(100)

    // 验证 L 字母锚点 进入 视口 (在 视口顶部 50% 内)
    const lInViewport = await page.evaluate(() => {
      const anchor = document.querySelector('#letter-anchor-L') as HTMLElement | null
      if (!anchor) return false
      const rect = anchor.getBoundingClientRect()
      const viewportH = window.innerHeight
      return rect.top >= 0 && rect.top < viewportH * 0.5
    })
    expect(lInViewport, 'L 字母锚点应滚到视口上半部分').toBe(true)
  })

  test('桌面端 /words: 字母按钮 active 状态正确 (activeLetter)', async ({ page }) => {
    test.setTimeout(60000)
    await go(page, '/words')

    // 点 M 字母 (visible 过滤)
    const mButton = visibleLetterButton(page, 'M')
    await mButton.click()

    // 等待 IO 触发 activeLetter 更新 (M 按钮 出现 scale-110)
    await page.waitForFunction(() => {
      // 找所有 M 按钮, 找 visible 且含 scale-110 的
      const btns = document.querySelectorAll('button[data-letter="M"]')
      for (const btn of Array.from(btns)) {
        const b = btn as HTMLElement
        if (b.offsetParent !== null && b.className.includes('scale-110')) return true
      }
      return false
    }, { timeout: 10000 })

    // M 按钮 应为 active 状态 (scale-110)
    const mClass = await mButton.getAttribute('class')
    expect(mClass).toContain('scale-110')
    expect(mClass).toContain('bg-brand-600')  // 激活色
  })

  test('移动端 /words: 字母索引横排 sticky + 点击有效', async ({ page }) => {
    test.setTimeout(60000)
    await go(page, '/words', true)

    // 移动端 字母按钮 A 可见
    const aButton = visibleLetterButton(page, 'A')
    await expect(aButton).toBeVisible()

    // 点 S 字母
    const sButton = visibleLetterButton(page, 'S')
    await sButton.click()

    // 等待 scrollTop > 100
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-virtual-list]') as HTMLElement | null
      return el !== null && el.scrollTop > 100
    }, { timeout: 10000 })
  })
})
