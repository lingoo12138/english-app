// dictation.test.ts - v1.87 W81-D 听写测试
import { describe, it, expect } from 'vitest'
import {
  normalize,
  scoreAnswer,
  diffWords,
  levenshtein,
  buildItem,
  makeShortSentence,
} from '../src/lib/dictation'
import type { Word } from '../src/types'

const sampleWords: Word[] = [
  { id: 'w-1', word: 'apple', translations: ['苹果'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 1, frequency: 5 },
  { id: 'w-2', word: 'banana', translations: ['香蕉'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 1, frequency: 4 },
  { id: 'w-3', word: 'orange', translations: ['橙子'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 1, frequency: 3 },
  { id: 'w-4', word: 'umbrella', translations: ['伞'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 1, frequency: 3 },
  { id: 'w-5', word: 'ice', translations: ['冰'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'cet4', difficulty: 1, frequency: 4 },
]

describe('dictation (v1.87-D)', () => {
  describe('normalize', () => {
    it('lowercase + 去标点 + 折叠空格', () => {
      expect(normalize('Hello, World!')).toBe('hello world')
      expect(normalize('  I am  OK.  ')).toBe('i am ok')
      expect(normalize('"Yes," she said.')).toBe('yes she said')
    })
  })

  describe('levenshtein', () => {
    it('相同字符串距离 0', () => {
      expect(levenshtein('hello', 'hello')).toBe(0)
    })
    it('1 替换', () => {
      expect(levenshtein('cat', 'bat')).toBe(1)
    })
    it('1 插入', () => {
      expect(levenshtein('cat', 'cats')).toBe(1)
    })
    it('1 删除', () => {
      expect(levenshtein('cats', 'cat')).toBe(1)
    })
    it('2 替换', () => {
      expect(levenshtein('cat', 'dog')).toBe(3)
    })
  })

  describe('scoreAnswer', () => {
    it('完全正确 = 100', () => {
      expect(scoreAnswer('hello world', 'hello world')).toBe(100)
    })
    it('大小写不敏感', () => {
      expect(scoreAnswer('Hello World', 'hello world')).toBe(100)
    })
    it('标点不敏感', () => {
      expect(scoreAnswer('Hello, world!', 'hello world')).toBe(100)
    })
    it('1 词错 (medium 短句 4 词) = 80', () => {
      expect(scoreAnswer('I want an apple', 'I want an orange')).toBe(80)
    })
    it('短句 1 词错 (3 词中 1 错) = 80', () => {
      // "I love cats" vs "I love dogs" = 2/3 命中 = 67% → 80
      expect(scoreAnswer('I love cats', 'I love dogs')).toBe(80)
    })

    it('短句 2 词错 (3 词中 2 错) = 50', () => {
      // "I love cats" vs "I like dogs" 综合 50
      expect(scoreAnswer('I love cats', 'I like dogs')).toBe(50)
    })
    it('全错 (完全无关) = 0', () => {
      expect(scoreAnswer('hello world', 'xyz abc def')).toBe(0)
    })
    it('空字符串 = 0', () => {
      expect(scoreAnswer('hello', '')).toBe(0)
    })
  })

  describe('diffWords', () => {
    it('找出漏词', () => {
      const d = diffWords('I want an apple', 'I want apple')
      expect(d.missing).toContain('an')
    })
    it('找出多词', () => {
      const d = diffWords('I want apple', 'I really want apple')
      expect(d.extra).toContain('really')
    })
  })

  describe('buildItem', () => {
    it('easy = 1 词', () => {
      const used = new Set<string>()
      const it = buildItem(sampleWords, 'easy', used, 1)
      expect(it).not.toBeNull()
      expect(it!.target.split(' ').length).toBe(1)
    })
    it('medium = 短句 (4 词模板)', () => {
      const used = new Set<string>()
      const it = buildItem(sampleWords, 'medium', used, 1)
      expect(it).not.toBeNull()
      expect(it!.target.split(' ').length).toBeGreaterThanOrEqual(3)
    })
    it('hard = 长句 (8 词+)', () => {
      const used = new Set<string>()
      const it = buildItem(sampleWords, 'hard', used, 1)
      expect(it).not.toBeNull()
      expect(it!.target.split(' ').length).toBeGreaterThanOrEqual(5)
    })
    it('不重复主词 (caller 维护 used)', () => {
      // v1.87 P1 修: buildItem 不再 mutate used, 由 caller 负责
      const used = new Set<string>()
      const seen = new Set<string>()
      for (let i = 0; i < 10; i++) {
        const it = buildItem(sampleWords, 'easy', used, i)
        if (it) {
          expect(seen.has(it.sourceWord!.id)).toBe(false)
          seen.add(it.sourceWord!.id)
          used.add(it.sourceWord!.id)  // caller 维护
        }
      }
    })
  })

  describe('makeShortSentence', () => {
    it('a/an 正确 (apple → an, banana → a)', () => {
      expect(makeShortSentence(sampleWords, sampleWords[0])).toMatch(/^an /)
      expect(makeShortSentence(sampleWords, sampleWords[1])).toMatch(/^a /)
    })
    it('含主词', () => {
      const s = makeShortSentence(sampleWords, sampleWords[0])
      expect(s).toContain('apple')
    })
  })
})
