// tests/notebookBulk.test.ts - v1.20.0 B10 生词本批量操作
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  addFavoritesToReview,
  removeFavorites,
  exportFavoritesAsCSV,
  selectAll,
  invertSelection,
  clearSelection,
} from '../src/lib/notebookBulk'
import type { Favorite } from '../src/types'

beforeEach(async () => {
  await db.favorites.clear()
  await db.reviews.clear()
})

const sampleFavorites: Favorite[] = [
  { wordId: 'apple', addedAt: 1700000000000 },
  { wordId: 'banana', addedAt: 1700000001000 },
  { wordId: 'cherry', addedAt: 1700000002000 },
  { wordId: 'dragon', addedAt: 1700000003000 },
]

describe('notebookBulk (v1.20.0-B10)', () => {
  describe('addFavoritesToReview', () => {
    it('全部入复习', async () => {
      const result = await addFavoritesToReview(sampleFavorites)
      expect(result.added).toBe(4)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('入后 IDB reviews 有数据', async () => {
      await addFavoritesToReview(sampleFavorites)
      const items = await db.reviews.toArray()
      expect(items.length).toBe(4)
    })

    it('SM-2 初始值: easeFactor=2.5, interval=0', async () => {
      await addFavoritesToReview([sampleFavorites[0]])
      const item = await db.reviews.get('apple')
      expect(item?.easeFactor).toBe(2.5)
      expect(item?.interval).toBe(0)
      expect(item?.repetitions).toBe(0)
    })

    it('幂等: 已存跳过', async () => {
      await addFavoritesToReview(sampleFavorites)
      const result = await addFavoritesToReview(sampleFavorites)
      expect(result.added).toBe(0)
      expect(result.skipped).toBe(4)
    })

    it('部分已存: 新增未存 + 跳已存', async () => {
      await addFavoritesToReview(sampleFavorites.slice(0, 2))
      const result = await addFavoritesToReview(sampleFavorites)
      expect(result.added).toBe(2)  // cherry + dragon
      expect(result.skipped).toBe(2)  // apple + banana
    })

    it('空数组: 0 0 0', async () => {
      const result = await addFavoritesToReview([])
      expect(result.added).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('nextReview 初始化为 now', async () => {
      const before = Date.now()
      await addFavoritesToReview([sampleFavorites[0]])
      const after = Date.now()
      const item = await db.reviews.get('apple')
      expect(item?.nextReview).toBeGreaterThanOrEqual(before)
      expect(item?.nextReview).toBeLessThanOrEqual(after)
    })
  })

  describe('removeFavorites', () => {
    it('批量删除', async () => {
      for (const f of sampleFavorites) {
        await db.favorites.put(f)
      }
      const result = await removeFavorites(sampleFavorites)
      expect(result.success).toBe(4)
      expect(result.failed).toBe(0)
      const remaining = await db.favorites.toArray()
      expect(remaining.length).toBe(0)
    })

    it('不存在不报错 (Dexie delete 静默成功)', async () => {
      const result = await removeFavorites(sampleFavorites)
      // Dexie 的 .delete() 对不存在的 key 不报错, 返 success=4
      expect(result.failed).toBe(0)
    })

    it('空数组', async () => {
      const result = await removeFavorites([])
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  describe('exportFavoritesAsCSV', () => {
    it('基础 CSV 格式', () => {
      const csv = exportFavoritesAsCSV(sampleFavorites)
      const lines = csv.split('\n')
      expect(lines[0]).toBe('word,translation,difficulty,addedAt')
      expect(lines.length).toBe(5)  // header + 4
    })

    it('含 wordId + 时间', () => {
      const csv = exportFavoritesAsCSV([sampleFavorites[0]])
      const lines = csv.split('\n')
      expect(lines[1]).toContain('apple')
      expect(lines[1]).toContain('2023-11-14')  // 2023-11-14T22:13:20Z (UTC)
    })

    it('lookup 传翻译 + 难度', () => {
      const lookup = (id: string) => {
        if (id === 'apple') return { translation: '苹果', difficulty: 'A1' }
        return undefined
      }
      const csv = exportFavoritesAsCSV([sampleFavorites[0]], lookup)
      expect(csv).toContain('苹果')
      expect(csv).toContain('A1')
    })

    it('逗号/引号转义', () => {
      const lookup = () => ({ translation: 'hi, "world"', difficulty: 'B1' })
      const csv = exportFavoritesAsCSV([sampleFavorites[0]], lookup)
      // 应被双引号包裹
      expect(csv).toContain('"hi, ""world"""')
    })
  })

  describe('selectAll', () => {
    it('全选返所有 wordId', () => {
      const set = selectAll(sampleFavorites)
      expect(set.size).toBe(4)
      expect(set.has('apple')).toBe(true)
      expect(set.has('dragon')).toBe(true)
    })

    it('空数组返空 Set', () => {
      expect(selectAll([]).size).toBe(0)
    })
  })

  describe('invertSelection', () => {
    it('反选', () => {
      const current = new Set(['apple', 'banana'])
      const inverted = invertSelection(current, sampleFavorites)
      expect(inverted.size).toBe(2)
      expect(inverted.has('cherry')).toBe(true)
      expect(inverted.has('dragon')).toBe(true)
      expect(inverted.has('apple')).toBe(false)
    })

    it('空选 → 全选', () => {
      const inverted = invertSelection(new Set(), sampleFavorites)
      expect(inverted.size).toBe(4)
    })

    it('全选 → 空选', () => {
      const all = new Set(['apple', 'banana', 'cherry', 'dragon'])
      const inverted = invertSelection(all, sampleFavorites)
      expect(inverted.size).toBe(0)
    })
  })

  describe('clearSelection', () => {
    it('返空 Set', () => {
      expect(clearSelection().size).toBe(0)
    })
  })
})
