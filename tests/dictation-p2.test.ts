// dictation-p2.test.ts - v1.88 W82-C 听写增强测试
import { describe, it, expect } from 'vitest'
import {
  pickWord,
  buildItem,
  getReviewWords,
} from '../src/lib/dictation'
import type { Word } from '../src/types'

// 短词 (1-3 字符)
const shortWords: Word[] = [
  { id: 'w-cat', word: 'cat', translations: ['猫'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-dog', word: 'dog', translations: ['狗'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-sun', word: 'sun', translations: ['太阳'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 4 },
  { id: 'w-bus', word: 'bus', translations: ['公交'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 4 },
  { id: 'w-pen', word: 'pen', translations: ['笔'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 3 },
]

// 中词 (4-5 字符)
const mediumWords: Word[] = [
  { id: 'w-happy', word: 'happy', translations: ['开心'], pos: ['a'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-water', word: 'water', translations: ['水'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-table', word: 'table', translations: ['桌'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 4 },
]

// 长词 (6-7 字符)
const longWords: Word[] = [
  { id: 'w-school', word: 'school', translations: ['学校'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-friend', word: 'friend', translations: ['朋友'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-family', word: 'family', translations: ['家庭'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 5 },
  { id: 'w-teacher', word: 'teacher', translations: ['老师'], pos: ['n'], roots: [], phrases: [], tags: [], level: 'primary', difficulty: 1, frequency: 4 },
]

const allWords = [...shortWords, ...mediumWords, ...longWords]

describe('W82-C 听写增强', () => {
  describe('难度细分 (字符范围)', () => {
    it('easy 只选 1-3 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickWord(allWords, new Set(), seed, 'easy')
        if (w) {
          expect(w.word.length, `${w.word} 应 ≤ 3`).toBeLessThanOrEqual(3)
          expect(w.word.length, `${w.word} 应 ≥ 1`).toBeGreaterThanOrEqual(1)
        }
      }
    })
    it('medium 只选 4-5 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickWord(allWords, new Set(), seed, 'medium')
        if (w) {
          expect(w.word.length, `${w.word} 应 4-5`).toBeGreaterThanOrEqual(4)
          expect(w.word.length, `${w.word} 应 4-5`).toBeLessThanOrEqual(5)
        }
      }
    })
    it('hard 只选 6-7 字符', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const w = pickWord(allWords, new Set(), seed, 'hard')
        if (w) {
          expect(w.word.length, `${w.word} 应 6-7`).toBeGreaterThanOrEqual(6)
          expect(w.word.length, `${w.word} 应 6-7`).toBeLessThanOrEqual(7)
        }
      }
    })
  })

  describe('复习模式', () => {
    it('getReviewWords 返错词', () => {
      const reviewIds = ['w-cat', 'w-water']
      const result = getReviewWords(reviewIds, allWords)
      expect(result.length).toBe(2)
      expect(result[0].id).toBe('w-cat')
      expect(result[1].id).toBe('w-water')
    })
    it('getReviewWords 去重', () => {
      const reviewIds = ['w-cat', 'w-cat', 'w-dog']
      const result = getReviewWords(reviewIds, allWords)
      expect(result.length).toBe(2)
    })
    it('getReviewWords 空 ids 返 []', () => {
      expect(getReviewWords([], allWords)).toEqual([])
    })
    it('getReviewWords 忽略不存在的 id', () => {
      const result = getReviewWords(['w-not-exists', 'w-dog'], allWords)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('w-dog')
    })
  })

  describe('buildItem 复习模式', () => {
    it('reviewMode=true 时从 reviewPool 选', () => {
      const used = new Set<string>()
      const seen = new Set<string>()
      const reviewPool = [shortWords[0], shortWords[1]]  // cat, dog
      for (let seed = 1; seed <= 10; seed++) {
        const it = buildItem(allWords, 'easy', used, seed, true, reviewPool)
        if (it) {
          expect(['w-cat', 'w-dog']).toContain(it.sourceWord!.id)
          seen.add(it.sourceWord!.id)
        }
      }
    })
    it('reviewMode=true 但 pool 空, 用 allWords', () => {
      const used = new Set<string>()
      const it = buildItem(allWords, 'easy', used, 1, true, [])
      expect(it).not.toBeNull()
      // 来自 allWords
      expect(it!.sourceWord).toBeDefined()
    })
  })
})
