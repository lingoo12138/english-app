// tests/difficultyAdapter.test.ts - v1.43.0 W43-A 单词难度自适应
// 8 单元测试覆盖 analyzeUserPerformance / getAdaptiveLevel / getRecommendedWords
// + difficultyToCEFR / levelToIndex / indexToLevel / DIFFICULTY_LADDER
import { describe, it, expect, beforeEach, vi } from 'vitest'

// v1.43.0: mock loadWords 给 difficulty 1-5 多档 (setup.ts 默认全 difficulty=1, 测不出阶梯)
vi.mock('../src/lib/words', () => ({
  loadWords: async () => [
    { id: 'w-a1-1', word: 'a1-1', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-2', word: 'a1-2', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-3', word: 'a1-3', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-4', word: 'a1-4', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-5', word: 'a1-5', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-6', word: 'a1-6', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a1-7', word: 'a1-7', difficulty: 1, level: 'cet4' } as any,
    { id: 'w-a2-1', word: 'a2-1', difficulty: 2, level: 'cet4' } as any,
    { id: 'w-a2-2', word: 'a2-2', difficulty: 2, level: 'cet4' } as any,
    { id: 'w-b1-1', word: 'b1-1', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-2', word: 'b1-2', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-3', word: 'b1-3', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-4', word: 'b1-4', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-5', word: 'b1-5', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-6', word: 'b1-6', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b1-7', word: 'b1-7', difficulty: 3, level: 'cet4' } as any,
    { id: 'w-b2-1', word: 'b2-1', difficulty: 4, level: 'cet6' } as any,
    { id: 'w-c1-1', word: 'c1-1', difficulty: 5, level: 'kaoyan' } as any,
  ],
}))

import { db } from '../src/lib/db'
import {
  DIFFICULTY_LADDER,
  difficultyToCEFR,
  levelToIndex,
  indexToLevel,
  analyzeUserPerformance,
  getAdaptiveLevel,
  getRecommendedWords,
  ERROR_RATE_DOWNGRADE,
  MASTERY_RATE_UPGRADE,
  type CEFRLevel,
} from '../src/lib/difficultyAdapter'

