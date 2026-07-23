// db.ts 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import { db, addFavorite, isFavorite, removeFavorite, getAllFavorites, type FavoriteRecord } from '../src/lib/db'

describe('db.ts', () => {
  beforeEach(async () => {
    await db.favorites.clear()
    await db.writingErrors.clear()
  })

  describe('addFavorite / isFavorite / removeFavorite', () => {
    it('addFavorite 后 isFavorite 返回 true', async () => {
      await addFavorite('w-1')
      expect(await isFavorite('w-1')).toBe(true)
    })

    it('removeFavorite 后 isFavorite 返回 false', async () => {
      await addFavorite('w-1')
      await removeFavorite('w-1')
      expect(await isFavorite('w-1')).toBe(false)
    })

    it('getAllFavorites 返回全部', async () => {
      await addFavorite('w-1')
      await addFavorite('w-2')
      const favs = await getAllFavorites()
      expect(favs.length).toBe(2)
    })
  })

  describe('writingErrors 表', () => {
    it('saveWritingError 写入成功', async () => {
      const id = await db.writingErrors.put({
        source: 'write',
        original: 'test',
        corrected: 'test',
        errors: [],
        ts: Date.now(),
      })
      expect(id).toBeGreaterThan(0)
    })
  })
})
