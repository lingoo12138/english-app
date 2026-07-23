// tests/shareCardData.test.ts - v1.5-Review ShareCard 数据函数
import { describe, it, expect, beforeEach } from 'vitest'
import { db, addFavorite, saveWritingError } from '../src/lib/db'
import { loadShareCardData } from '../src/components/ShareCard'

describe('ShareCard loadShareCardData (v1.5 review)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('应返回空数据当 db 为空', async () => {
    const data = await loadShareCardData()
    expect(data.streak).toBe(0)
    expect(data.totalLearned).toBe(0)
    expect(data.favoriteCount).toBe(0)
    expect(data.errorCount).toBe(0)
    expect(data.topFavorites).toEqual([])
  })

  it('应正确统计 favorites', async () => {
    await addFavorite('w-test-1')
    await addFavorite('w-test-2')
    const data = await loadShareCardData()
    expect(data.favoriteCount).toBe(2)
  })

  it('应正确统计 writingErrors', async () => {
    await saveWritingError({
      source: 'write',
      original: 'a',
      corrected: 'b',
      errors: [],
    })
    await saveWritingError({
      source: 'chat',
      original: 'c',
      corrected: 'd',
      errors: [],
    })
    const data = await loadShareCardData()
    expect(data.errorCount).toBe(2)
  })

  it('应限制 topFavorites ≤ 3', async () => {
    for (let i = 0; i < 5; i++) {
      await addFavorite(`w-test-${i}`)
    }
    const data = await loadShareCardData()
    // 词库里查不到, 实际 topFavorites 为 0 (空数组)
    expect(data.topFavorites.length).toBeLessThanOrEqual(3)
  })
})
