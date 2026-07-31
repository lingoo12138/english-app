// textbook-p3.test.ts - v1.88 W82-A 课文 P3 测试
import { describe, it, expect } from 'vitest'
import { getAllLessons } from '../src/lib/textbook'
import { LESSONS_P3 } from '../src/data/textbook-p3'

describe('W82-A 课文 P3', () => {
  it('P3 至少 5 篇 (目标 5+)', () => {
    expect(LESSONS_P3.length).toBeGreaterThanOrEqual(5)
  })

  it('P1+P2+P3 总 20+ 篇', () => {
    expect(getAllLessons().length).toBeGreaterThanOrEqual(20)
  })

  it('每篇词汇全在 body (0 miss)', () => {
    for (const l of LESSONS_P3) {
      const bodyLower = l.body.toLowerCase()
      const miss = l.vocabulary.filter(w => !bodyLower.includes(w.toLowerCase()))
      expect(miss, `${l.id} miss: ${miss}`).toEqual([])
    }
  })

  it('每篇 body 80-150 词', () => {
    for (const l of LESSONS_P3) {
      const wc = l.body.trim().split(/\s+/).length
      expect(wc).toBeGreaterThanOrEqual(80)
      expect(wc).toBeLessThanOrEqual(150)
    }
  })

  it('P1+P2+P3 跨课复用 25+ 词', () => {
    const all = getAllLessons()
    const counts: Record<string, number> = {}
    for (const l of all) {
      for (const w of l.vocabulary) {
        counts[w] = (counts[w] || 0) + 1
      }
    }
    const cross = Object.values(counts).filter(c => c >= 2).length
    expect(cross).toBeGreaterThanOrEqual(25)
  })

  it('level 合法', () => {
    const valid = ['primary', 'junior', 'senior', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'daily']
    for (const l of LESSONS_P3) {
      expect(valid).toContain(l.level)
    }
  })

  it('P3 主题数 ≥ 5', () => {
    const themes = new Set(LESSONS_P3.map(l => l.id.split('-')[0]))
    expect(themes.size).toBeGreaterThanOrEqual(5)
  })
})
