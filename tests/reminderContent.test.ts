// tests/reminderContent.test.ts - v1.24.0 W25 学习提醒动态内容
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  getReminderStats,
  getLastStudyTimestamp,
  buildReminderBody,
  estimateMinutes,
  type ReminderStats,
} from '../src/lib/reminderContent'

/** 测试辅助: 清空 records + reviews + favorites */
async function clearTestData() {
  await db.records.clear()
  await db.reviews.clear()
  await db.favorites.clear()
}

describe('reminderContent (v1.24.0-W25)', () => {
  beforeEach(async () => {
    await clearTestData()
  })

  describe('estimateMinutes', () => {
    it('0/0 → 1 (最低)', () => {
      expect(estimateMinutes(0, 0)).toBe(1)
    })
    it('5/0 → 3 (5*0.5)', () => {
      expect(estimateMinutes(5, 0)).toBe(3)
    })
    it('0/3 → 1 (3*0.3=0.9→1)', () => {
      expect(estimateMinutes(0, 3)).toBe(1)
    })
    it('2/5 → 2 (2*0.5+5*0.3=2.5→3)', () => {
      // 实际: 1+1.5 = 2.5 → round = 3
      expect(estimateMinutes(2, 5)).toBe(3)
    })
  })

  describe('getReminderStats 集成', () => {
    it('空库返 0/0/0/1/0', async () => {
      const stats = await getReminderStats()
      expect(stats.dueCount).toBe(0)
      expect(stats.newCount).toBe(0)
      expect(stats.learnedToday).toBe(0)
      expect(stats.minutes).toBe(1)  // 最低 1
      expect(stats.daysInactive).toBe(0)  // 没记录
    })
  })

  describe('getLastStudyTimestamp', () => {
    it('空库返 null', async () => {
      expect(await getLastStudyTimestamp()).toBeNull()
    })

    it('有记录返最近时间戳', async () => {
      const now = Date.now()
      await db.records.add({
        wordId: 'hello',
        action: 'view',
        timestamp: now - 86_400_000,  // 1 天前
      })
      const last = await getLastStudyTimestamp()
      expect(last).toBe(now - 86_400_000)
    })
  })

  describe('buildReminderBody', () => {
    it('0/0/活跃 → 引导文案', async () => {
      const body = await buildReminderBody()
      expect(body).toContain('0 个复习')
      expect(body).toContain('3 个新词')
    })

    it('3 天未学 → 召回文案 (daysInactive >= 3)', async () => {
      await db.records.add({
        wordId: 'hello',
        action: 'view',
        timestamp: Date.now() - 3 * 86_400_000,
      })
      const body = await buildReminderBody()
      expect(body).toContain('别断')
      expect(body).toContain('3 天前')
    })

    it('7 天未学 → 召回文案', async () => {
      await db.records.add({
        wordId: 'hello',
        action: 'view',
        timestamp: Date.now() - 7 * 86_400_000,
      })
      const body = await buildReminderBody()
      expect(body).toContain('别断')
      expect(body).toContain('7 天前')
    })
  })
})
