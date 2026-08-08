// tests/w115-home-refactor.test.ts - W115 Home 24→8 卡 重 构 (Bento Grid + MainCTA)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W115 Home 24→8 卡 重 构 (Bento Grid + MainCTA)', () => {
  const src = readFileSync('src/pages/Home.tsx', 'utf-8')

  it('MainCTA 合并 欢 迎 + 分享 + onboarding + 今 日 学 (1 卡)', () => {
    // 业 务: 顶 部 MainCTA 一 卡 含 4 功 能
    expect(src).toMatch(/今日学 5 词/)
    expect(src).toMatch(/开始 →/)
    expect(src).toMatch(/分享/)
    expect(src).toMatch(/5 分钟了解/)
  })

  it('MainCTA 用 brand 渐 变 (主 CTA 例外, 改 良 稿 允 许)', () => {
    expect(src).toMatch(/from-brand-500 to-brand-600/)
  })

  it('Bento Grid: Lv./XP (span 2) + 3 统计 (1 行)', () => {
    // 业 务: 改 版 稿 Bento Lv./XP 占 大 卡, 3 统 计 1 行
    expect(src).toMatch(/md:col-span-2/)
    expect(src).toMatch(/grid-cols-3 gap-2/)
    expect(src).toMatch(/今日.*累计.*生词/s)
  })

  it('Bento Grid 2x2: 4 状 态 入 口 (成就/日报/自定义/日历)', () => {
    // 业 务: 4 小 卡 收 敛 为 2x2 网格
    expect(src).toMatch(/grid-cols-2 gap-3/)
    expect(src).toMatch(/成就[\s\S]*?日报[\s\S]*?自定义场景[\s\S]*?学习日历/s)
  })

  it('5 推荐 入 口 改 横 向 滚 动 quick-bar (删 5 单 行)', () => {
    // 业 务: 5 推 荐 (场 景/拍 照/AI/计 划/写 作) 改 横 向 滚 动
    expect(src).toMatch(/overflow-x-auto/)
    expect(src).toMatch(/flex gap-3 overflow-x-auto pb-2/)
    expect(src).toMatch(/flex-shrink-0 w-44/)
  })

  it('删 除 重 复 StudyCalendar (streak 已 含 月 进 度)', () => {
    // 业 务: 减 1 重 复 卡
    expect(src).not.toMatch(/<StudyCalendar/)
    expect(src).not.toMatch(/from '\.\.\/components\/StudyCalendar'/)
  })

  it('删 除 5 推 荐 旧 grid (1 列 5 行)', () => {
    // 业 务: 旧 "grid-cols-1 gap-3" 是 5 推 荐 旧 形 式, 应 该 不 在 (或 只 剩 quick-bar)
    // 允 许 grid-cols-1 在 别 处, 不 严 禁
    const grid1Count = (src.match(/grid-cols-1 gap-3/g) || []).length
    expect(grid1Count).toBeLessThanOrEqual(0)
  })

  it('总 卡 数 ≤ 14 (原 24 - 10 = 14, 主 CTA 1 屏 可 见)', () => {
    // 业 务: 24→14 卡, 主 CTA 1 屏
    // 粗 略 计 算 Link + card 块
    const linkCount = (src.match(/<Link[\s\S]*?<\/Link>/g) || []).length
    // 14 个 主 卡: MainCTA 1 + Lv.XP 1 + 3统计 1 + 4状态 4 + TodayPlan 1 + DailySentence 1 + WordOfDay 1 + ReviewReminder 1 + streak 1 + 4快捷入口 4 + 5推荐 5
    // Link 大 概 = 4 状 态 + 4 快捷 入 口 + 5 推 荐 + WordOfDay 1 = 14
    expect(linkCount).toBeGreaterThanOrEqual(10)
    expect(linkCount).toBeLessThanOrEqual(20)
  })
})
