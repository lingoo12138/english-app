// tests/achievements.test.ts - v1.3-F2 成就
import { describe, it, expect } from 'vitest'
import {
  ACHIEVEMENTS,
  getAchievementStatus,
  getAllAchievementStatus,
  getUnlockedCount,
  getNextAchievement,
  type AchievementStats,
} from '../src/lib/achievements'

const EMPTY_STATS: AchievementStats = {
  streak: 0,
  totalDays: 0,
  words: 0,
  errors: 0,
  favorites: 0,
}

describe('achievements', () => {
  describe('ACHIEVEMENTS', () => {
    it('应定义 19 个成就', () => {
      expect(ACHIEVEMENTS.length).toBe(20)
    })

    it('应包含 4 种类型', () => {
      const types = new Set(ACHIEVEMENTS.map(a => a.type))
      expect(types.has('streak')).toBe(true)
      expect(types.has('words')).toBe(true)
      expect(types.has('errors')).toBe(true)
      expect(types.has('favorites')).toBe(true)
    })

    it('每个成就有必填字段', () => {
      for (const a of ACHIEVEMENTS) {
        expect(a.id).toBeTruthy()
        expect(a.title).toBeTruthy()
        expect(a.desc).toBeTruthy()
        expect(a.emoji).toBeTruthy()
        expect(a.threshold).toBeGreaterThan(0)
        expect(a.level).toBeGreaterThan(0)
      }
    })

    it('ID 应唯一', () => {
      const ids = ACHIEVEMENTS.map(a => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('getAchievementStatus', () => {
    it('应 unlocked=false 当 0 进度', () => {
      const status = getAchievementStatus(ACHIEVEMENTS[0], EMPTY_STATS)
      expect(status.unlocked).toBe(false)
      expect(status.progress).toBe(0)
      expect(status.ratio).toBe(0)
    })

    it('应 unlocked=true 当达到阈值', () => {
      const stats = { ...EMPTY_STATS, streak: 1 }
      const status = getAchievementStatus(
        ACHIEVEMENTS.find(a => a.id === 'streak-1')!,
        stats,
      )
      expect(status.unlocked).toBe(true)
      expect(status.progress).toBe(1)
      expect(status.ratio).toBe(1)
    })

    it('应计算 ratio (当前/阈值)', () => {
      const stats = { ...EMPTY_STATS, words: 50 }
      const status = getAchievementStatus(
        ACHIEVEMENTS.find(a => a.id === 'words-100')!,
        stats,
      )
      expect(status.unlocked).toBe(false)
      expect(status.ratio).toBe(0.5)
    })

    it('应 ratio=1 当远超阈值', () => {
      const stats = { ...EMPTY_STATS, words: 10000 }
      const status = getAchievementStatus(
        ACHIEVEMENTS.find(a => a.id === 'words-100')!,
        stats,
      )
      expect(status.unlocked).toBe(true)
      expect(status.ratio).toBe(1)  // 已解锁, ratio 强制 1
    })
  })

  describe('getAllAchievementStatus', () => {
    it('应返回全部 19 个状态', () => {
      const all = getAllAchievementStatus(EMPTY_STATS)
      expect(all.length).toBe(20)
    })

    it('应 unlocked=0 当空 stats', () => {
      const all = getAllAchievementStatus(EMPTY_STATS)
      expect(all.every(s => !s.unlocked)).toBe(true)
    })
  })

  describe('getUnlockedCount', () => {
    it('应返回 0 当空 stats', () => {
      expect(getUnlockedCount(EMPTY_STATS)).toBe(0)
    })

    it('应返回正确数当有进度', () => {
      const stats: AchievementStats = {
        streak: 7,    // 解锁 streak-1/3/7 = 3 个
        totalDays: 0,
        words: 100,   // 解锁 words-10/50/100 = 3 个
        errors: 10,   // 解锁 errors-1/10 = 2 个
        favorites: 0,
      }
      expect(getUnlockedCount(stats)).toBe(8)
    })

    it('应返回 20 (全部) 当 stats 极高', () => {
      const stats: AchievementStats = {
        streak: 1000, totalDays: 0, words: 10000, errors: 1000, favorites: 10000,
      }
      expect(getUnlockedCount(stats)).toBe(20)
    })
  })

  describe('getNextAchievement', () => {
    it('应返回 null 当全部解锁', () => {
      const stats: AchievementStats = {
        streak: 1000, totalDays: 0, words: 10000, errors: 1000, favorites: 10000,
      }
      expect(getNextAchievement(stats)).toBeNull()
    })

    it('应返回 ratio 最高的未解锁成就', () => {
      const stats = { ...EMPTY_STATS, words: 5 }
      const next = getNextAchievement(stats)!
      // words-10 (5/10=0.5) 应是 ratio 最高的 (其他都是 0)
      expect(next.achievement.id).toBe('words-10')
      expect(next.ratio).toBe(0.5)
    })
  })
})
