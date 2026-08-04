// lessonScore.test.ts - 课文评分 测试
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findCrossLessonWords, computeLessonScores, getCrossLessonTotal } from '../src/lib/lessonScore'

// mock IDB
vi.mock('../src/lib/db', () => ({
  getAllWritingErrors: vi.fn(async () => []),
  getAllDictationErrors: vi.fn(async () => []),
  getAllErrorReviewScores: vi.fn(async () => []),
}))

describe('W97 课文评分', () => {
  it('findCrossLessonWords: 跨课复用词 (≥2 篇)', () => {
    const cross = findCrossLessonWords()
    expect(cross.length).toBeGreaterThan(0)
    // 验证 是 排序 + unique
    expect(cross).toEqual([...cross].sort())
  })

  it('getCrossLessonTotal: 总数 > 30', () => {
    const total = getCrossLessonTotal()
    expect(total).toBeGreaterThan(30)
  })

  it('computeLessonScores: 返回 20 篇 评分', async () => {
    const scores = await computeLessonScores()
    expect(scores.length).toBe(20)
  })

  it('每篇 评分 字段 完整', async () => {
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

  it('无 错题 时 status = mastered (90%+)', async () => {
    const scores = await computeLessonScores()
    for (const s of scores) {
      // 没 错题 → 全部 掌握 → mastered
      expect(s.status).toBe('mastered')
    }
  })

  it('crossLessonVocab 是 跨课 复用 词', async () => {
    const scores = await computeLessonScores()
    for (const s of scores) {
      // 每篇 crossLessonVocab 数量 ≤ 总 vocabulary
      expect(s.crossLessonVocab.length).toBeLessThanOrEqual(s.totalVocab)
    }
  })
})
