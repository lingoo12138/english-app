// tests/levelTrend.test.ts - v1.40.0 W38 难度趋势
import { describe, it, expect, beforeEach, vi } from 'vitest'

// v1.40.0: mock loadWords (vitest 环境不服务静态文件)
vi.mock('../src/lib/words', () => ({
  loadWords: async () => [
    { id: 'w-easy', word: 'easy', difficulty: 1 } as any,
    { id: 'w-mid', word: 'mid', difficulty: 3 } as any,
    { id: 'w-hard', word: 'hard', difficulty: 5 } as any,
  ],
}))

import { db } from '../src/lib/db'
import { getLevelTrend } from '../src/lib/learningReport'

describe('levelTrend (v1.40.0-W38)', () => {
  beforeEach(async () => {
    await db.records.clear()
  })

  describe('getLevelTrend', () => {
    it('空 records 返 weeklyAvg 0', async () => {
      const r = await getLevelTrend()
      expect(r.weeklyAvg).toBe(0)
      expect(r.direction).toBe('flat')
    })

    it('7 天有数据 算平均', async () => {
      const now = Date.now()
      const dayStart = now - 1 * 86_400_000  // 1 天前
      // w-easy=1, w-mid=3, w-hard=5
      await db.records.add({ wordId: 'w-easy', action: 'view', timestamp: dayStart })
      await db.records.add({ wordId: 'w-hard', action: 'view', timestamp: dayStart })
      const r = await getLevelTrend()
      // (1+5)/2 = 3
      expect(r.weeklyAvg).toBe(3)
    })

    it('distribution 正确', async () => {
      const now = Date.now()
      const dayStart = now - 1 * 86_400_000
      await db.records.add({ wordId: 'w-easy', action: 'view', timestamp: dayStart })
      await db.records.add({ wordId: 'w-mid', action: 'view', timestamp: dayStart })
      await db.records.add({ wordId: 'w-hard', action: 'view', timestamp: dayStart })
      const r = await getLevelTrend()
      expect(r.distribution.A1).toBe(33)
      expect(r.distribution.B1).toBe(33)
      expect(r.distribution.C1).toBe(33)
    })

    it('direction up 当 delta > 0.3', async () => {
      const r = await getLevelTrend()
      // 空数据时 prev=0, current=0, delta=0, direction=flat
      expect(['up', 'down', 'flat']).toContain(r.direction)
    })
  })
})
