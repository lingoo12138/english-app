// plan.ts 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import {
  markWordCompleted,
  unmarkWordCompleted,
  loadProgress,
  saveProgress,
  generateTodayPlan,
} from '../src/lib/plan'

describe('plan.ts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadProgress / saveProgress', () => {
    it('空数据返回空 Set + 0 goal', () => {
      const { completed, goal } = loadProgress('2026-07-23')
      expect(completed.size).toBe(0)
      expect(goal).toBe(0)
    })

    it('saveProgress 后能 load 回来', () => {
      const set = new Set(['w-1', 'w-2'])
      saveProgress('2026-07-23', set, 10)
      const { completed, goal } = loadProgress('2026-07-23')
      expect(completed.size).toBe(2)
      expect(completed.has('w-1')).toBe(true)
      expect(goal).toBe(10)
    })

    it('兼容老 string[] 结构', () => {
      localStorage.setItem('plan-progress-2026-07-23', JSON.stringify(['w-1', 'w-2']))
      const { completed, goal } = loadProgress('2026-07-23')
      expect(completed.size).toBe(2)
      expect(goal).toBe(0)
    })

    it('损坏的 localStorage 不抛异常', () => {
      localStorage.setItem('plan-progress-2026-07-23', '{invalid json')
      const { completed, goal } = loadProgress('2026-07-23')
      expect(completed.size).toBe(0)
      expect(goal).toBe(0)
    })
  })

  describe('markWordCompleted', () => {
    it('标记一个词后 completed 包含该词', () => {
      const set = markWordCompleted('w-1', '2026-07-23', 5)
      expect(set.has('w-1')).toBe(true)
      expect(set.size).toBe(1)
    })

    it('标记两个不同词', () => {
      markWordCompleted('w-1', '2026-07-23', 5)
      const set = markWordCompleted('w-2', '2026-07-23', 5)
      expect(set.has('w-1')).toBe(true)
      expect(set.has('w-2')).toBe(true)
      expect(set.size).toBe(2)
    })

    it('标记同一词多次(去重)', () => {
      markWordCompleted('w-1', '2026-07-23', 5)
      markWordCompleted('w-1', '2026-07-23', 5)
      const { completed } = loadProgress('2026-07-23')
      expect(completed.size).toBe(1)
    })

    it('unmarkWordCompleted 移除词', () => {
      markWordCompleted('w-1', '2026-07-23', 5)
      unmarkWordCompleted('w-1', '2026-07-23', 5)
      const { completed } = loadProgress('2026-07-23')
      expect(completed.size).toBe(0)
    })
  })

  describe('generateTodayPlan', () => {
    it('空生词本也能生成 plan', async () => {
      const plan = await generateTodayPlan(10, 'all')
      expect(plan.date).toBeTruthy()
      expect(plan.total).toBe(10)
      expect(plan.words).toBeDefined()
    })

    it('isDone: 全部完成时 isDone=true', async () => {
      const plan = await generateTodayPlan(2, 'all')
      for (const w of plan.words) {
        markWordCompleted(w.id, plan.date, 2)
      }
      const plan2 = await generateTodayPlan(2, 'all')
      expect(plan2.isDone).toBe(true)
    })

    it('progressPct 0-100', async () => {
      const plan = await generateTodayPlan(5, 'all')
      expect(plan.progressPct).toBeGreaterThanOrEqual(0)
      expect(plan.progressPct).toBeLessThanOrEqual(100)
    })
  })
})
