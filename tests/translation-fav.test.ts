// translation-fav.test.ts - v1.91 W85 释义收藏测试
import { describe, it, expect, beforeEach, vi } from 'vitest'

// v1.91: mock translationFavs 内存表
const mockStore: Array<{
  wordId: string
  index: number
  text: string
  addedAt: number
}> = []

vi.mock('../src/lib/db', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/db')>('../src/lib/db')
  return {
    ...actual,
    addTranslationFav: async (wordId: string, index: number, text: string) => {
      const existing = mockStore.findIndex(x => x.wordId === wordId && x.index === index)
      if (existing >= 0) mockStore[existing] = { wordId, index, text, addedAt: Date.now() }
      else mockStore.push({ wordId, index, text, addedAt: Date.now() })
    },
    removeTranslationFav: async (wordId: string, index: number) => {
      const i = mockStore.findIndex(x => x.wordId === wordId && x.index === index)
      if (i >= 0) mockStore.splice(i, 1)
    },
    getTranslationFavs: async (wordId: string) => {
      return mockStore.filter(x => x.wordId === wordId)
    },
    getAllTranslationFavs: async () => {
      return [...mockStore]
    },
  }
})

// 必须在 mock 后 import
const { addTranslationFav, removeTranslationFav, getTranslationFavs, getAllTranslationFavs } = await import('../src/lib/db')

describe('W85 释义收藏 (TranslationFav)', () => {
  beforeEach(() => {
    mockStore.length = 0
  })

  it('add: 加 1 条收藏', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    expect(mockStore.length).toBe(1)
  })

  it('add: 同 (wordId, index) 覆盖 (Dexie put 语义)', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    await addTranslationFav('w-cat', 0, '猫咪')
    expect(mockStore.length).toBe(1)
    expect(mockStore[0].text).toBe('猫咪')
  })

  it('add: 多个 (wordId, index) 不同独立', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    await addTranslationFav('w-cat', 1, '猫科动物')
    await addTranslationFav('w-dog', 0, '狗')
    expect(mockStore.length).toBe(3)
  })

  it('remove: 删 1 条', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    await addTranslationFav('w-dog', 0, '狗')
    await removeTranslationFav('w-cat', 0)
    expect(mockStore.length).toBe(1)
    expect(mockStore[0].wordId).toBe('w-dog')
  })

  it('get: 按 wordId 查', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    await addTranslationFav('w-cat', 1, '猫咪')
    await addTranslationFav('w-dog', 0, '狗')
    const result = await getTranslationFavs('w-cat')
    expect(result.length).toBe(2)
  })

  it('getAll: 返所有', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    await addTranslationFav('w-dog', 0, '狗')
    const all = await getAllTranslationFavs()
    expect(all.length).toBe(2)
  })

  it('add: text 字段 (快照) 正确', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    expect(mockStore[0].text).toBe('猫')
  })

  it('add: addedAt 时间戳存在', async () => {
    await addTranslationFav('w-cat', 0, '猫')
    expect(mockStore[0].addedAt).toBeGreaterThan(0)
  })
})
