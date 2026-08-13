// tests/w123b-errorreview-ui.test.ts - W123b ErrorReviewPage UI 改 良
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W123b ErrorReviewPage UI 改 良', () => {
  const errReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  it('ErrorReviewPage 加 SkeletonPage 替 "加载错题中..."', () => {
    // 业 务: W120 一 致, 加 载 友 好
    expect(errReview).toContain("import { SkeletonPage } from '../components/Skeleton'")
    expect(errReview).toMatch(/if \(loading\) \{\s*return <SkeletonPage \/>/)
    expect(errReview).not.toMatch(/加载错题中\.\.\./)
  })

  it('ErrorReviewPage 加 Icon SVG 库 (5+ 个 图 标)', () => {
    // 业 务: W118 一 致
    // W148-B: 加 IconChart (错题统计按钮), 6 个 Icon 总
    expect(errReview).toMatch(/import \{[^}]*IconRefresh[^}]*\} from '\.\.\/components\/Icon'/)
    expect(errReview).toMatch(/import \{[^}]*IconSparkles[^}]*\} from '\.\.\/components\/Icon'/)
    expect(errReview).toMatch(/import \{[^}]*IconChart[^}]*\} from '\.\.\/components\/Icon'/)
  })

  it('错 题 标 题 🔁 替 IconRefresh (32 组 件 一 致)', () => {
    // 业 务: 标 题 emoji 替 Icon
    expect(errReview).toMatch(/<IconRefresh size=\{22\} className="text-brand-500" \/>错题复习/)
  })

  it('错 误 状 态 ⚠️ 替 IconSparkles', () => {
    // 业 务: 错 误 图 标 替 Icon
    expect(errReview).toMatch(/<IconSparkles size=\{48\}/)
  })

  it('空 状 态 🎉 替 IconTrophy', () => {
    // 业 务: 庆 祝 图 标 替 Icon
    expect(errReview).toMatch(/<IconTrophy size=\{48\}/)
  })

  it('4 空 状 态 跳 转 按 钮 emoji 替 Icon SVG', () => {
    // 业 务: 写 作/听 写/拼 写/跟 读 全 替
    expect(errReview).toMatch(/<IconEdit size=\{14\} \/>写作/)
    expect(errReview).toMatch(/<IconHeadphones size=\{14\} \/>听写/)
    expect(errReview).toMatch(/<IconEdit size=\{14\} \/>拼写/)
    expect(errReview).toMatch(/<IconHeadphones size=\{14\} \/>跟读/)
  })

  it('ErrorReviewPage emoji 总 数 减 少 (从 38 减 到 ≤ 32, 减 ≥ 6)', () => {
    // 业 务: 38 emoji → 顶 部 4 + 空 状 态 4 = 8 全 替, 剩 emoji 在 库 (SCENARIOS 等 业 务 数 据)
    const emojiMatches = errReview.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) || []
    // 减 少 显 著: 原 38, 减 至 ≤ 32 (-6)
    expect(emojiMatches.length).toBeLessThanOrEqual(32)
  })
})
