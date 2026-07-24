// tests/reviewQueue.test.ts - v1.11.0-B 复习中心智能队列
import { describe, it, expect } from 'vitest'
import {
  scoreReviewItem,
  sortReviewQueue,
  isNewItem,
  toReviewQueueItem,
  type ReviewQueueItem,
} from '../src/lib/reviewQueue'

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0) // 2026-01-15 12:00 UTC
const MS_DAY = 24 * 60 * 60 * 1000

function baseItem(overrides: Partial<ReviewQueueItem>): ReviewQueueItem {
  return {
    id: 'w-1',
    due: NOW,
    ease: 2.5,
    reps: 5,
    lastReview: NOW - 3 * MS_DAY,
    isNew: false,
    ...overrides,
  }
}

describe('reviewQueue.ts', () => {
  describe('scoreReviewItem', () => {
    it('已过期 -> 高分 (>= 50)', () => {
      const item = baseItem({ due: NOW - 2 * MS_DAY }) // 2 天前过期
      const score = scoreReviewItem(item, NOW)
      expect(score).toBeGreaterThanOrEqual(50)
    })

    it('难词 (ease < 2.0) +20', () => {
      // 同样都是"一周后到期", 难词应比易词高 20 分
      const farFuture = NOW + 10 * MS_DAY
      const easyItem = baseItem({ due: farFuture, ease: 2.5, reps: 10 })
      const hardItem = baseItem({ due: farFuture, ease: 1.5, reps: 10 })
      const diff = scoreReviewItem(hardItem, NOW) - scoreReviewItem(easyItem, NOW)
      expect(diff).toBe(20)
    })

    it('新词 (reps < 3) +15', () => {
      // 同样都是"一周后到期", 新词应比熟词高 15 分
      const farFuture = NOW + 10 * MS_DAY
      const veteranItem = baseItem({ due: farFuture, ease: 2.5, reps: 10 })
      const newItem = baseItem({ due: farFuture, ease: 2.5, reps: 1 })
      const diff = scoreReviewItem(newItem, NOW) - scoreReviewItem(veteranItem, NOW)
      expect(diff).toBe(15)
    })
  })

  describe('sortReviewQueue', () => {
    it('智能模式 (smartSort=true) 按分数降序', () => {
      // 故意打乱: 一周后到期的新词 (10+15=25) 排到已过期熟词 (50) 之前是不对的
      // 我们要确保已过期的排第一
      const overdue = baseItem({ id: 'a', due: NOW - 1 * MS_DAY, ease: 2.5, reps: 10 })
      const farFuture = baseItem({ id: 'b', due: NOW + 10 * MS_DAY, ease: 2.5, reps: 1 })
      const sorted = sortReviewQueue([farFuture, overdue], NOW, { smartSort: true })
      expect(sorted[0].id).toBe('a')  // 已过期 +50 > 一周后 +15
      expect(sorted[1].id).toBe('b')
    })

    it('关闭智能模式 (smartSort=false) 按 due 时间升序', () => {
      // 即便新词分数高, 时间模式下也按 due 排: 早 due 在前
      const later = baseItem({ id: 'b', due: NOW + 5 * MS_DAY, ease: 2.5, reps: 1 })
      const earlier = baseItem({ id: 'a', due: NOW - 1 * MS_DAY, ease: 2.5, reps: 10 })
      const sorted = sortReviewQueue([later, earlier], NOW, { smartSort: false })
      expect(sorted[0].id).toBe('a')  // due 早
      expect(sorted[1].id).toBe('b')
    })
  })

  // 附赠: 一些配套 sanity 测试 (不计入 5 必需, 算 extra)
  describe('isNewItem / toReviewQueueItem (extra)', () => {
    it('isNewItem: reps < 3 返回 true', () => {
      expect(isNewItem({ reps: 0 })).toBe(true)
      expect(isNewItem({ reps: 1 })).toBe(true)
      expect(isNewItem({ reps: 2 })).toBe(true)
      expect(isNewItem({ reps: 3 })).toBe(false)
      expect(isNewItem({ reps: 10 })).toBe(false)
    })
    it('toReviewQueueItem 字段映射正确', () => {
      const r = {
        wordId: 'w-7',
        nextReview: NOW + 3 * MS_DAY,
        interval: 3,
        easeFactor: 2.3,
        repetitions: 2,
      }
      const q = toReviewQueueItem(r)
      expect(q.id).toBe('w-7')
      expect(q.due).toBe(NOW + 3 * MS_DAY)
      expect(q.ease).toBe(2.3)
      expect(q.reps).toBe(2)
      expect(q.isNew).toBe(true) // reps=2 < 3
      expect(q.lastReview).toBe(NOW + 3 * MS_DAY - 3 * MS_DAY)
    })
  })
})
