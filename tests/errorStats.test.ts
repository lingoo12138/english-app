// tests/errorStats.test.ts - v1.35.0 W33 错题升级
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import { getErrorSummary, ERROR_TYPE_LABELS, getErrorTypeColor } from '../src/lib/errorStats'

describe('errorStats (v1.35.0-W33)', () => {
  beforeEach(async () => {
    await db.writingErrors.clear()
  })

  describe('getErrorSummary', () => {
    it('空库返 0', async () => {
      const s = await getErrorSummary()
      expect(s.total).toBe(0)
      expect(s.byType).toEqual([])
      expect(s.highFreq).toEqual([])
      expect(s.trend7).toEqual([0, 0, 0, 0, 0, 0, 0])
    })

    it('按 type 分组', async () => {
      const now = Date.now()
      await db.writingErrors.add({
        source: 'write',
        original: 'I go to school',
        corrected: 'I went to school',
        ts: now,
        errors: [
          { original: 'go', suggestion: 'went', type: 'tense', explanation: 'e' },
        ],
      } as any)
      await db.writingErrors.add({
        source: 'write',
        original: 'He go home',
        corrected: 'He goes home',
        ts: now,
        errors: [
          { original: 'go', suggestion: 'goes', type: 'grammar', explanation: 'e' },
          { original: 'go', suggestion: 'goes', type: 'spelling', explanation: 'e' },
        ],
      } as any)
      const s = await getErrorSummary()
      expect(s.total).toBe(2)
      expect(s.byType.length).toBe(3)
      // grammar 和 spelling 各 1, tense 1, pct 各 33%
      const grammar = s.byType.find(t => t.type === 'grammar')!
      expect(grammar.count).toBe(1)
      expect(grammar.pct).toBe(33)
    })

    it('高频错词 Top 5', async () => {
      const now = Date.now()
      // 'go' 错 3 次
      for (let i = 0; i < 3; i++) {
        await db.writingErrors.add({
          source: 'write',
          original: 'go',
          corrected: 'goes',
          ts: now - i * 1000,
          errors: [{ original: 'go', suggestion: 'goes', type: 'grammar', explanation: 'e' }],
        } as any)
      }
      // 'have' 错 1 次
      await db.writingErrors.add({
        source: 'write',
        original: 'have',
        corrected: 'has',
        ts: now,
        errors: [{ original: 'have', suggestion: 'has', type: 'grammar', explanation: 'e' }],
      } as any)
      const s = await getErrorSummary()
      expect(s.highFreq[0].original).toBe('go')
      expect(s.highFreq[0].count).toBe(3)
    })

    it('7 天趋势', async () => {
      const now = Date.now()
      // 今天 1 个
      await db.writingErrors.add({ source: 'write', original: 'a', corrected: 'b', ts: now, errors: [] } as any)
      // 3 天前 1 个
      await db.writingErrors.add({ source: 'write', original: 'a', corrected: 'b', ts: now - 3 * 86_400_000, errors: [] } as any)
      const s = await getErrorSummary()
      // index 6 = 今天, 6-3=3 是 3 天前
      expect(s.trend7[6]).toBe(1)
      expect(s.trend7[3]).toBe(1)
    })
  })

  describe('ERROR_TYPE_LABELS', () => {
    it('8 类型', () => {
      expect(Object.keys(ERROR_TYPE_LABELS).length).toBe(8)
    })
    it('grammar → 语法', () => {
      expect(ERROR_TYPE_LABELS.grammar).toBe('语法')
    })
  })

  describe('getErrorTypeColor', () => {
    it('grammar 有色', () => {
      expect(getErrorTypeColor('grammar')).toContain('red')
    })
    it('unknown 用 other 色', () => {
      expect(getErrorTypeColor('unknown')).toContain('stone')
    })
  })
})
