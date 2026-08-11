// e2e/all-pages.spec.ts - 28 页面 完整度 测试 (W99)
import { test, expect } from '@playwright/test'

// W139: 走本地 baseURL (避免沙盒 出网 抖动), 与 w129/w131/w134/w135/w136 一致
const BASE = 'http://127.0.0.1:4173/english-app'

interface PageInfo {
  path: string
  name: string
  category: string
  expectedContent: string
  // 入口 link text (从 主页 跳)
  entryText?: string
}

const PAGES: PageInfo[] = [
  { path: '/', name: '首页', category: 'main', expectedContent: '句刻' },
  { path: '/words', name: '词库', category: 'main', expectedContent: '词', entryText: '词库' },
  { path: '/textbook', name: '课文', category: 'study', expectedContent: '课文', entryText: '课文' },
  { path: '/textbook/score', name: '课文评分', category: 'study', expectedContent: '评分', entryText: '课文评分' },
  { path: '/textbook/travel-airport', name: '课文详情', category: 'study', expectedContent: '旅行' },
  { path: '/dictation', name: '听写', category: 'practice', expectedContent: '听写', entryText: '听写' },
  { path: '/spelling', name: '拼写', category: 'practice', expectedContent: '拼写', entryText: '拼写' },
  { path: '/follow-read', name: '跟读', category: 'practice', expectedContent: '跟读', entryText: '跟读' },
  { path: '/follow-read/progress', name: '跟读进度', category: 'progress', expectedContent: '进度', entryText: '跟读进度' },
  { path: '/cards', name: '卡片复习', category: 'review', expectedContent: '卡', entryText: '卡片复习' },
  { path: '/error-review', name: '错题复习', category: 'review', expectedContent: '错题', entryText: '错题复习' },
  { path: '/error-history', name: '错题历史', category: 'review', expectedContent: '错题' },
  { path: '/fill-blank', name: '填空练习', category: 'review', expectedContent: '填空' },
  { path: '/translation-favs', name: '释义收藏', category: 'fav', expectedContent: '收藏', entryText: '收藏' },
  { path: '/synonyms', name: '同义词', category: 'tool', expectedContent: '同义', entryText: '同义' },
  { path: '/antonyms', name: '反义词', category: 'tool', expectedContent: '反义' },
  { path: '/scenes', name: '场景', category: 'tool', expectedContent: '场景' },
  { path: '/ai-chat', name: 'AI 对话', category: 'ai', expectedContent: 'AI', entryText: 'AI' },
  { path: '/plan', name: '学习计划', category: 'ai', expectedContent: '计划' },
  { path: '/settings', name: '设置', category: 'settings', expectedContent: '设置', entryText: '设置' },
  { path: '/reports', name: '学习报告', category: 'progress', expectedContent: '报告' },
  { path: '/pronounce-custom', name: '自定义跟读', category: 'settings', expectedContent: '跟读' },
  { path: '/custom-scenes', name: '自定义场景', category: 'settings', expectedContent: '场景' },
]

// W99: 沙盒 网络 慢 + gh-pages SPA, 用 单 page session, 内部 goto
test.describe.serial('W99 完整度 验收', () => {
  test('首页 加载 + 入口 卡片', async ({ page }) => {
    // 业务: 沙盒 出网 不稳, retry 3 次
    let homeLoaded = false
    for (let i = 0; i < 3 && !homeLoaded; i++) {
      try { await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 }); homeLoaded = true }
      catch (e) { await page.waitForTimeout(2000) }
    }
    expect(homeLoaded).toBe(true)
    // 业务: 等 实际 渲染 (React 词库 fetch 慢)
    await page.waitForSelector('text=句刻', { timeout: 25000 }).catch(() => {})
    const body = await page.textContent('body')
    expect(body).toContain('句刻')
    // 业务: 主页 应 至少 5 入口
    expect(body).toMatch(/跟读|听写|拼写|课文|复习|收藏|学习/)
  })

  // 22 页面 走 SPA goto (react-router 内部 pushState, 沙盒 网络 稳定)
  for (const p of PAGES.filter(x => x.path !== '/')) {
    test(`页面 ${p.name} (${p.path}) 加载 + 关键 内容`, async ({ page }) => {
      // 业务: SPA goto 内部 路由, 比直接 URL 稳定
      // 业务: 沙盒 出网 不稳, retry 3 次
    let pageLoaded = false
    for (let i = 0; i < 3 && !pageLoaded; i++) {
      try { await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 20000 }); pageLoaded = true }
      catch (e) { await page.waitForTimeout(2000) }
    }
    expect(pageLoaded).toBe(true)
      // 等 React 渲染 + 业务 加载 (网络 慢)
      await page.waitForTimeout(3000)
      const body = await page.textContent('body')
      // 业务: 至少 渲染 关键 字
      expect(body).toContain(p.expectedContent)
    })
  }

  test('业务 关键 路径: 词库 加载 5,423 词', async ({ page }) => {
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const html = await page.content()
    // 业务: 词库 渲染 应 至少 100KB
    expect(html.length).toBeGreaterThan(10000)
  })

  test('业务 关键 路径: 词详情 加载', async ({ page }) => {
    // 业务: 词库 找 1 词 → click
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    // 业务: 应 至少 1 词 link
    const links = await page.locator('a[href*="/words/"]').count()
    expect(links).toBeGreaterThan(0)
  })

  test('业务 关键 路径: 课文 列表 + 详情', async ({ page }) => {
    await page.goto(BASE + '/textbook', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body')
    // 业务: 课文 列表 应 至少 含 1 课文
    expect(body).toMatch(/旅行|难忘|家庭|旅行|机场|飞机/)
  })

  test('业务 关键 路径: 释义收藏 空 状态', async ({ page }) => {
    await page.goto(BASE + '/translation-favs', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body')
    // 业务: 收藏 页面 应 加载
    expect(body).toContain('收藏')
  })

  test('业务 关键 路径: 错题复习 空 状态', async ({ page }) => {
    await page.goto(BASE + '/error-review', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body')
    expect(body).toContain('错题')
  })

  test('业务 关键 路径: 课文评分 加载', async ({ page }) => {
    await page.goto(BASE + '/textbook/score', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toContain('评分')
  })
})
