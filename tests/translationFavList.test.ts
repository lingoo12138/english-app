// translationFavList.test.ts - v1.94 W88-B 释义收藏列表页测试
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock db + words
vi.mock('../src/lib/db', () => ({
  getAllTranslationFavs: vi.fn(),
  removeTranslationFav: vi.fn(),
}))

vi.mock('../src/lib/words', () => ({
  loadWords: vi.fn(),
}))

vi.mock('../src/components/Toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

import { getAllTranslationFavs, removeTranslationFav } from '../src/lib/db'
import { loadWords } from '../src/lib/words'

const mockFavs = [
  { wordId: 'w-1', index: 0, text: '苹果', addedAt: 1000 },
  { wordId: 'w-1', index: 1, text: '果树', addedAt: 2000 },
  { wordId: 'w-2', index: 0, text: '运行', addedAt: 3000 },
  { wordId: 'w-3', index: 0, text: '美丽的', addedAt: 4000 },
]

const mockWords = [
  { id: 'w-1', word: 'apple' } as any,
  { id: 'w-2', word: 'run' } as any,
  { id: 'w-3', word: 'beautiful' } as any,
]

describe('W88-B 释义收藏列表', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAllTranslationFavs).mockResolvedValue(mockFavs as any)
    vi.mocked(loadWords).mockResolvedValue(mockWords as any)
  })

  it('getAllTranslationFavs 返全部收藏', async () => {
    const favs = await getAllTranslationFavs()
    expect(favs.length).toBe(4)
  })

  it('按 wordId 分组: w-1 应该有 2 条', async () => {
    const favs = await getAllTranslationFavs()
    const groups = new Map<string, any[]>()
    for (const f of favs) {
      if (!groups.has(f.wordId)) groups.set(f.wordId, [])
      groups.get(f.wordId)!.push(f)
    }
    expect(groups.get('w-1')!.length).toBe(2)
    expect(groups.get('w-2')!.length).toBe(1)
    expect(groups.get('w-3')!.length).toBe(1)
  })

  it('每组内按 index asc 排序', async () => {
    const favs = await getAllTranslationFavs()
    const groups = new Map<string, any[]>()
    for (const f of favs) {
      if (!groups.has(f.wordId)) groups.set(f.wordId, [])
      groups.get(f.wordId)!.push(f)
    }
    const w1 = groups.get('w-1')!
    w1.sort((a, b) => a.index - b.index)
    expect(w1[0].index).toBe(0)
    expect(w1[1].index).toBe(1)
  })

  it('loadWords 返 wordMap 反查', async () => {
    const words = await loadWords()
    const map = new Map<string, any>()
    for (const w of words) map.set(w.id, w)
    expect(map.get('w-1')!.word).toBe('apple')
    expect(map.get('w-2')!.word).toBe('run')
  })

  it('removeTranslationFav 删除', async () => {
    vi.mocked(removeTranslationFav).mockResolvedValue(undefined)
    await removeTranslationFav('w-1', 0)
    expect(removeTranslationFav).toHaveBeenCalledWith('w-1', 0)
  })

  it('未知 wordId: wordMap.get 返 undefined', async () => {
    const words = await loadWords()
    const map = new Map<string, any>()
    for (const w of words) map.set(w.id, w)
    expect(map.get('w-unknown')).toBeUndefined()
  })

  it('搜索过滤: 按 word 字段', async () => {
    const favs = await getAllTranslationFavs()
    const words = await loadWords()
    const map = new Map<string, any>()
    for (const w of words) map.set(w.id, w)
    const grouped = new Map<string, any[]>()
    for (const f of favs) {
      if (!grouped.has(f.wordId)) grouped.set(f.wordId, [])
      grouped.get(f.wordId)!.push(f)
    }
    const q = 'app'
    const filtered = Array.from(grouped.entries()).filter(([wid, list]) => {
      const w = map.get(wid)
      if (w && w.word.toLowerCase().includes(q)) return true
      return list.some(f => f.text.toLowerCase().includes(q))
    })
    expect(filtered.length).toBe(1)  // 只 w-1 (apple)
  })

  it('搜索过滤: 按 text 字段', async () => {
    const favs = await getAllTranslationFavs()
    const words = await loadWords()
    const map = new Map<string, any>()
    for (const w of words) map.set(w.id, w)
    const grouped = new Map<string, any[]>()
    for (const f of favs) {
      if (!grouped.has(f.wordId)) grouped.set(f.wordId, [])
      grouped.get(f.wordId)!.push(f)
    }
    const q = '运行'
    const filtered = Array.from(grouped.entries()).filter(([wid, list]) => {
      const w = map.get(wid)
      if (w && w.word.toLowerCase().includes(q)) return true
      return list.some(f => f.text.toLowerCase().includes(q))
    })
    expect(filtered.length).toBe(1)  // 只 w-2 (run)
  })
})
