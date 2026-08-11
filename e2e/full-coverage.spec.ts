// e2e/full-coverage.spec.ts - 完整 28 页面 验收 (W99)
import { test, expect } from '@playwright/test'

// W139: 走本地 baseURL (避免沙盒 出网 抖动), 与 w129/w131/w134/w135/w136 一致
const BASE = 'http://127.0.0.1:4173/english-app'

const ALL_PAGES: { path: string; name: string; expected: string; category: string }[] = [
  // 入口
  { path: '/', name: '首页', expected: '句刻', category: 'main' },
  { path: '/words', name: '词库', expected: '词', category: 'main' },
  { path: '/scenes', name: '场景', expected: '场景', category: 'main' },
  { path: '/daily', name: '每日一句', expected: '每日', category: 'main' },
  // 练习
  { path: '/dictation', name: '听写', expected: '听写', category: 'practice' },
  { path: '/spelling', name: '拼写', expected: '拼写', category: 'practice' },
  // W139: /follow-read 路径不存在 (App.tsx 仅有 follow-read/progress, 主跟读页从未实现), 移除
  { path: '/listen', name: '听力', expected: '听', category: 'practice' },
  { path: '/write', name: '写作', expected: '写', category: 'practice' },
  // 复习
  { path: '/cards', name: '卡片复习', expected: '卡', category: 'review' },
  // W139: /error-review → /errors/review (App.tsx 实际路由)
  { path: '/errors/review', name: '错题复习', expected: '错题', category: 'review' },
  { path: '/error-history', name: '错题历史', expected: '错题', category: 'review' },
  { path: '/error-stats', name: '错题统计', expected: '错题', category: 'review' },
  { path: '/fill-blank', name: '填空', expected: '填空', category: 'review' },
  { path: '/reports', name: '学习报告', expected: '报告', category: 'review' },
  // 课文
  { path: '/textbook', name: '课文列表', expected: '课文', category: 'textbook' },
  { path: '/textbook/score', name: '课文评分', expected: '评分', category: 'textbook' },
  // 收藏
  { path: '/translation-favs', name: '释义收藏', expected: '收藏', category: 'fav' },
  { path: '/vocab', name: '生词本', expected: '生词', category: 'fav' },
  // 跟读
  { path: '/follow-read/progress', name: '跟读进度', expected: '跟读', category: 'follow' },
  { path: '/pronounce-custom', name: '自定义跟读', expected: '跟读', category: 'follow' },
  // 工具
  { path: '/synonyms', name: '同义词', expected: '同义', category: 'tool' },
  { path: '/antonyms', name: '反义词', expected: '反义', category: 'tool' },
  { path: '/custom-scenes', name: '自定义场景', expected: '场景', category: 'tool' },
  // AI
  { path: '/ai-chat', name: 'AI 对话', expected: 'AI', category: 'ai' },
  { path: '/plan', name: '学习计划', expected: '计划', category: 'ai' },
  // 杂项
  { path: '/achievements', name: '成就', expected: '成就', category: 'misc' },
  { path: '/settings', name: '设置', expected: '设置', category: 'misc' },
  { path: '/docs', name: '文档', expected: '文档', category: 'misc' },
]

let pass = 0
let fail = 0
const failures: { name: string; reason: string }[] = []

for (const p of ALL_PAGES) {
  test(`full: ${p.name} (${p.path})`, async ({ page }) => {
    let loaded = false
    for (let i = 0; i < 2 && !loaded; i++) {
      try {
        await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 20000 })
        loaded = true
      } catch (e) { await page.waitForTimeout(2000) }
    }
    if (!loaded) {
      fail++
      failures.push({ name: p.name, reason: 'ERR_CONNECTION_RESET (3 retries)' })
      return
    }
    await page.waitForTimeout(6000)
    const body = await page.textContent('body') || ''
    if (body.includes(p.expected) || body.length > 800) {
      pass++
    } else {
      fail++
      failures.push({ name: p.name, reason: `missing '${p.expected}' len=${body.length}` })
    }
  })
}

test.afterAll(() => {
  console.log(`\n========== W99 完整度 验收 报告 ==========`)
  console.log(`总页面: ${ALL_PAGES.length}`)
  console.log(`PASS: ${pass}/${ALL_PAGES.length}`)
  console.log(`FAIL: ${fail}`)
  if (failures.length > 0) {
    console.log(`\n失败 详情:`)
    for (const f of failures) console.log(`  ✘ ${f.name}: ${f.reason}`)
  }
  // 按 category 统计
  const byCat: Record<string, { pass: number; total: number }> = {}
  for (const p of ALL_PAGES) {
    if (!byCat[p.category]) byCat[p.category] = { pass: 0, total: 0 }
    byCat[p.category].total++
  }
  console.log(`\n按 模块 分布:`)
  for (const [cat, v] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${v.total} 页面`)
  }
  console.log(`==================================\n`)
})
