// errorReviewReport.test.ts - 错题复习 学习报告
import { describe, it, expect } from 'vitest'
import { buildReviewReport, formatReport } from '../src/lib/errorReviewReport'
import type { ReviewSession } from '../src/lib/errorReview'

function makeSession(overrides: Partial<ReviewSession> = {}): ReviewSession {
  return {
    total: 5,
    correct: 3,
    wrong: 2,
    remaining: [],
    history: [
      { cardId: 'w-1', score: 90, grade: 'good', peeked: false },
      { cardId: 'w-2', score: 100, grade: 'perfect', peeked: false },
      { cardId: 'd-1', score: 30, grade: 'bad', peeked: true },
      { cardId: 'd-2', score: 70, grade: 'good', peeked: false },
      { cardId: 's-1', score: 50, grade: 'ok', peeked: false },
    ],
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    ...overrides,
  }
}

describe('W96 错题复习学习报告', () => {
  it('buildReviewReport: 基础统计', () => {
    const r = buildReviewReport(makeSession())
    expect(r.total).toBe(5)
    expect(r.correct).toBe(3)
    expect(r.wrong).toBe(2)
    expect(r.accuracy).toBe(60)
  })

  it('分数统计: 平均/最高/最低', () => {
    const r = buildReviewReport(makeSession())
    expect(r.avgScore).toBe(68)
    expect(r.bestScore).toBe(100)
    expect(r.worstScore).toBe(30)
  })

  it('偷看统计: 1 次 (20%)', () => {
    const r = buildReviewReport(makeSession())
    expect(r.peekedCount).toBe(1)
    expect(r.peekRate).toBe(20)
  })

  it('难度分布: 1 mastered, 1 easy, 2 medium, 1 hard', () => {
    // w-1=90 (easy 80-94), w-2=100 (mastered 95+), d-1=30 (hard <40), d-2=70 (medium 40-79), s-1=50 (medium)
    const r = buildReviewReport(makeSession())
    expect(r.difficulty.mastered).toBe(1)
    expect(r.difficulty.easy).toBe(1)
    expect(r.difficulty.medium).toBe(2)
    expect(r.difficulty.hard).toBe(1)
  })

  it('成绩分布: perfect 1, good 2, ok 1, bad 1', () => {
    const r = buildReviewReport(makeSession())
    expect(r.gradeBreakdown.perfect).toBe(1)
    expect(r.gradeBreakdown.good).toBe(2)
    expect(r.gradeBreakdown.ok).toBe(1)
    expect(r.gradeBreakdown.bad).toBe(1)
  })

  it('来源分布: 推断 cardId 前缀', () => {
    const r = buildReviewReport(makeSession())
    expect(r.sourceBreakdown.write).toBe(2)
    expect(r.sourceBreakdown.dictation).toBe(2)
    expect(r.sourceBreakdown.spelling).toBe(1)
  })

  it('空 session 不崩 (业务边界)', () => {
    const r = buildReviewReport({
      total: 0, correct: 0, wrong: 0, remaining: [],
      history: [], startedAt: 0, lastUpdatedAt: 0,
    })
    expect(r.total).toBe(0)
    expect(r.accuracy).toBe(0)
    expect(r.avgScore).toBe(0)
    expect(r.bestScore).toBe(0)
    expect(r.worstScore).toBe(0)
    expect(r.peekedCount).toBe(0)
  })

  it('formatReport: 优秀标签 (90%+)', () => {
    const r = buildReviewReport({
      total: 10, correct: 9, wrong: 1, remaining: [],
      history: Array(10).fill({ cardId: 'w-1', score: 100, grade: 'perfect', peeked: false }),
      startedAt: 0, lastUpdatedAt: 0,
    })
    const f = formatReport(r)
    expect(f.accuracyLabel).toContain('优秀')
  })

  it('formatReport: 多练标签 (<50%)', () => {
    const r = buildReviewReport({
      total: 10, correct: 3, wrong: 7, remaining: [],
      history: Array(10).fill({ cardId: 'w-1', score: 20, grade: 'bad', peeked: false }),
      startedAt: 0, lastUpdatedAt: 0,
    })
    const f = formatReport(r)
    expect(f.accuracyLabel).toContain('多练')
  })

  it('formatReport: 偷看率 0 鼓励', () => {
    const r = buildReviewReport({
      total: 5, correct: 3, wrong: 2, remaining: [],
      history: Array(5).fill({ cardId: 'w-1', score: 80, grade: 'good', peeked: false }),
      startedAt: 0, lastUpdatedAt: 0,
    })
    const f = formatReport(r)
    expect(f.peekLabel).toContain('真实力')
  })
})
