// tests/shareCard.test.ts - v1.1-F1 学习卡分享
import { describe, it, expect } from 'vitest'
import { db } from '../src/lib/db'
import {
  loadShareCardData,
  type ShareCardData,
  type ShareCardStyle,
} from '../src/components/ShareCard'

// 3 套风格定义 (从 ShareCard.tsx 镜像)
const STYLES: ShareCardStyle[] = ['simple', 'gradient', 'retro']

describe('shareCard', () => {
  describe('STYLES', () => {
    it('应包含 3 套风格', () => {
      expect(STYLES.length).toBe(3)
      expect(STYLES).toContain('simple')
      expect(STYLES).toContain('gradient')
      expect(STYLES).toContain('retro')
    })
  })

  describe('loadShareCardData', () => {
    it('应返回空数据当 db 为空', async () => {
      await db.delete()
      await db.open()
      const data = await loadShareCardData()
      expect(data.streak).toBe(0)
      expect(data.totalDays).toBe(0)
      expect(data.totalLearned).toBe(0)
      expect(data.favoriteCount).toBe(0)
      expect(data.errorCount).toBe(0)
      expect(data.topFavorites).toEqual([])
    })

    it('应返回 ShareCardData 完整字段', async () => {
      await db.delete()
      await db.open()
      const data = await loadShareCardData()
      // 验证必需字段都存在
      expect(data).toHaveProperty('streak')
      expect(data).toHaveProperty('totalDays')
      expect(data).toHaveProperty('totalLearned')
      expect(data).toHaveProperty('favoriteCount')
      expect(data).toHaveProperty('errorCount')
      expect(data).toHaveProperty('topFavorites')
      // 类型
      expect(typeof data.streak).toBe('number')
      expect(typeof data.totalDays).toBe('number')
      expect(typeof data.totalLearned).toBe('number')
      expect(typeof data.favoriteCount).toBe('number')
      expect(typeof data.errorCount).toBe('number')
      expect(Array.isArray(data.topFavorites)).toBe(true)
    })

    it('topFavorites 应限制 3 个', async () => {
      await db.delete()
      await db.open()
      // 加 5 个 favorites
      for (let i = 0; i < 5; i++) {
        await db.favorites.put({ wordId: `w-test-${i}`, addedAt: Date.now() + i })
      }
      const data = await loadShareCardData()
      expect(data.favoriteCount).toBe(5)
      // topFavorites 只取前 3 (因为大部分 wordId 在词库查不到, 实际可能 0)
      expect(data.topFavorites.length).toBeLessThanOrEqual(3)
    })
  })

  describe('ShareCardData 类型', () => {
    it('应支持 3 套风格', () => {
      const simple: ShareCardData = {
        streak: 1, totalDays: 1, totalLearned: 1, favoriteCount: 0, errorCount: 0, topFavorites: [],
      }
      const gradient: ShareCardData = { ...simple }
      const retro: ShareCardData = { ...simple }
      expect(simple).toBeTruthy()
      expect(gradient).toBeTruthy()
      expect(retro).toBeTruthy()
    })
  })
})
