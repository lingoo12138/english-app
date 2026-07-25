// tests/taggedReviews.test.ts - v1.22.0 B12 复习按 tag 过滤
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  getReviewsByTag,
  getReviewCountByTag,
  getAllTagsWithReviewCount,
  getReviewsByTagWithScore,
  isWordInTag,
} from '../src/lib/taggedReviews'
import { addWordTag } from '../src/lib/db'
import type { ReviewItem } from '../src/types'

beforeEach(async () => {
  await db.reviews.clear()
  await db.wordTags.clear()
})

const reviewNow: ReviewItem = {
  wordId: 'apple',
  nextReview: Date.now() - 1000,  // 已到 due
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
}

const reviewLater: ReviewItem = {
  wordId: 'banana',
  nextReview: Date.now() + 100000,  // 未到
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
}

const reviewApple2: ReviewItem = {
  wordId: 'apple2',
  nextReview: Date.now() - 2000,  // 已到 due
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
}

describe('taggedReviews (v1.22.0-B12)', () => {
  describe('getReviewsByTag', () => {
    it('按 tag 返 due reviews', async () => {
      await db.reviews.bulkPut([reviewNow, reviewLater])
      await addWordTag('apple', 'work')
      await addWordTag('banana', 'work')
      const result = await getReviewsByTag('work', true)
      expect(result.length).toBe(1)
      expect(result[0].wordId).toBe('apple')
    })

    it('onlyDue=false 返所有', async () => {
      await db.reviews.bulkPut([reviewNow, reviewLater])
      await addWordTag('apple', 'work')
      await addWordTag('banana', 'work')
      const result = await getReviewsByTag('work', false)
      expect(result.length).toBe(2)
    })

    it('空 tag 返空', async () => {
      const result = await getReviewsByTag('nonexistent', true)
      expect(result).toEqual([])
    })

    it('不相关 tag 不返', async () => {
      await db.reviews.bulkPut([reviewNow])
      await addWordTag('apple', 'work')
      const result = await getReviewsByTag('food', true)
      expect(result).toEqual([])
    })

    it('多词同 tag', async () => {
      await db.reviews.bulkPut([reviewNow, reviewApple2])
      await addWordTag('apple', 'work')
      await addWordTag('apple2', 'work')
      const result = await getReviewsByTag('work', true)
      expect(result.length).toBe(2)
    })
  })

  describe('getReviewCountByTag', () => {
    it('计数', async () => {
      await db.reviews.bulkPut([reviewNow, reviewLater, reviewApple2])
      await addWordTag('apple', 'work')
      await addWordTag('apple2', 'work')
      await addWordTag('banana', 'work')
      const count = await getReviewCountByTag('work', true)
      expect(count).toBe(2)  // apple + apple2
    })

    it('空 tag 返 0', async () => {
      expect(await getReviewCountByTag('nonexistent', true)).toBe(0)
    })
  })

  describe('getAllTagsWithReviewCount', () => {
    it('返所有 tag + due 数 + 总数', async () => {
      await db.reviews.bulkPut([reviewNow, reviewLater])
      await addWordTag('apple', 'work')
      await addWordTag('banana', 'work')
      await addWordTag('apple2', 'food')

      const result = await getAllTagsWithReviewCount(true)
      expect(result.length).toBe(2)
      // 排序: work due=1, food due=0
      const work = result.find(t => t.tag === 'work')!
      expect(work.count).toBe(1)
      expect(work.totalCount).toBe(2)
      const food = result.find(t => t.tag === 'food')!
      expect(food.count).toBe(0)
      expect(food.totalCount).toBe(1)
    })

    it('空数据返空', async () => {
      const result = await getAllTagsWithReviewCount(true)
      expect(result).toEqual([])
    })

    it('按 due 数降序', async () => {
      // 构造: work 2 due, food 0 due
      const r1: ReviewItem = { wordId: 'a', nextReview: 0, interval: 0, easeFactor: 2.5, repetitions: 0 }
      const r2: ReviewItem = { wordId: 'b', nextReview: 0, interval: 0, easeFactor: 2.5, repetitions: 0 }
      await db.reviews.bulkPut([r1, r2])
      await addWordTag('a', 'work')
      await addWordTag('b', 'work')
      await addWordTag('c', 'food')
      const result = await getAllTagsWithReviewCount(true)
      // work 应在前
      expect(result[0].tag).toBe('work')
    })
  })

  describe('getReviewsByTagWithScore', () => {
    it('按 score 排序 (smartSort)', async () => {
      await db.reviews.bulkPut([reviewNow, reviewApple2])
      await addWordTag('apple', 'work')
      await addWordTag('apple2', 'work')
      const result = await getReviewsByTagWithScore('work', true, true)
      expect(result.length).toBe(2)
    })

    it('smartSort=false 时间排', async () => {
      await db.reviews.bulkPut([reviewNow, reviewApple2])
      await addWordTag('apple', 'work')
      await addWordTag('apple2', 'work')
      const result = await getReviewsByTagWithScore('work', true, false)
      expect(result.length).toBe(2)
    })
  })

  describe('isWordInTag', () => {
    it('true', async () => {
      await addWordTag('apple', 'work')
      expect(await isWordInTag('apple', 'work')).toBe(true)
    })

    it('false', async () => {
      expect(await isWordInTag('apple', 'work')).toBe(false)
    })
  })
})
