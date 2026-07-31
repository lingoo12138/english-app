// textbook-p2.test.ts - v1.87 W81-B 课文 P2 测试
import { describe, it, expect } from 'vitest'
import { getAllLessons } from '../src/lib/textbook'
import { LESSONS_P2 } from '../src/data/textbook-p2'

describe('W81-B 课文 P2', () => {
  it('P2 至少 5 篇 (目标 5+)', () => {
    expect(LESSONS_P2.length).toBeGreaterThanOrEqual(5)
  })

  it('P1+P2 总 10+ 篇', () => {
    expect(getAllLessons().length).toBeGreaterThanOrEqual(10)
  })

  it('每篇词汇全在 body (0 miss)', () => {
    for (const l of LESSONS_P2) {
      const bodyLower = l.body.toLowerCase()
      const miss = l.vocabulary.filter(w => !bodyLower.includes(w.toLowerCase()))
      expect(miss, `${l.id} miss: ${miss}`).toEqual([])
    }
  })

  it('每篇词汇 8-12 词', () => {
    for (const l of LESSONS_P2) {
      expect(l.vocabulary.length).toBeGreaterThanOrEqual(8)
      expect(l.vocabulary.length).toBeLessThanOrEqual(12)
    }
  })

  it('每篇 body 80-150 词', () => {
    for (const l of LESSONS_P2) {
      const wc = l.body.trim().split(/\s+/).length
      expect(wc).toBeGreaterThanOrEqual(80)
      expect(wc).toBeLessThanOrEqual(150)
    }
  })

  it('P1+P2 跨课复用 8+ 词', () => {
    const all = getAllLessons()
    const counts: Record<string, number> = {}
    for (const l of all) {
      for (const w of l.vocabulary) {
        counts[w] = (counts[w] || 0) + 1
      }
    }
    const cross = Object.values(counts).filter(c => c >= 2).length
    expect(cross).toBeGreaterThanOrEqual(8)
  })

  it('level 合法', () => {
    const valid = ['primary', 'junior', 'senior', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'daily']
    for (const l of LESSONS_P2) {
      expect(valid).toContain(l.level)
    }
  })
})
