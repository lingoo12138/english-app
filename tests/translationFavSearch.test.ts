// translationFavSearch.test.ts - 释义收藏 跨词 搜索 测试 (W98)
import { describe, it, expect } from 'vitest'
import { searchAllWords, countSearchMatches } from '../src/lib/translationFavSearch'
import type { Word } from '../src/types'
import type { TranslationFav } from '../src/lib/db'

const fakeWords: Word[] = [
  { id: 'phone', word: 'phone', translations: ['电话', '打电话'], pos: ['n', 'v'], roots: [{ root: 'phone', meaning: '声音' }], tags: [], level: 'cet4', difficulty: 2, frequency: 100, examples: [{ en: 'I called you on the phone.', zh: '我打电话给你。' }] },
  { id: 'telegraph', word: 'telegraph', translations: ['电报'], pos: ['n'], roots: [{ root: 'tele', meaning: '远' }], tags: [], level: 'cet6', difficulty: 4, frequency: 50, examples: [] },
  { id: 'photo', word: 'photo', translations: ['照片'], pos: ['n'], roots: [{ root: 'photo', meaning: '光' }], tags: [], level: 'junior', difficulty: 1, frequency: 80, examples: [{ en: 'I took a photo.', zh: '我拍了一张照片。' }] },
  { id: 'symphony', word: 'symphony', translations: ['交响乐'], pos: ['n'], roots: [{ root: 'sym', meaning: '共同' }], tags: [], level: 'senior', difficulty: 5, frequency: 20, examples: [] },
  { id: 'phonics', word: 'phonics', translations: ['语音学'], pos: ['n'], roots: [{ root: 'phone', meaning: '声音' }], tags: [], level: 'senior', difficulty: 4, frequency: 10, examples: [] },
  { id: 'book', word: 'book', translations: ['书', '预订'], pos: ['n', 'v'], roots: [], tags: [], level: 'primary', difficulty: 1, frequency: 200, examples: [] },
]

const fakeFavs: TranslationFav[] = [
  { wordId: 'phone', index: 0, text: '电话', addedAt: 100 },
  { wordId: 'phone', index: 1, text: '打电话', addedAt: 200 },
  { wordId: 'book', index: 0, text: '书', addedAt: 300 },
]

describe('W98 释义收藏 跨词 搜索', () => {
  it('空 query → 空 数组', () => {
    expect(searchAllWords(fakeWords, fakeFavs, '')).toEqual([])
    expect(searchAllWords(fakeWords, fakeFavs, '   ')).toEqual([])
  })

  it('按 词名 搜 (word)', () => {
    const r = searchAllWords(fakeWords, fakeFavs, 'phone')
    expect(r.length).toBe(2)  // phone + phonics
    expect(r.map(x => x.word.id).sort()).toEqual(['phone', 'phonics'])
  })

  it('按 词根 搜 (root)', () => {
    const r = searchAllWords(fakeWords, fakeFavs, 'sym')
    expect(r.length).toBe(1)
    expect(r[0].word.id).toBe('symphony')
  })

  it('按 释义 搜 (translations)', () => {
    const r = searchAllWords(fakeWords, fakeFavs, '电话')
    expect(r.length).toBe(1)
    expect(r[0].word.id).toBe('phone')
  })

  it('按 例句 搜 (examples)', () => {
    const r = searchAllWords(fakeWords, fakeFavs, 'photo')
    // photo 词名 + photo 例句 "took a photo" - 但 这里 测 "called you" 命 phone 例句
    // 'called' → phone 例句
    const r2 = searchAllWords(fakeWords, fakeFavs, 'called')
    expect(r2.length).toBe(1)
    expect(r2[0].word.id).toBe('phone')
  })

  it('大小写 不 敏感', () => {
    const r1 = searchAllWords(fakeWords, fakeFavs, 'PHONE')
    const r2 = searchAllWords(fakeWords, fakeFavs, 'phone')
    expect(r1.length).toBe(r2.length)
  })

  it('matchedFavs 是 该词 收藏的 释义', () => {
    const r = searchAllWords(fakeWords, fakeFavs, 'phone')
    const phone = r.find(x => x.word.id === 'phone')!
    expect(phone.matchedFavs.length).toBe(2)
    expect(phone.favCount).toBe(2)
  })

  it('收藏数 降序 排序', () => {
    const r = searchAllWords(fakeWords, fakeFavs, 'p')  // phone/photo/phonics/symphony
    expect(r[0].word.id).toBe('phone')  // 2 favs 优先
    expect(r[1].favCount).toBe(0)
  })

  it('limit 默认 50', () => {
    const big = Array.from({ length: 100 }, (_, i) => ({
      id: `word${i}`, word: `word${i}`, translations: ['x'], pos: ['n'], roots: [], tags: [], level: 'daily', difficulty: 1, frequency: 1, examples: []
    } as Word))
    const r = searchAllWords(big, [], 'word')
    expect(r.length).toBe(50)
  })

  it('countSearchMatches: 总数', () => {
    expect(countSearchMatches(fakeWords, 'phone')).toBe(2)  // phone + phonics
    expect(countSearchMatches(fakeWords, '')).toBe(0)
    expect(countSearchMatches(fakeWords, 'x')).toBe(0)
  })
})
