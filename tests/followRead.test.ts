// followRead.test.ts - v1.92 W86-A 跟读评分测试
import { describe, it, expect } from 'vitest'
import {
  normalizeFR,
  scoreFollowRead,
  diffFollowRead,
  splitSentences,
  evaluateFollowRead,
} from '../src/lib/followRead'

describe('W86-A 跟读评分', () => {
  describe('normalizeFR', () => {
    it('lowercase + 去标点 + 折叠空格', () => {
      expect(normalizeFR('Hello, World!')).toBe('hello world')
      expect(normalizeFR('  I am  OK.  ')).toBe('i am ok')
    })
  })

  describe('splitSentences', () => {
    it('按 . ! ? 切分', () => {
      const text = 'I love cats. Dogs are great! Birds? Yes.'
      const s = splitSentences(text)
      expect(s.length).toBe(4)
      expect(s[0]).toBe('I love cats')
      expect(s[1]).toBe('Dogs are great')
    })
    it('空字符串返 []', () => {
      expect(splitSentences('')).toEqual([])
    })
  })

  describe('scoreFollowRead', () => {
    it('完全对 = 100', () => {
      expect(scoreFollowRead('I love cats', 'I love cats')).toBe(100)
    })
    it('大小写不敏感', () => {
      expect(scoreFollowRead('I love cats', 'i love CATS')).toBeGreaterThanOrEqual(70)
    })
    it('全错 = 0 (字符相似度可 > 0)', () => {
      // 字符级算法, 完全无关的字符串仍有字符 set 重叠, 不会返 0
      // 测试: 完全无关 (无共用字符)
      expect(scoreFollowRead('aaa', 'xyz')).toBe(0)
    })
    it('短句 1 词错', () => {
      // I love cats → I love dogs (1 词错)
      // 字符 60% + 词 40% 综合
      const score = scoreFollowRead('I love cats', 'I love dogs')
      expect(score).toBeGreaterThanOrEqual(50)
    })
  })

  describe('diffFollowRead', () => {
    it('找出漏词', () => {
      const d = diffFollowRead('I love cats', 'I cats')
      expect(d.missing).toContain('love')
    })
    it('找出多词', () => {
      const d = diffFollowRead('I cats', 'I really love cats')
      expect(d.extra).toContain('really')
    })
    it('找出错词', () => {
      const d = diffFollowRead('I love cats', 'I like cats')
      expect(d.wrong.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('evaluateFollowRead (主函数)', () => {
    it('返完整结果', () => {
      const r = evaluateFollowRead('I love cats', 'I love dogs')
      expect(r.target).toBe('I love cats')
      expect(r.transcript).toBe('I love dogs')
      expect(r.score).toBeGreaterThan(0)
      expect(r.score).toBeLessThan(100)
      expect(r.wrong.length).toBeGreaterThanOrEqual(1)
    })
    it('完全对 100', () => {
      const r = evaluateFollowRead('hello', 'hello')
      expect(r.score).toBe(100)
      expect(r.missing).toEqual([])
      expect(r.extra).toEqual([])
      expect(r.wrong).toEqual([])
    })
  })
})
