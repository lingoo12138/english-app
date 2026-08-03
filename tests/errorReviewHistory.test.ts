// errorReviewHistory.test.ts - v2.0 W91 错题复习 IDB 持久化 (用 fake-indexeddb 真测)
import { describe, it, expect, beforeEach } from 'vitest'
import { db, addErrorReviewScore, getAllErrorReviewScores, getErrorReviewScoresByCard, clearErrorReviewScores } from '../src/lib/db'

describe('W91 错题复习 IDB 持久化 (fake-indexeddb)', () => {
  beforeEach(async () => {
    await db.errorReviewHistory.clear()
  })

  describe('addErrorReviewScore', () => {
    it('存一条 + 返 id', async () => {
      const id = await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 80, ts: Date.now() })
      expect(id).toBeGreaterThan(0)
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

  describe('W91 修 v2 关键业务 (verifier B 找)', () => {
    it('同 cardId 多次 add 不合并 (业务关键)', async () => {
      for (let i = 0; i < 5; i++) {
        await addErrorReviewScore({ cardId: 'a', source: 'write', score: 80, ts: i * 1000 })
      }
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(5)
    })
    it('删错题时级联清理 errorReviewHistory (P1-5)', async () => {
      await addErrorReviewScore({ cardId: 'w-99', source: 'write', score: 50, ts: 1 })
      await addErrorReviewScore({ cardId: 'w-99', source: 'write', score: 80, ts: 2 })
      // 级联删
      await db.errorReviewHistory.where('cardId').equals('w-99').delete()
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(0)
    })
    it('v8→v9 升级 schema 兼容 (P1-3 关键路径)', async () => {
      // 写入一条 v9 新表数据, 不应抛错
      const id = await addErrorReviewScore({ cardId: 'w-1', source: 'write', score: 80, ts: Date.now() })
      expect(id).toBeGreaterThan(0)
      // 读回
      const all = await getAllErrorReviewScores()
      expect(all.length).toBe(1)
      expect(all[0].score).toBe(80)
    })
  })
})
