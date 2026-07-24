// tests/listeningRecommend.test.ts - v1.7.0 B 听力自适应
// 8 单元测试覆盖 extractLessonKeywords / calculateLessonScore / recommendLessons
import { describe, it, expect } from 'vitest'
import { LISTENING_LESSONS, type ListeningLesson } from '../src/data/listening'
import {
  extractLessonKeywords,
  calculateLessonScore,
  recommendLessons,
} from '../src/lib/listeningRecommend'
import type { WritingError } from '../src/lib/errorReview'

// 构造 WritingError helper
function we(errors: Array<{ suggestion: string }>): WritingError {
  return {
    source: 'write',
    original: '',
    corrected: '',
    errors: errors.map(e => ({
      original: 'x',
      suggestion: e.suggestion,
      type: 'vocab',
      explanation: '',
      severity: 0.5,
    })),
    ts: 0,
  }
}

// 简化版的课 (测试可控)
function makeLesson(overrides: Partial<ListeningLesson>): ListeningLesson {
  return {
    id: 'test-lesson',
    title: 'Test',
    scene: 'cafe',
    level: 'A2',
    text: 'hello world',
    blanks: [],
    vocabulary: [],
    questions: [],
    ...overrides,
  }
}

describe('listeningRecommend', () => {
  describe('extractLessonKeywords', () => {
    it('应包含 vocabulary + blanks 答案', () => {
      const lesson = makeLesson({
        vocabulary: [
          { word: 'cappuccino', meaning: '咖啡' },
          { word: 'oat milk', meaning: '燕麦奶' },
        ],
        blanks: [
          { index: 1, answer: 'gluten-free' },
          { index: 2, answer: 'passport' },
        ],
      })
      const keywords = extractLessonKeywords(lesson)
      expect(keywords.has('cappuccino')).toBe(true)
      expect(keywords.has('oat milk')).toBe(true)
      expect(keywords.has('gluten-free')).toBe(true)
      expect(keywords.has('passport')).toBe(true)
      // 大小写归一化
      expect(keywords.has('CAPPUCCINO')).toBe(false)  // 因为存的是小写
      expect(keywords.size).toBe(4)
    })

    it('空课应返回空 Set', () => {
      const lesson = makeLesson({})
      expect(extractLessonKeywords(lesson).size).toBe(0)
    })
  })

  describe('calculateLessonScore', () => {
    it('命中 0 词 → score 0 + matchedWords 空', () => {
      const lesson = makeLesson({
        vocabulary: [{ word: 'apple', meaning: '苹果' }],
        blanks: [{ index: 1, answer: 'banana' }],
      })
      const errorWords = new Set(['cat', 'dog'])
      const result = calculateLessonScore(lesson, errorWords)
      expect(result.score).toBe(0)
      expect(result.matchedWords).toEqual([])
    })

    it('命中 3 词 → score 3 + matchedWords 3 个', () => {
      const lesson = makeLesson({
        vocabulary: [
          { word: 'apple', meaning: '苹果' },
          { word: 'banana', meaning: '香蕉' },
        ],
        blanks: [{ index: 1, answer: 'cherry' }],
      })
      const errorWords = new Set(['apple', 'BANANA', 'cherry', 'dog'])  // 1 个不命中
      const result = calculateLessonScore(lesson, errorWords)
      expect(result.score).toBe(3)
      expect(result.matchedWords).toHaveLength(3)
      expect(result.matchedWords).toContain('apple')
      expect(result.matchedWords).toContain('BANANA')  // 保留原 case
      expect(result.matchedWords).toContain('cherry')
    })
  })

  describe('recommendLessons', () => {
    it('错词为空 (WritingError[] 空) → 返回空数组', () => {
      const result = recommendLessons(LISTENING_LESSONS, [], new Set(), 3)
      expect(result).toEqual([])
    })

    it('WritingError 有但提取不到错词 → 返回空', () => {
      // errors 全是空 / 标点 / 1 字符
      const errors = [we([{ suggestion: 'a' }, { suggestion: '.' }, { suggestion: '中文' }])]
      const result = recommendLessons(LISTENING_LESSONS, errors, new Set(), 3)
      expect(result).toEqual([])
    })

    it('按 score 降序排', () => {
      // cafe lesson 命中 'cappuccino', 'receipt' (2 个)
      // airport lesson 命中 'passport' (1 个)
      // hotel lesson 命中 0
      // shopping lesson 命中 'return' (1 个)
      // work lesson 命中 0
      const errors = [we([{ suggestion: 'cappuccino' }, { suggestion: 'receipt' }, { suggestion: 'passport' }, { suggestion: 'return' }])]
      const result = recommendLessons(LISTENING_LESSONS, errors, new Set(), 5)
      expect(result.length).toBeGreaterThanOrEqual(2)
      // 第一名应是 cafe (score 2)
      expect(result[0].lesson.id).toBe('cafe-order-001')
      // 后续降序
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score)
      }
    })

    it('已完成课降权到 0.3 倍', () => {
      // cafe 命中 2 个错词 (cappuccino, receipt)
      // 注意: 'gluten-free' 去除 dash 变 'glutenfree', 不匹配 keyword 'gluten-free' (extractErrorWords v1.1-D1 行为)
      const errors = [we([{ suggestion: 'cappuccino' }, { suggestion: 'receipt' }, { suggestion: 'gluten-free' }])]
      const result = recommendLessons(
        LISTENING_LESSONS,
        errors,
        new Set(['cafe-order-001']),  // cafe 标记为已完成
        5,
      )
      const cafeRec = result.find(r => r.lesson.id === 'cafe-order-001')
      expect(cafeRec).toBeDefined()
      expect(cafeRec!.isCompleted).toBe(true)
      expect(cafeRec!.score).toBeCloseTo(0.6, 5)  // 2 * 0.3 (实际命中 2 个)
    })

    it('只返回 score > 0 的课', () => {
      // hotel 命中 reservation (score 1)
      // 但不命中 work 的任何词
      const errors = [we([{ suggestion: 'reservation' }, { suggestion: 'elevator' }])]
      const result = recommendLessons(LISTENING_LESSONS, errors, new Set(), 5)
      // work-meeting-005 不在 result 里 (score 0)
      expect(result.find(r => r.lesson.id === 'work-meeting-005')).toBeUndefined()
      // 所有返回项 score > 0
      result.forEach(r => expect(r.score).toBeGreaterThan(0))
    })

    it('Top 3 截断', () => {
      // 制造多课都命中, 验证只返回 3 个
      const errors = [
        we([
          { suggestion: 'cappuccino' },   // cafe
          { suggestion: 'receipt' },       // cafe
          { suggestion: 'gluten-free' },   // cafe
          { suggestion: 'oat milk' },      // cafe
          { suggestion: 'passport' },      // airport
          { suggestion: 'window' },        // airport
          { suggestion: 'reservation' },   // hotel
          { suggestion: 'elevator' },      // hotel
          { suggestion: 'return' },        // shopping
        ]),
      ]
      const result = recommendLessons(LISTENING_LESSONS, errors, new Set(), 3)
      expect(result.length).toBe(3)
    })

    it('Top 3 截断: topN=2 时只返 2', () => {
      const errors = [
        we([
          { suggestion: 'cappuccino' },
          { suggestion: 'passport' },
          { suggestion: 'reservation' },
          { suggestion: 'return' },
        ]),
      ]
      const result = recommendLessons(LISTENING_LESSONS, errors, new Set(), 2)
      expect(result.length).toBe(2)
    })
  })
})
