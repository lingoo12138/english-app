// tests/llmUsage.test.ts - v1.12.0-C LLM 成本控制
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DAILY_LIMITS,
  getLLMUsage,
  getLLMUsageToday,
  recordLLMCall,
  getDailyLimit,
  getRemaining,
  checkLLMLimit,
  resetLLMUsageToday,
  getLimitExceededMessage,
  type LLMCategory,
} from '../src/lib/llmUsage'

describe('llmUsage (v1.12.0-C)', () => {
  beforeEach(() => {
    resetLLMUsageToday()
  })

  describe('DAILY_LIMITS', () => {
    it('应有 3 个类别', () => {
      expect(Object.keys(DAILY_LIMITS)).toEqual(
        expect.arrayContaining(['write', 'chat', 'explain']),
      )
    })

    it('write 应为 20', () => {
      expect(DAILY_LIMITS.write).toBe(20)
    })

    it('chat 应为 50', () => {
      expect(DAILY_LIMITS.chat).toBe(50)
    })

    it('explain 应为 30', () => {
      expect(DAILY_LIMITS.explain).toBe(30)
    })
  })

  describe('recordLLMCall 累加', () => {
    it('单次调用 +1', () => {
      recordLLMCall('write')
      expect(getLLMUsage('write')).toBe(1)
    })

    it('多次调用累加', () => {
      recordLLMCall('chat')
      recordLLMCall('chat')
      recordLLMCall('chat')
      expect(getLLMUsage('chat')).toBe(3)
    })

    it('不同类别独立计数', () => {
      recordLLMCall('write')
      recordLLMCall('chat')
      recordLLMCall('explain')
      expect(getLLMUsage('write')).toBe(1)
      expect(getLLMUsage('chat')).toBe(1)
      expect(getLLMUsage('explain')).toBe(1)
    })
  })

  describe('getLLMUsageToday', () => {
    it('首次调用返 0', () => {
      const r = getLLMUsageToday()
      expect(r.write).toBe(0)
      expect(r.chat).toBe(0)
      expect(r.explain).toBe(0)
    })

    it('记录后返正确数字', () => {
      recordLLMCall('write')
      recordLLMCall('write')
      const r = getLLMUsageToday()
      expect(r.write).toBe(2)
    })

    it('date 应是今日 YYYY-MM-DD', () => {
      const r = getLLMUsageToday()
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getDailyLimit', () => {
    it('write → 20', () => {
      expect(getDailyLimit('write')).toBe(20)
    })

    it('chat → 50', () => {
      expect(getDailyLimit('chat')).toBe(50)
    })

    it('explain → 30', () => {
      expect(getDailyLimit('explain')).toBe(30)
    })
  })

  describe('getRemaining', () => {
    it('未用返满额', () => {
      expect(getRemaining('write')).toBe(20)
    })

    it('用 5 返 15', () => {
      for (let i = 0; i < 5; i++) recordLLMCall('write')
      expect(getRemaining('write')).toBe(15)
    })

    it('用超返 0 (不返负数)', () => {
      for (let i = 0; i < 25; i++) recordLLMCall('write')
      expect(getRemaining('write')).toBe(0)
    })

    it('chat 用超返 0 (不返负数, 55 > 50)', () => {
      for (let i = 0; i < 55; i++) recordLLMCall('chat')
      expect(getRemaining('chat')).toBe(0)
    })
  })

  describe('checkLLMLimit', () => {
    it('未用应 ok=true', () => {
      const r = checkLLMLimit('write')
      expect(r.ok).toBe(true)
      expect(r.used).toBe(0)
      expect(r.limit).toBe(20)
      expect(r.remaining).toBe(20)
    })

    it('达限应 ok=false', () => {
      for (let i = 0; i < 20; i++) recordLLMCall('write')
      const r = checkLLMLimit('write')
      expect(r.ok).toBe(false)
      expect(r.used).toBe(20)
      expect(r.remaining).toBe(0)
    })

    it('超限仍 ok=false', () => {
      for (let i = 0; i < 55; i++) recordLLMCall('chat')
      const r = checkLLMLimit('chat')
      expect(r.ok).toBe(false)
      expect(r.used).toBe(55)
      expect(r.remaining).toBe(0)
    })
  })

  describe('resetLLMUsageToday', () => {
    it('应清空所有计数', () => {
      recordLLMCall('write')
      recordLLMCall('chat')
      resetLLMUsageToday()
      expect(getLLMUsage('write')).toBe(0)
      expect(getLLMUsage('chat')).toBe(0)
    })
  })

  describe('getLimitExceededMessage', () => {
    it('未超限返空字符串', () => {
      expect(getLimitExceededMessage('write')).toBe('')
    })

    it('超限返友好提示', () => {
      for (let i = 0; i < 20; i++) recordLLMCall('write')
      const msg = getLimitExceededMessage('write')
      expect(msg).toContain('write')
      expect(msg).toContain('20')
    })
  })
})
