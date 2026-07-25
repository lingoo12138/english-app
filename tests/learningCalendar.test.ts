// tests/learningCalendar.test.ts - v1.19.0 B9 学习日历
import { describe, it, expect } from 'vitest'
import {
  formatDateKey,
  getMonthName,
  getDaysInMonth,
  getHeatmapLevel,
  adjustMonth,
  isCurrentMonth,
  HEATMAP_COLORS,
} from '../src/lib/learningCalendar'

describe('learningCalendar (v1.19.0-B9)', () => {
  describe('formatDateKey', () => {
    it('格式 YYYY-MM-DD', () => {
      expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
      expect(formatDateKey(new Date(2026, 6, 25))).toBe('2026-07-25')
    })

    it('月/日补 0', () => {
      expect(formatDateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
      expect(formatDateKey(new Date(2026, 8, 9))).toBe('2026-09-09')
    })
  })

  describe('getMonthName', () => {
    it('中文月份', () => {
      expect(getMonthName(2026, 0)).toBe('2026 年 1 月')
      expect(getMonthName(2026, 6)).toBe('2026 年 7 月')
      expect(getMonthName(2026, 11)).toBe('2026 年 12 月')
    })
  })

  describe('getDaysInMonth', () => {
    it('1月 31天', () => {
      expect(getDaysInMonth(2026, 0)).toBe(31)
    })

    it('4月 30天', () => {
      expect(getDaysInMonth(2026, 3)).toBe(30)
    })

    it('2月 28天 (非闰年)', () => {
      expect(getDaysInMonth(2026, 1)).toBe(28)
    })

    it('2月 29天 (闰年 2024)', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29)
    })

    it('7月 31天', () => {
      expect(getDaysInMonth(2026, 6)).toBe(31)
    })
  })

  describe('getHeatmapLevel', () => {
    it('0 动作 = 0 级 (灰)', () => {
      expect(getHeatmapLevel(0)).toBe(0)
    })

    it('1-5 动作 = 1 级 (浅)', () => {
      expect(getHeatmapLevel(1)).toBe(1)
      expect(getHeatmapLevel(5)).toBe(1)
    })

    it('6-15 动作 = 2 级 (中)', () => {
      expect(getHeatmapLevel(6)).toBe(2)
      expect(getHeatmapLevel(15)).toBe(2)
    })

    it('16-30 动作 = 3 级 (深)', () => {
      expect(getHeatmapLevel(16)).toBe(3)
      expect(getHeatmapLevel(30)).toBe(3)
    })

    it('31+ 动作 = 4 级 (极深)', () => {
      expect(getHeatmapLevel(31)).toBe(4)
      expect(getHeatmapLevel(100)).toBe(4)
    })
  })

  describe('HEATMAP_COLORS', () => {
    it('5 个等级都有 class', () => {
      expect(HEATMAP_COLORS[0]).toBeTruthy()
      expect(HEATMAP_COLORS[1]).toBeTruthy()
      expect(HEATMAP_COLORS[2]).toBeTruthy()
      expect(HEATMAP_COLORS[3]).toBeTruthy()
      expect(HEATMAP_COLORS[4]).toBeTruthy()
    })

    it('class 含 emerald (绿色系)', () => {
      expect(HEATMAP_COLORS[1]).toMatch(/emerald/)
      expect(HEATMAP_COLORS[4]).toMatch(/emerald/)
    })
  })

  describe('adjustMonth', () => {
    it('2026/7 + 1 = 2026/8', () => {
      const r = adjustMonth(2026, 6, 1)
      expect(r.year).toBe(2026)
      expect(r.month).toBe(7)
    })

    it('2026/7 - 1 = 2026/6', () => {
      const r = adjustMonth(2026, 6, -1)
      expect(r.year).toBe(2026)
      expect(r.month).toBe(5)
    })

    it('2026/0 - 1 = 2025/11 (跨年)', () => {
      const r = adjustMonth(2026, 0, -1)
      expect(r.year).toBe(2025)
      expect(r.month).toBe(11)
    })

    it('2026/11 + 1 = 2027/0 (跨年)', () => {
      const r = adjustMonth(2026, 11, 1)
      expect(r.year).toBe(2027)
      expect(r.month).toBe(0)
    })
  })

  describe('isCurrentMonth', () => {
    it('当前月返 true', () => {
      const now = new Date()
      expect(isCurrentMonth(now.getFullYear(), now.getMonth())).toBe(true)
    })

    it('非当前月返 false', () => {
      expect(isCurrentMonth(2000, 0)).toBe(false)
    })
  })
})
