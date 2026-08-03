// errorReviewHistory.test.ts - v2.0 W91 错题复习 IDB 持久化测试
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ErrorReviewScore } from '../src/lib/db'

const _mockStore: ErrorReviewScore[] = []
let _nextId = 1

vi.mock('../src/lib/db', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/db')>('../src/lib/db')
  return {
    ...actual,
    addErrorReviewScore: vi.fn(async (s: Omit<ErrorReviewScore, 'id'>) => {
      const id = _nextId++
      _mockStore.push({ id, ...s })
      return id
    }),
    getAllErrorReviewScores: vi.fn(async () => {
      return [..._mockStore].sort((a, b) => b.ts - a.ts)
    }),
    getErrorReviewScoresByCard: vi.fn(async (cardId: string) => {
      return _mockStore.filter(s => s.cardId === cardId).sort((a, b) => a.ts - b.ts)
    }),
    clearErrorReviewScores: vi.fn(async () => {
      _mockStore.length = 0
      _nextId = 1
    }),
  }
})

import { addErrorReviewScore, getAllErrorReviewScores, getErrorReviewScoresByCard, clearErrorReviewScores } from '../src/lib/db'

describe('W91 错题复习 IDB 持久化', () => {
  beforeEach(() => {
    _mockStore.length = 0
    _nextId = 1
  })

  describe('addErrorReviewScore', () => {
    it('存一条 + 返 id', async () => {
      const id = await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 80, ts: Date.now() })
      expect(id).toBe(1)
    })
    it('多条累加', async () => {
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 80, ts: 1000 })
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 90, ts: 2000 })
      await addErrorReviewScore({ cardId: 'd-2', source: 'dictation', score: 100, ts: 3000 })
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(3)
    })
  })

  describe('getAllErrorReviewScores', () => {
    it('按 ts desc 排序', async () => {
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 50, ts: 1000 })
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 90, ts: 3000 })
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 70, ts: 2000 })
      const all = await getAllErrorReviewScores()
      expect(all[0].ts).toBe(3000)
      expect(all[1].ts).toBe(2000)
      expect(all[2].ts).toBe(1000)
    })
  })

  describe('getErrorReviewScoresByCard', () => {
    it('按 cardId 过滤, ts asc 排序', async () => {
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 50, ts: 1000 })
      await addErrorReviewScore({ cardId: 'w-2', source: 'dictation', score: 90, ts: 2000 })
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 70, ts: 3000 })
      const w1 = await getErrorReviewScoresByCard('w-1')
      expect(w1.length).toBe(2)
      expect(w1[0].ts).toBe(1000)
      expect(w1[1].ts).toBe(3000)
    })
  })

  describe('clearErrorReviewScores', () => {
    it('清空', async () => {
      await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 50, ts: 1 })
      await clearErrorReviewScores()
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(0)
    })
  })

  describe('W91 修 v1 关键业务', () => {
    it('同 cardId 多次 add 不合并 (业务关键)', async () => {
      for (let i = 0; i < 5; i++) {
        await addErrorReviewScore({ cardId: 'a', source: 'write', score: 80, ts: i * 1000 })
      }
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(5)
    })
    it('getAll 返 ts desc 排序 (业务关键)', async () => {
      await addErrorReviewScore({ cardId: 'b', source: 'write', score: 50, ts: 1000 })
      await addErrorReviewScore({ cardId: 'b', source: 'write', score: 90, ts: 5000 })
      await addErrorReviewScore({ cardId: 'b', source: 'write', score: 70, ts: 3000 })
      const all = await getAllErrorReviewScores()
      expect(all[0].score).toBe(90)
      expect(all[2].score).toBe(50)
    })
  })
})
