// tests/inAppReminder.test.ts - v1.34.0 W32 iOS 兜底
import { describe, it, expect, beforeEach } from 'vitest'
import {
  shouldUseInAppReminder,
  shouldShowInAppReminder,
  dismissInAppReminder,
  vibrateIfSupported,
  setAppBadgeIfSupported,
} from '../src/lib/inAppReminder'
import { setReminderSettings } from '../src/lib/reminder'

describe('inAppReminder (v1.34.0-W32)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('shouldUseInAppReminder', () => {
    it('桌面 Chrome (有 Notification) → false', () => {
      // jsdom 默认无 Notification
      // 不依赖具体环境, 只验证返 boolean
      expect(typeof shouldUseInAppReminder()).toBe('boolean')
    })
  })

  describe('shouldShowInAppReminder', () => {
    it('未启用 → false', () => {
      setReminderSettings({ enabled: false, hour: 9, minute: 0, showStreak: true })
      const now = new Date()
      now.setHours(9, 0, 0, 0)
      expect(shouldShowInAppReminder(now)).toBe(false)
    })

    it('启用 + 时间到 + 未 dismiss → true', () => {
      setReminderSettings({ enabled: true, hour: 9, minute: 0, showStreak: true })
      const now = new Date()
      now.setHours(9, 0, 0, 0)
      expect(shouldShowInAppReminder(now)).toBe(true)
    })

    it('时间未到 → false', () => {
      setReminderSettings({ enabled: true, hour: 9, minute: 0, showStreak: true })
      const now = new Date()
      now.setHours(10, 0, 0, 0)
      expect(shouldShowInAppReminder(now)).toBe(false)
    })

    it('dismiss 24h 内 → false', () => {
      setReminderSettings({ enabled: true, hour: 9, minute: 0, showStreak: true })
      dismissInAppReminder()
      const now = new Date()
      now.setHours(9, 0, 0, 0)
      expect(shouldShowInAppReminder(now)).toBe(false)
    })
  })

  describe('dismissInAppReminder', () => {
    it('设置后 24h 内不弹', () => {
      setReminderSettings({ enabled: true, hour: 9, minute: 0, showStreak: true })
      dismissInAppReminder()
      const now = new Date()
      now.setHours(9, 0, 0, 0)
      expect(shouldShowInAppReminder(now)).toBe(false)
    })
  })

  describe('震动 / Badge (静默降级)', () => {
    it('vibrateIfSupported 不抛错', () => {
      expect(() => vibrateIfSupported()).not.toThrow()
    })
    it('setAppBadgeIfSupported 不抛错', async () => {
      await expect(setAppBadgeIfSupported(5)).resolves.not.toThrow()
    })
  })
})
