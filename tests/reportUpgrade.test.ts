// tests/reportUpgrade.test.ts - v1.28.0 W29 学习报告升级
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import { addWordTag } from '../src/lib/db'
import {
  getWeakRoots,
  getHourDistribution,
  getWeeklyRetention,
} from '../src/lib/learningReport'

describe('reportUpgrade (v1.28.0-W29)', () => {
  beforeEach(async () => {
    await db.writingErrors.clear()
    await db.records.clear()
    await db.reviews.clear()
  })

  describe('getWeakRoots', () => {
    it('空库返 []', async () => {
      expect(await getWeakRoots(0, Date.now())).toEqual([])
    })

    it('多 wordId 错误按数排 Top 5', async () => {
      const now = Date.now()
      // w1 3 错
      await db.writingErrors.add({ wordId: 'w1', ts: now, original: 'w1' } as any)
      await db.writingErrors.add({ wordId: 'w1', ts: now, original: 'w1' } as any)
      await db.writingErrors.add({ wordId: 'w1', ts: now, original: 'w1' } as any)
      // w2 1 错
      await db.writingErrors.add({ wordId: 'w2', ts: now, original: 'w2' } as any)
      const r = await getWeakRoots(0, now + 1)
      expect(r[0].root).toBe('w1')
      expect(r[0].errorCount).toBe(3)
      expect(r[1].root).toBe('w2')
    })

    it('时间范围过滤', async () => {
      const old = Date.now() - 30 * 86_400_000
      await db.writingErrors.add({ wordId: 'old', ts: old, original: 'old' } as any)
      const r = await getWeakRoots(Date.now() - 86_400_000, Date.now())
      expect(r).toEqual([])
    })
  })

  describe('getHourDistribution', () => {
    it('空库返 24 个 hour 0', async () => {
      const r = await getHourDistribution(0, Date.now())
      expect(r.length).toBe(24)
      expect(r.every(h => h.count === 0)).toBe(true)
    })

    it('按时段累计', async () => {
      const now = new Date()
      now.setHours(10, 0, 0, 0)
      const ts10 = now.getTime()
      now.setHours(14, 0, 0, 0)
      const ts14 = now.getTime()
      await db.records.add({ wordId: 'w1', action: 'view', timestamp: ts10 })
      await db.records.add({ wordId: 'w2', action: 'view', timestamp: ts14 })
      await db.records.add({ wordId: 'w3', action: 'view', timestamp: ts10 })
      const r = await getHourDistribution(0, Date.now() + 86_400_000)
      expect(r[10].count).toBe(2)
      expect(r[14].count).toBe(1)
      expect(r[0].count).toBe(0)
    })
  })

  describe('getWeeklyRetention', () => {
    it('空 reviews 返 0', async () => {
      expect(await getWeeklyRetention()).toBe(0)
    })

    it('有 reviews 返 0-1', async () => {
      await db.reviews.put({ wordId: 'w1', easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: 0 })
      const r = await getWeeklyRetention()
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(1)
    })

    it('easeFactor 越高 retention 越高', async () => {
      await db.reviews.put({ wordId: 'low', easeFactor: 1.5, interval: 0, repetitions: 0, nextReview: 0 })
      const low = await getWeeklyRetention()
      await db.reviews.clear()
      await db.reviews.put({ wordId: 'high', easeFactor: 4.0, interval: 0, repetitions: 0, nextReview: 0 })
      const high = await getWeeklyRetention()
      expect(high).toBeGreaterThan(low)
    })
  })
})
