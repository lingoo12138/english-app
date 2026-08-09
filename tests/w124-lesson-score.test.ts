// W124 LessonScorePage UI 改 良 — Bento + 圆 环 + Icon SVG
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string

describe('W124 LessonScorePage v2 — Bento + 圆 环 + Icon SVG', () => {
  it('顶 部 简 化 — 圆 形 返 回 + 标 题 居 中 + Icon', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toMatch(/W124 顶 部 简 化/)
    expect(c).toContain('w-9 h-9 rounded-full hover:bg-stone-100')
    expect(c).toContain('text-lg font-bold flex items-center gap-2')
  })

  it('Bento 4 卡 — md:grid-cols-4 + card-interactive', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toMatch(/grid grid-cols-2 md:grid-cols-4 gap-2/)
    expect(c).toContain('card card-interactive p-3 text-center')
  })

  it('总 词 汇 掌 握 度 大 圆 环 — SVG circle + strokeDasharray', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toMatch(/W124 总 词 汇 掌 握 度.*大 圆 环/)
    expect(c).toContain('viewBox="0 0 36 36"')
    expect(c).toContain('strokeDasharray=')
  })

  it('0 emoji (除 课 文 自 带 emoji)' , () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    // 顶 部 标 题 不 含 emoji
    expect(c).not.toContain('📊')
    expect(c).not.toContain('🌟')
    expect(c).not.toContain('💪')
    expect(c).not.toContain('📚')
  })

  it('filter 4 圆 角 按 钮 (圆 角 化 + 无 emoji)', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toMatch(/rounded-full text-xs font-medium/)
    // 不 应 有 emoji 字 符
    const filterBlock = c.match(/W124 filter([\s\S]{0,1200})/)
    expect(filterBlock).toBeTruthy()
    expect(filterBlock![1]).not.toMatch(/🌟|💪|📚/)
  })

  it('Icon SVG — BarChart/Trophy/Sparkles/BookOpen', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toContain('IconBarChart')
    expect(c).toContain('IconTrophy')
    expect(c).toContain('IconSparkles')
    expect(c).toContain('IconBookOpen')
    expect(c).toContain('IconArrow')
    expect(c).toContain('IconRefresh')
  })

  it('STATUS_CONFIG — 3 状态 (已 掌 握/学 习 中/未 开 始) 全 替 Icon', () => {
    const c = readFile('src/pages/LessonScorePage.tsx')
    expect(c).toMatch(/mastered: \{ color: 'text-amber-500'/)
    expect(c).toMatch(/in_progress: \{ color: 'text-brand-600'/)
    expect(c).toMatch(/not_started: \{ color: 'text-stone-500'/)
  })
})
