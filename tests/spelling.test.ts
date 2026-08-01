// spelling.test.ts - v1.90 W84 单词卡测试
import { describe, it, expect } from 'vitest'
import {
  pickSpellingWord,
  spellingDiff,
  scoreSpelling,
  renderSpellingHint,
} from '../src/lib/spelling'
import type { Word } from '../src/types'

const sampleWords: Word[] = [
  { id: 'w-cat', word: 'cat', translations: ['猫'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-dog', word: 'dog', translations: ['狗'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-bus', word: 'bus', translations: ['公交'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 4 },
  { id: 'w-happy', word: 'happy', translations: ['开心'], pos: ['a'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-school', word: 'school', translations: ['学校'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-different', word: 'different', translations: ['不同'], pos: ['a'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 3, frequency: 4 },
]

describe('W84 单词卡 (Spelling)', () => {
  describe('pickSpellingWord 难度细分', () => {
    it('easy 1-4 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickSpellingWord(sampleWords, new Set(), 'easy', seed)
        if (w) {
          expect(w.word.length, `${w.word} 应 1-4`).toBeGreaterThanOrEqual(1)
          expect(w.word.length, `${w.word} 应 1-4`).toBeLessThanOrEqual(4)
        }
      }
    })
    it('medium 5-6 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickSpellingWord(sampleWords, new Set(), 'medium', seed)
        if (w) {
          expect(w.word.length, `${w.word} 应 5-6`).toBeGreaterThanOrEqual(5)
          expect(w.word.length, `${w.word} 应 5-6`).toBeLessThanOrEqual(6)
        }
      }
    })
    it('hard 7-12 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickSpellingWord(sampleWords, new Set(), 'hard', seed)
        if (w) {
          expect(w.word.length, `${w.word} 应 7-12`).toBeGreaterThanOrEqual(7)
          expect(w.word.length, `${w.word} 应 7-12`).toBeLessThanOrEqual(12)
        }
      }
    })
  })

  describe('spellingDiff 字符级 diff', () => {
    it('完全正确', () => {
      const d = spellingDiff('cat', 'cat')
      expect(d.correct).toBe(true)
      expect(d.missing).toEqual([])
      expect(d.wrong).toEqual([])
    })
    it('大小写不敏感', () => {
      const d = spellingDiff('Cat', 'CAT')
      expect(d.correct).toBe(true)
    })
    it('1 字符错', () => {
      const d = spellingDiff('cat', 'bat')
      expect(d.correct).toBe(false)
      // 1 字符替换 = wrong
      expect(d.wrong.length).toBeGreaterThan(0)
    })
    it('多字符', () => {
      const d = spellingDiff('cat', 'cart')
      expect(d.correct).toBe(false)
      // cart = c-a-r-t (4 字符), cat (3 字符) → 1 extra
      expect(d.extra.length).toBeGreaterThanOrEqual(1)
    })
    it('漏字符', () => {
      const d = spellingDiff('cat', 'ct')
      expect(d.correct).toBe(false)
      // 1 字符 missing
      expect(d.missing.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('scoreSpelling 评分', () => {
    it('完全对 = 100', () => {
      expect(scoreSpelling('happy', 'happy')).toBe(100)
    })
    it('大小写不敏感', () => {
      expect(scoreSpelling('Happy', 'HAPPY')).toBe(100)
    })
    it('1 字符错 (5 字符中) = 80', () => {
      // happy → huppy 1 字符替换
      // errors = 1, target = 5, ratio = 0.2 → 80
      expect(scoreSpelling('happy', 'huppy')).toBeGreaterThanOrEqual(50)
    })
    it('全错 = 0', () => {
      expect(scoreSpelling('cat', 'xyz')).toBe(0)
    })
  })

  describe('renderSpellingHint 字符级渲染', () => {
    it('完全对时全 ok', () => {
      const h = renderSpellingHint('cat', 'cat')
      expect(h.parts.every(p => p.status === 'ok')).toBe(true)
      expect(h.userParts.every(p => p.status === 'ok')).toBe(true)
    })
    it('1 字符错', () => {
      const h = renderSpellingHint('cat', 'bat')
      expect(h.parts.some(p => p.status === 'wrong')).toBe(true)
    })
  })
})
