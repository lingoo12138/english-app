// tests/streakMilestones.test.ts - v1.41.0 W41 streak 升级
import { describe, it, expect } from 'vitest'
import {
  STREAK_MILESTONES,
  getStreakMessage,
  type StreakMilestone,
} from '../src/lib/streak'

describe('streakMilestones (v1.41.0-W41)', () => {
  describe('STREAK_MILESTONES', () => {
    it('7 个里程碑', () => {
      expect(STREAK_MILESTONES.length).toBe(7)
    })
    it('days 递增', () => {
      const days = STREAK_MILESTONES.map(m => m.days)
      expect(days).toEqual([3, 7, 14, 30, 60, 100, 365])
    })
    it('每个有 emoji + label', () => {
      for (const m of STREAK_MILESTONES) {
        expect(m.emoji).toBeTruthy()
        expect(m.label).toBeTruthy()
      }
    })
  })

  describe('getStreakMessage', () => {
    it('0 天警告', () => {
      const r = getStreakMessage(0)
      expect(r.isWarning).toBe(true)
      expect(r.emoji).toBe('😴')
    })
    it('1 天起步', () => {
      const r = getStreakMessage(1)
      expect(r.emoji).toBe('🌱')
    })
    it('2-6 天火苗', () => {
      expect(getStreakMessage(2).emoji).toBe('🌿')
      expect(getStreakMessage(5).emoji).toBe('🔥')
    })
    it('7-29 天闪电', () => {
      expect(getStreakMessage(7).emoji).toBe('⚡')
      expect(getStreakMessage(20).emoji).toBe('⚡')
    })
    it('30-99 天奖杯', () => {
      expect(getStreakMessage(30).emoji).toBe('🏆')
      expect(getStreakMessage(50).emoji).toBe('🏆')
    })
    it('100+ 天皇冠', () => {
      expect(getStreakMessage(100).emoji).toBe('👑')
      expect(getStreakMessage(365).emoji).toBe('👑')
    })
  })
})
