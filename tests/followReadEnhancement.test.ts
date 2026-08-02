// followReadEnhancement.test.ts - v1.95 W89-A 跟读评分增强测试
import { describe, it, expect } from 'vitest'

/** 计算每句最好分 (按句 idx 取 max) */
function computeBestScores(attempts: { sentenceIndex: number; score: number }[]): Record<number, number> {
  const best: Record<number, number> = {}
  for (const a of attempts) {
    if (best[a.sentenceIndex] === undefined || a.score > best[a.sentenceIndex]) {
      best[a.sentenceIndex] = a.score
    }
  }
  return best
}

/** 颜色档 (跟 UI 一致) */
function colorForScore(s: number): 'green' | 'amber' | 'rose' {
  if (s >= 70) return 'green'
  if (s >= 40) return 'amber'
  return 'rose'
}

describe('W89-A 跟读评分增强', () => {
  describe('computeBestScores', () => {
    it('空数组返空', () => {
      expect(computeBestScores([])).toEqual({})
    })
    it('单条', () => {
      expect(computeBestScores([{ sentenceIndex: 0, score: 80 }])).toEqual({ 0: 80 })
    })
    it('多句', () => {
      const best = computeBestScores([
        { sentenceIndex: 0, score: 50 },
        { sentenceIndex: 1, score: 80 },
        { sentenceIndex: 2, score: 100 },
      ])
      expect(best).toEqual({ 0: 50, 1: 80, 2: 100 })
    })
    it('同句多次取 max', () => {
      const best = computeBestScores([
        { sentenceIndex: 0, score: 50 },
        { sentenceIndex: 0, score: 90 },
        { sentenceIndex: 0, score: 70 },
      ])
      expect(best).toEqual({ 0: 90 })
    })
    it('混合', () => {
      const best = computeBestScores([
        { sentenceIndex: 0, score: 60 },
        { sentenceIndex: 1, score: 40 },
        { sentenceIndex: 0, score: 80 },
        { sentenceIndex: 2, score: 100 },
        { sentenceIndex: 1, score: 50 },
      ])
      expect(best).toEqual({ 0: 80, 1: 50, 2: 100 })
    })
  })

  describe('colorForScore', () => {
    it('70+ = green', () => {
      expect(colorForScore(70)).toBe('green')
      expect(colorForScore(100)).toBe('green')
    })
    it('40-69 = amber', () => {
      expect(colorForScore(40)).toBe('amber')
      expect(colorForScore(69)).toBe('amber')
    })
    it('<40 = rose', () => {
      expect(colorForScore(0)).toBe('rose')
      expect(colorForScore(39)).toBe('rose')
    })
  })
})
