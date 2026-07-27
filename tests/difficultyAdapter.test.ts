// tests/difficultyAdapter.test.ts - v1.43.0 W43-A 单词难度自适应
// v1.48.0 W45: 改用学段 8 档 (primary/junior/.../daily), 跟 word.level 一致
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/lib/words', () => ({
  loadWords: async () => [
    { id: 'p-1', word: 'apple', level: 'primary' } as any,
    { id: 'p-2', word: 'book', level: 'primary' } as any,
    { id: 'j-1', word: 'adventure', level: 'junior' } as any,
    { id: 'j-2', word: 'brave', level: 'junior' } as any,
    { id: 'j-3', word: 'clever', level: 'junior' } as any,
    { id: 's-1', word: 'phenomenon', level: 'senior' } as any,
    { id: 'g-1', word: 'paradigm', level: 'gaozhong' } as any,
    { id: 'c4-1', word: 'epistemology', level: 'cet4' } as any,
  ],
}))

import { db } from '../src/lib/db'
import {
  analyzeUserPerformance,
  getAdaptiveLevel,
  getRecommendedWords,
  DIFFICULTY_LADDER,
  LEVEL_NAMES_ZH,
} from '../src/lib/difficultyAdapter'

describe('difficultyAdapter (v1.48.0-W45 学段 8 档)', () => {
  beforeEach(async () => {
    await db.favorites.clear()
    await db.records.clear()
    await db.writingErrors.clear()
    await db.reviews.clear()
  })

  it('DIFFICULTY_LADDER 完整 8 阶', () => {
    expect(DIFFICULTY_LADDER).toEqual([
      'primary', 'junior', 'senior', 'gaozhong',
      'cet4', 'cet6', 'kaoyan', 'daily',
    ])
  })

  it('LEVEL_NAMES_ZH 全 8 级', () => {
    expect(Object.keys(LEVEL_NAMES_ZH)).toHaveLength(8)
    expect(LEVEL_NAMES_ZH.primary).toBe('小学')
  })

  it('冷启动: 0 数据 maintain', async () => {
    const rec = await getAdaptiveLevel()
    expect(rec.direction).toBe('maintain')
    expect(rec.reason).toContain('数据不足')
  })

  it('错词率高 (>30%): level-down', async () => {
    // 6 收藏全部 junior, 让 currentLevel=junior, 可降为 primary
    await db.favorites.add({ wordId: 'j-1', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'j-2', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'j-3', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'p-1', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'p-2', addedAt: Date.now() })
    await db.favorites.add({ wordId: 's-1', addedAt: Date.now() })
    // 3 errors / 6 favorites = 50% > 30% 降级
    await db.writingErrors.add({ source: 'write', original: 'x', corrected: 'y', errors: [{} as any], ts: Date.now() })
    await db.writingErrors.add({ source: 'write', original: 'x', corrected: 'y', errors: [{} as any], ts: Date.now() })
    await db.writingErrors.add({ source: 'write', original: 'x', corrected: 'y', errors: [{} as any], ts: Date.now() })
    for (let i = 0; i < 5; i++) {
      await db.records.add({ wordId: `w-${i}`, action: 'view', timestamp: Date.now() })
    }
    const rec = await getAdaptiveLevel()
    expect(rec.direction).toBe('level-down')
    expect(rec.reason).toContain('错词率')
  })

  it('错词率低 + 掌握率高: level-up', async () => {
    // 6 收藏全部 junior, 5 mastered (5/6=83% > 80% 升级)
    await db.favorites.add({ wordId: 'j-1', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'j-2', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'j-3', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'p-1', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'p-2', addedAt: Date.now() })
    await db.favorites.add({ wordId: 's-1', addedAt: Date.now() })
    for (const id of ['j-1', 'j-2', 'j-3', 'p-1', 'p-2']) {
      await db.reviews.add({ wordId: id, repetitions: 3, interval: 5, dueDate: 0, lastReviewed: 0 })
    }
    for (let i = 0; i < 10; i++) {
      await db.records.add({ wordId: `w-${i}`, action: 'view', timestamp: Date.now() })
    }
    const rec = await getAdaptiveLevel()
    expect(rec.direction).toBe('level-up')
    expect(rec.reason).toContain('掌握率')
  })

  it('analyzeUserPerformance currentLevel 选频次最高', async () => {
    await db.favorites.add({ wordId: 'p-1', addedAt: Date.now() })
    await db.favorites.add({ wordId: 'p-2', addedAt: Date.now() })
    await db.writingErrors.add({ source: 'write', original: 'x', corrected: 'y', errors: [{} as any], ts: Date.now() })
    for (let i = 0; i < 5; i++) {
      await db.records.add({ wordId: `w-${i}`, action: 'view', timestamp: Date.now() })
    }
    const perf = await analyzeUserPerformance()
    expect(perf.currentLevel).toBe('primary')
    expect(perf.totalFavorites).toBe(2)
  })

  it('getRecommendedWords 70% 目标 + 30% 兜底', async () => {
    // mock 中 junior 只 1 词, 用 6 词 fallback 验证兜底路径
    const recs = await getRecommendedWords('junior', 2)
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs.some(w => w.level === 'junior')).toBe(true)
  })

  it('getRecommendedWords 排除 seenIds', async () => {
    const recs = await getRecommendedWords('junior', 5, new Set(['j-1']))
    expect(recs.find(w => w.id === 'j-1')).toBeUndefined()
  })

  it('getRecommendedWords 兜底到 ±1 步', async () => {
    const recs = await getRecommendedWords('cet4', 5)
    expect(recs.length).toBeGreaterThan(0)
  })

  it('getRecommendedWords fallback: 0 词时扩到全部 (verifier2 P1-B 修)', async () => {
    // daily level 没词, 应 fallback 到全部
    const recs = await getRecommendedWords('daily', 3)
    expect(recs.length).toBeGreaterThan(0)
  })

  it('getRecommendedWords count=0 返回空', async () => {
    const recs = await getRecommendedWords('junior', 0)
    expect(recs).toEqual([])
  })
})
