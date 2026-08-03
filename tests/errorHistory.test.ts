// errorHistory.test.ts - v1.99 W90 错题复习统计测试
import { describe, it, expect } from 'vitest'
import {
  errorToCardId,
  dictationToCardId,
  toUnifiedErrors,
  extractHistoryMap,
  analyzeUnifiedError,
  groupBySource,
  computeErrorStats,
  sortByDifficulty,
  type UnifiedError,
} from '../src/lib/errorHistory'
import type { WritingError, DictationError } from '../src/lib/db'

describe('W90 错题复习统计', () => {
  describe('errorToCardId / dictationToCardId', () => {
    it('写错题 id 前缀 w-', () => {
      expect(errorToCardId({ id: 1 } as WritingError)).toBe('w-1')
    })
    it('听写错题 id 前缀 d-', () => {
      expect(dictationToCardId({ id: 2 } as DictationError)).toBe('d-2')
    })
  })

  describe('toUnifiedErrors', () => {
    it('合并 writing + dictation', () => {
      const w: WritingError = {
        id: 1, source: 'write', original: 'a', corrected: 'b',
        errors: [{ original: 'a', suggestion: 'b', type: 'g', explanation: '', severity: 0.5 }],
        ts: 100,
      }
      const d: DictationError = {
        id: 2, wordId: 'w', difficulty: 'easy', source: 'spelling',
        transcript: 'k', target: 'c', score: 50, ts: 200,
      }
      const result = toUnifiedErrors([w], [d], {
        'w-1': [80, 90, 100],
        'd-2': [40, 60],
      })
      expect(result.length).toBe(2)
      expect(result.find(r => r.cardId === 'w-1')!.scores).toEqual([80, 90, 100])
      expect(result.find(r => r.cardId === 'd-2')!.source).toBe('spelling')
    })
  })

  describe('extractHistoryMap', () => {
    it('从 history 提取 cardId -> scores[]', () => {
      const map = extractHistoryMap([
        { cardId: 'a', score: 80 },
        { cardId: 'a', score: 90 },
        { cardId: 'b', score: 50 },
      ])
      expect(map['a']).toEqual([80, 90])
      expect(map['b']).toEqual([50])
    })
  })

  describe('analyzeUnifiedError', () => {
    it('3 次 >= 80 = mastered', () => {
      const e: UnifiedError = {
        cardId: 'a', source: 'write', original: 'x', corrected: 'y',
        scores: [80, 90, 100], addedAt: 1, lastTs: 1,
      }
      const a = analyzeUnifiedError(e)
      expect(a.difficulty).toBe('mastered')
      expect(a.correctCount).toBe(3)
    })
    it('2 次 < 40 = hard', () => {
      const e: UnifiedError = {
        cardId: 'a', source: 'dictation', original: 'x', corrected: 'y',
        scores: [20, 30], addedAt: 1, lastTs: 1,
      }
      const a = analyzeUnifiedError(e)
      expect(a.difficulty).toBe('hard')
    })
    it('空 scores = medium', () => {
      const e: UnifiedError = {
        cardId: 'a', source: 'write', original: 'x', corrected: 'y',
        scores: [], addedAt: 1, lastTs: 1,
      }
      const a = analyzeUnifiedError(e)
      expect(a.difficulty).toBe('medium')
    })
  })

  describe('groupBySource', () => {
    it('按 source 分 6 组', () => {
      const errors: UnifiedError[] = [
        { cardId: 'a', source: 'write', original: '', corrected: '', scores: [], addedAt: 1, lastTs: 1 },
        { cardId: 'b', source: 'spelling', original: '', corrected: '', scores: [], addedAt: 1, lastTs: 1 },
        { cardId: 'c', source: 'follow-read', original: '', corrected: '', scores: [], addedAt: 1, lastTs: 1 },
      ]
      const g = groupBySource(errors)
      expect(g.write.length).toBe(1)
      expect(g.spelling.length).toBe(1)
      expect(g['follow-read'].length).toBe(1)
      expect(g.chat.length).toBe(0)
    })
  })

  describe('computeErrorStats', () => {
    it('统计 total/difficulty/source/withSomeCorrect', () => {
      const errors: UnifiedError[] = [
        { cardId: 'a', source: 'write', original: '', corrected: '', scores: [80, 90, 100], addedAt: 1, lastTs: 1 },  // mastered
        { cardId: 'b', source: 'dictation', original: '', corrected: '', scores: [20, 30], addedAt: 1, lastTs: 1 },  // hard
        { cardId: 'c', source: 'spelling', original: '', corrected: '', scores: [], addedAt: 1, lastTs: 1 },  // medium
      ]
      const s = computeErrorStats(errors)
      expect(s.total).toBe(3)
      expect(s.mastered).toBe(1)
      expect(s.hard).toBe(1)
      expect(s.withSomeCorrect).toBe(1)  // 只有 a
      expect(s.bySource.write).toBe(1)
    })

    it('空返 0', () => {
      const s = computeErrorStats([])
      expect(s.total).toBe(0)
      expect(s.mastered).toBe(0)
      expect(s.hard).toBe(0)
    })
  })

  describe('sortByDifficulty', () => {
    it('mastered 排前, hard 排后', () => {
      const errors: UnifiedError[] = [
        { cardId: 'a', source: 'write', original: '', corrected: '', scores: [20, 30], addedAt: 1, lastTs: 1 },  // hard
        { cardId: 'b', source: 'write', original: '', corrected: '', scores: [80, 90, 100], addedAt: 2, lastTs: 2 },  // mastered
        { cardId: 'c', source: 'write', original: '', corrected: '', scores: [60], addedAt: 3, lastTs: 3 },  // medium
      ]
      const sorted = sortByDifficulty(errors)
      expect(sorted[0].cardId).toBe('b')  // mastered
      expect(sorted[2].cardId).toBe('a')  // hard
    })
  })
})

  // W90 修 v1: extractHistoryMap 实际场景
  describe('extractHistoryMap (W90 修 v1 业务用例)', () => {
    it('同 cardId 多次 append (W90 修 v1 关键路径)', () => {
      const map = extractHistoryMap([
        { cardId: 'a', score: 80 },
        { cardId: 'a', score: 90 },
        { cardId: 'a', score: 100 },
        { cardId: 'b', score: 50 },
      ])
      expect(map['a']).toEqual([80, 90, 100])
      expect(map['b']).toEqual([50])
    })
    it('toUnifiedErrors 合并后分析 = mastered', () => {
      const w: WritingError = {
        id: 1, source: 'write', original: 'a', corrected: 'b',
        errors: [], ts: 100,
      }
      const historyMap = extractHistoryMap([
        { cardId: 'w-1', score: 80 },
        { cardId: 'w-1', score: 90 },
        { cardId: 'w-1', score: 100 },
      ])
      const result = toUnifiedErrors([w], [], historyMap)
      const analysis = analyzeUnifiedError(result[0])
      expect(analysis.difficulty).toBe('mastered')  // 真数据驱动
      expect(analysis.attempts).toBe(3)
    })
  })
