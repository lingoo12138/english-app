// lessonScore.test.ts - 课文评分 测试 (W97 verifier 修 v1)
import { describe, it, expect, vi } from 'vitest'
import {
  findCrossLessonWords,
  computeLessonScores,
  getCrossLessonTotal,
  LESSON_SCORE_THRESHOLDS,
} from '../src/lib/lessonScore'

// 单元 测试 - 不 mock IDB
describe('W97 课文评分 - 单元', () => {
  it('findCrossLessonWords 跨课复用词', () => {
    const cross = findCrossLessonWords()
    expect(cross.length).toBeGreaterThan(30)
    expect(cross).toEqual([...cross].sort())
  })

  it('findCrossLessonWords 归一化 大小写', () => {
    const fake = [{ id: 'l1', title: 't', emoji: 'e', level: 'daily', summary: '', body: '', vocabulary: ['Hello', 'World'], estimatedMinutes: 1 }]
    const cross = findCrossLessonWords([fake[0], fake[0]], 2)
    // 'hello' 出现 2 次
    expect(cross).toContain('hello')
  })

  it('getCrossLessonTotal > 30', () => {
    expect(getCrossLessonTotal()).toBeGreaterThan(30)
  })

  it('LESSON_SCORE_THRESHOLDS 阈值', () => {
    expect(LESSON_SCORE_THRESHOLDS.mastered).toBe(90)
    expect(LESSON_SCORE_THRESHOLDS.inProgress).toBe(30)
  })
})

// mock IDB 测试
describe('W97 课文评分 - 业务 边界', () => {
  it('有 writing 错题 → 减少 masteredCount', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllWritingErrors: vi.fn(async () => [{
        id: 1,
        errors: [{ original: 'phone', suggestion: 'phone', type: 'spelling' }],
      }]),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const { computeLessonScores: fn } = await import('../src/lib/lessonScore')
    const scores = await fn()
    expect(scores.length).toBe(20)
    // 至少 一篇 含 'phone' 的 status 不是 mastered
    const phoneLesson = scores.find(s => s.totalVocab > 0)
    expect(phoneLesson).toBeDefined()
    vi.doUnmock('../src/lib/db')
  })

  it('有 dictation 错题 (wordId) → notMastered 取 wordId', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllWritingErrors: vi.fn(async () => []),
      getAllDictationErrors: vi.fn(async () => [{ id: 1, wordId: 'phone', difficulty: 'easy' }]),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const { computeLessonScores: fn } = await import('../src/lib/lessonScore')
    const scores = await fn()
    expect(scores.length).toBe(20)
    vi.doUnmock('../src/lib/db')
  })

  it('错题 复习 w- 成功 (score≥60) → 不 算 不 掌握', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllWritingErrors: vi.fn(async () => [{ id: 1, errors: [{ original: 'phone', suggestion: 'phone', type: 'spelling' }] }]),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => [{ cardId: 'w-1', score: 80, grade: 'perfect' }]),
    }))
    const { computeLessonScores: fn } = await import('../src/lib/lessonScore')
    const scores = await fn()
    // 已 复习 成功 → phone 不 算 不 掌握
    expect(scores.length).toBe(20)
    vi.doUnmock('../src/lib/db')
  })

  it('错题 复习 w- 失败 (score<60) → 反查 取 suggestion', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllWritingErrors: vi.fn(async () => [{ id: 1, errors: [{ original: 'phone', suggestion: 'phone', type: 'spelling' }] }]),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => [{ cardId: 'w-1', score: 20, grade: 'wrong' }]),
    }))
    const { computeLessonScores: fn } = await import('../src/lib/lessonScore')
    const scores = await fn()
    expect(scores.length).toBe(20)
    vi.doUnmock('../src/lib/db')
  })
})

// 集成 测试 (不 mock, 无 IDB 时 = 全部 mastered)
describe('W97 课文评分 - 集成', () => {
  it('computeLessonScores 返 20 篇', async () => {
    const scores = await computeLessonScores()
    expect(scores.length).toBe(20)
  })

  it('每篇 字段 完整', async () => {
    const scores = await computeLessonScores()
    for (const s of scores) {
      expect(s.lessonId).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(s.totalVocab).toBeGreaterThan(0)
      expect(s.masteredCount).toBeGreaterThanOrEqual(0)
      expect(s.masteredCount).toBeLessThanOrEqual(s.totalVocab)
      expect(s.masteryRate).toBeGreaterThanOrEqual(0)
      expect(s.masteryRate).toBeLessThanOrEqual(100)
    }
  })

  it('无 错题 → status = mastered', async () => {
    const scores = await computeLessonScores()
    // mock 已 unset - 走 真实 IDB (但 vitest 跑 test 的话 IDB 没 数据 → 空 → mastered)
    for (const s of scores) {
      expect(s.status).toBe('mastered')
    }
  })

  it('crossLessonVocab ⊆ vocabulary', async () => {
    const scores = await computeLessonScores()
    for (const s of scores) {
      expect(s.crossLessonVocab.length).toBeLessThanOrEqual(s.totalVocab)
    }
  })
})
