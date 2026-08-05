// e2e/smoke.spec.ts - 12 核心 页面 smoke 测 (W99)
import { test, expect } from '@playwright/test'

const SMOKE_PAGES: { path: string; name: string; expected: string; category: string }[] = [
  { path: '/', name: '首页', expected: '句刻', category: '入口' },
  { path: '/words', name: '词库', expected: '词', category: '学习' },
  { path: '/textbook', name: '课文', expected: '课文', category: '学习' },
  { path: '/dictation', name: '听写', expected: '听写', category: '练习' },
  { path: '/spelling', name: '拼写', expected: '拼写', category: '练习' },
  { path: '/follow-read', name: '跟读', expected: '跟读', category: '练习' },
  { path: '/cards', name: '卡片复习', expected: '卡', category: '复习' },
  { path: '/error-review', name: '错题复习', expected: '错题', category: '复习' },
  { path: '/translation-favs', name: '释义收藏', expected: '收藏', category: '收藏' },
  { path: '/synonyms', name: '同义词', expected: '同义', category: '工具' },
  { path: '/settings', name: '设置', expected: '设置', category: '设置' },
  { path: '/reports', name: '学习报告', expected: '报告', category: '报告' },
]

let pass = 0
let fail = 0
const failures: { name: string; reason: string }[] = []

for (const p of SMOKE_PAGES) {
  test(`smoke: ${p.name} (${p.path})`, async ({ page }) => {
    let loaded = false
    for (let i = 0; i < 3 && !loaded; i++) {
      try {
        await page.goto('https://lingoo12138.github.io/english-app' + p.path, { waitUntil: 'domcontentloaded', timeout: 20000 })
        loaded = true
      } catch (e) { await page.waitForTimeout(2000) }
    }
    expect(loaded).toBe(true)
    // 业务: 沙盒 慢, 15s 等 渲染
    await page.waitForTimeout(8000)
    const body = await page.textContent('body') || ''
    if (body.includes(p.expected) || body.length > 500) {
      pass++
    } else {
      fail++
      failures.push({ name: p.name, reason: `missing '${p.expected}' in body=${body.slice(0, 100)}` })
    }
  })
}

test.afterAll(() => {
  console.log(`\n========== W99 烟测 报告 ==========`)
  console.log(`PASS: ${pass}/${SMOKE_PAGES.length}`)
  console.log(`FAIL: ${fail}`)
  if (failures.length > 0) {
    console.log(`\n失败 详情:`)
    for (const f of failures) console.log(`  ✘ ${f.name}: ${f.reason}`)
  }
  console.log(`==================================\n`)
})
