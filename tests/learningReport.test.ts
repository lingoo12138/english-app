// learningReport.ts 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  getDailyReport,
  getWeeklyReport,
  getTrend,
  getComparison,
  getEncouragement,
  getWeekStart,
} from '../src/lib/learningReport'

describe('learningReport.ts', () => {
  beforeEach(async () => {
    await db.records.clear()
    await db.favorites.clear()
    await db.writingErrors.clear()
    await db.pronunciationAttempts.clear()
  })

  describe('getDailyReport 数据汇总 (mock data)', () => {
    it('汇总今日学词/跟读/错题/收藏/连续/累计', async () => {
      const today = new Date()
      today.setHours(12, 0, 0, 0)  // 今日中午

      // 注入今日 view 记录 (3 个不同词)
      await db.records.bulkAdd([
        { wordId: 'w-1', action: 'view', timestamp: today.getTime() },
        { wordId: 'w-2', action: 'view', timestamp: today.getTime() },
        { wordId: 'w-3', action: 'view', timestamp: today.getTime() },
      ])

      // 注入昨日 view 记录 (验证过滤)
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      await db.records.add({ wordId: 'w-9', action: 'view', timestamp: yesterday.getTime() })

      // 注入今日跟读
      await db.pronunciationAttempts.add({
        wordId: 'w-1', word: 'hello', ts: today.getTime(), score: 80,
        volumeScore: 80, durationScore: 80, consistency: 0.8, duration: 1.0, volume: 0.5, attemptNumber: 1,
      })
      await db.pronunciationAttempts.add({
        wordId: 'w-2', word: 'world', ts: today.getTime(), score: 75,
        volumeScore: 75, durationScore: 75, consistency: 0.7, duration: 1.0, volume: 0.5, attemptNumber: 1,
      })

      // 注入今日错题
      await db.writingErrors.add({
        source: 'write', original: 'go', corrected: 'went', errors: [], ts: today.getTime(),
      })

      // 注入今日收藏
      await db.favorites.put({ wordId: 'w-5', addedAt: today.getTime() })

      // 注入场景词 (应被过滤)
      await db.records.add({ wordId: 'scene:test:1', action: 'view', timestamp: today.getTime() })

      const report = await getDailyReport(today)
      expect(report.wordsLearned).toBe(3)  // w-1, w-2, w-3 (场景词被过滤)
      expect(report.pronunciationCount).toBe(2)
      expect(report.errorCount).toBe(1)
      expect(report.favoritesAdded).toBe(1)
      expect(report.totalWords).toBe(4)  // w-1, w-2, w-3, w-9 (累计)
      expect(report.encouragement).toBeTruthy()
      expect(report.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getWeeklyReport 7 天汇总', () => {
    it('汇总 7 天日报 + 趋势 + 对比 + Top 5', async () => {
      const weekStart = getWeekStart(new Date('2026-07-20'))  // 周一
      // 第 1,3,5 天学 2 词 (去重后)
      for (let i = 0; i < 5; i += 2) {
        const day = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
        day.setHours(10, 0, 0, 0)
        await db.records.bulkAdd([
          { wordId: `w-${i + 1}`, action: 'view', timestamp: day.getTime() },
          { wordId: `w-${i + 2}`, action: 'view', timestamp: day.getTime() },
        ])
      }

      const report = await getWeeklyReport(weekStart)
      expect(report.dailyReports).toHaveLength(7)
      expect(report.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // 本周共 6 unique 词 (w-1..w-6)
      expect(report.totalWordsLearned).toBe(6)
      // 至少有 trend / comparison / encouragement
      expect(report.trend).toBeTruthy()
      expect(report.comparison).toBeTruthy()
      expect(report.encouragement).toBeTruthy()
    })
  })

  describe('getTrend 上升/下降/平稳', () => {
    it('上升趋势 → up + 📈', () => {
      const t = getTrend([1, 1, 5, 5])
      expect(t.direction).toBe('up')
      expect(t.emoji).toBe('📈')
    })

    it('下降趋势 → down + 📉', () => {
      const t = getTrend([5, 5, 1, 1])
      expect(t.direction).toBe('down')
      expect(t.emoji).toBe('📉')
    })

    it('平稳 → flat + ➡️', () => {
      const t = getTrend([3, 3, 3, 3])
      expect(t.direction).toBe('flat')
      expect(t.emoji).toBe('➡️')
    })

    it('空数组/单元素 → flat', () => {
      expect(getTrend([]).direction).toBe('flat')
      expect(getTrend([1]).direction).toBe('flat')
    })
  })

  describe('getEncouragement 鼓励文案生成', () => {
    it('无数据 → 休息类文案', () => {
      const text = getEncouragement({ wordsLearned: 0, pronunciationCount: 0, errorCount: 0, favoritesAdded: 0, streak: 0 })
      expect(text).toBeTruthy()
      expect(text.length).toBeGreaterThan(0)
    })

    it('高强度 (wordsLearned >= 10) → 高燃文案', () => {
      const text = getEncouragement({ wordsLearned: 15, pronunciationCount: 0, errorCount: 0, favoritesAdded: 0, streak: 0 })
      expect(text).toBeTruthy()
    })

    it('连续 >= 3 天 → 坚持类文案', () => {
      const text = getEncouragement({ wordsLearned: 2, pronunciationCount: 0, errorCount: 0, favoritesAdded: 0, streak: 5 })
      expect(text).toBeTruthy()
      // 文案应含 习惯 / 坚持 / 连续 相关词
      expect(/坚持|习惯|连续|向前|养成|不歇|继续/.test(text)).toBe(true)
    })

    it('中等强度 (1-9 词) → 鼓励类文案', () => {
      const text = getEncouragement({ wordsLearned: 3, pronunciationCount: 0, errorCount: 0, favoritesAdded: 0, streak: 0 })
      expect(text).toBeTruthy()
    })
  })
})