describe('difficultyAdapter (v1.43.0-W43-A)', () => {
  beforeEach(async () => {
    await db.favorites.clear()
    await db.records.clear()
    await db.writingErrors.clear()
    await db.reviews.clear()
  })

  describe('constants & helpers', () => {
    it('DIFFICULTY_LADDER 6 档有序', () => {
      expect(DIFFICULTY_LADDER).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    })

    it('difficultyToCEFR: 1-5 → A1-C1', () => {
      expect(difficultyToCEFR(1)).toBe('A1')
      expect(difficultyToCEFR(2)).toBe('A2')
      expect(difficultyToCEFR(3)).toBe('B1')
      expect(difficultyToCEFR(4)).toBe('B2')
      expect(difficultyToCEFR(5)).toBe('C1')
    })

    it('difficultyToCEFR: undefined / 越界 → null', () => {
      expect(difficultyToCEFR(undefined)).toBeNull()
      expect(difficultyToCEFR(0)).toBeNull()
      expect(difficultyToCEFR(6)).toBeNull()
    })

    it('levelToIndex / indexToLevel 双向且越界 clamp', () => {
      expect(levelToIndex('A1')).toBe(0)
      expect(levelToIndex('C2')).toBe(5)
      expect(indexToLevel(0)).toBe('A1')
      expect(indexToLevel(5)).toBe('C2')
      // clamp
      expect(indexToLevel(-1)).toBe('A1')
      expect(indexToLevel(99)).toBe('C2')
    })
  })

  describe('analyzeUserPerformance', () => {
    it('空数据 → 0 rates + currentLevel=A2 默认', async () => {
      const perf = await analyzeUserPerformance()
      expect(perf.errorRate).toBe(0)
      expect(perf.favoriteRate).toBe(0)
      expect(perf.masteryRate).toBe(0)
      expect(perf.totalLearned).toBe(0)
      expect(perf.totalFavorites).toBe(0)
      expect(perf.currentLevel).toBe('A2')
    })

    it('错词率 = errors / favorites', async () => {
      await db.favorites.bulkPut([{ wordId: 'w-a1-1', addedAt: Date.now() }, { wordId: 'w-a1-2', addedAt: Date.now() }])
      await db.writingErrors.add({
        source: 'write', original: 'test', corrected: 'test', errors: [], ts: Date.now(),
      })
      const perf = await analyzeUserPerformance()
      expect(perf.totalFavorites).toBe(2)
      expect(perf.totalErrors).toBe(1)
      expect(perf.errorRate).toBeCloseTo(0.5, 2)
    })

    it('掌握率 = repetitions >= 3 / favorites', async () => {
      await db.favorites.bulkPut([{ wordId: 'w-a1-1', addedAt: Date.now() }, { wordId: 'w-a1-2', addedAt: Date.now() }])
      await db.reviews.bulkPut([
        { wordId: 'w-a1-1', nextReview: 0, interval: 1, easeFactor: 2.5, repetitions: 3 },
        { wordId: 'w-a1-2', nextReview: 0, interval: 1, easeFactor: 2.5, repetitions: 1 },
      ])
      const perf = await analyzeUserPerformance()
      expect(perf.totalMastered).toBe(1)
      expect(perf.masteryRate).toBeCloseTo(0.5, 2)
    })

    it('当前学段: 平均 difficulty → CEFR', async () => {
      // view 5 个 B1 词 (difficulty=3) - 用不同 wordId 才能让 totalLearned=5
      const now = Date.now()
      for (let i = 1; i <= 5; i++) {
        await db.records.add({ wordId: `w-b1-${i}`, action: 'view', timestamp: now })
      }
      const perf = await analyzeUserPerformance()
      expect(perf.currentLevel).toBe('B1')
    })
  })

  describe('getAdaptiveLevel', () => {
    it('数据不足 (<5) → 维持 currentLevel', async () => {
      await db.records.add({ wordId: 'w-b1-1', action: 'view', timestamp: Date.now() })
      const lvl = await getAdaptiveLevel()
      expect(['A1', 'A2', 'B1']).toContain(lvl)
    })

    it('错词率 >30% → 降 1 步', async () => {
      const now = Date.now()
      for (let i = 1; i <= 6; i++) {
        await db.records.add({ wordId: `w-b1-${i}`, action: 'view', timestamp: now })
      }
      await db.favorites.bulkPut([
        { wordId: 'w-a1-1', addedAt: now },
        { wordId: 'w-a1-2', addedAt: now },
        { wordId: 'w-a2-1', addedAt: now },
      ])
      await db.writingErrors.bulkAdd([
        { source: 'write', original: 'a', corrected: 'a', errors: [], ts: now },
        { source: 'write', original: 'b', corrected: 'b', errors: [], ts: now },
      ])
      const lvl = await getAdaptiveLevel()
      // currentLevel=B1, 错词率高 → A2 (降 1 步)
      expect(lvl).toBe('A2')
      expect(ERROR_RATE_DOWNGRADE).toBe(0.3)
    })

    it('掌握率 >80% → 升 1 步', async () => {
      const now = Date.now()
      for (let i = 1; i <= 6; i++) {
        await db.records.add({ wordId: `w-a1-${i}`, action: 'view', timestamp: now })
      }
      await db.favorites.bulkPut([
        { wordId: 'w-a1-1', addedAt: now },
        { wordId: 'w-a1-2', addedAt: now },
      ])
      await db.reviews.bulkPut([
        { wordId: 'w-a1-1', nextReview: 0, interval: 1, easeFactor: 2.5, repetitions: 3 },
        { wordId: 'w-a1-2', nextReview: 0, interval: 1, easeFactor: 2.5, repetitions: 4 },
      ])
      const lvl = await getAdaptiveLevel()
      // currentLevel=A1, 掌握率高 → A2 (升 1 步)
      expect(lvl).toBe('A2')
      expect(MASTERY_RATE_UPGRADE).toBe(0.8)
    })
  })

  describe('getRecommendedWords', () => {
    it('同 level 优先 + 字母序', async () => {
      const words = await getRecommendedWords('A1', 3)
      // A1 有 w-a1-1 ~ w-a1-7 (7 个), 取前 3
      expect(words.length).toBe(3)
      expect(words[0].id).toBe('w-a1-1')
      expect(words[1].id).toBe('w-a1-2')
      expect(words[2].id).toBe('w-a1-3')
    })

    it('exclude 已选词', async () => {
      const exclude = new Set(['w-a1-1', 'w-a1-2', 'w-a1-3', 'w-a1-4', 'w-a1-5', 'w-a1-6', 'w-a1-7'])
      const words = await getRecommendedWords('A1', 1, exclude)
      expect(words[0].id).toBe('w-a2-1')
    })

    it('count=0 → 空数组', async () => {
      const words = await getRecommendedWords('A1', 0)
      expect(words).toEqual([])
    })

    it('中间档取够数 → 全是同 level', async () => {
      const words = await getRecommendedWords('B1', 3)
      expect(words.length).toBe(3)
      expect(words.every(w => w.difficulty === 3)).toBe(true)
    })

    it('B1 取大量时, 兜底到 A2 和 B2', async () => {
      const words = await getRecommendedWords('B1', 10)
      expect(words.length).toBe(10)
      // 同 B1 7 个 + A2 2 个 + B2 1 个 = 10
      const b1Words = words.filter(w => w.difficulty === 3)
      const a2Words = words.filter(w => w.difficulty === 2)
      const b2Words = words.filter(w => w.difficulty === 4)
      expect(b1Words.length).toBe(7)
      expect(a2Words.length).toBe(2)
      expect(b2Words.length).toBe(1)
    })

    it('A1 取足够多时, 不超过 +1 步 (即不出 B1)', async () => {
      // A1 有 7 个, 取 10 个: A1 7 + A2 2 (B2 不会进, B2 是 +2 步)
      const words = await getRecommendedWords('A1', 10)
      expect(words.length).toBe(9)  // 只有 A1 (7) + A2 (2) = 9
      expect(words.every(w => w.difficulty <= 2)).toBe(true)
    })
  })
})
