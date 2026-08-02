// translationFavFilter.test.ts - v1.97 W89-C 释义收藏过滤测试
import { describe, it, expect } from 'vitest'
import {
  groupByTime,
  groupByPos,
  filterFavs,
  computeFavStats,
  exportFavsAsJson,
  type FavWithWord,
} from '../src/lib/translationFavFilter'
import type { TranslationFav } from '../src/lib/db'
import type { Word } from '../src/types'

const now = Date.now()
const ONE_DAY = 24 * 60 * 60 * 1000

const makeFav = (wordId: string, index: number, text: string, addedAt: number): TranslationFav => ({
  wordId, index, text, addedAt,
})

const makeWord = (id: string, word: string, pos: string[] = []): Word => ({
  id, word, pos, translations: [], phonetic: '', roots: [], phrases: [], examples: [],
} as any)

describe('W89-C 释义收藏过滤/分组/导出', () => {
  describe('groupByTime', () => {
    it('按时间分 4 组', () => {
      const favs: FavWithWord[] = [
        { fav: makeFav('w1', 0, 'a', now - 1 * 60 * 60 * 1000), word: null },  // 1h ago → today
        { fav: makeFav('w2', 0, 'b', now - 3 * ONE_DAY), word: null },  // 3d ago → thisWeek
        { fav: makeFav('w3', 0, 'c', now - 15 * ONE_DAY), word: null },  // 15d ago → thisMonth
        { fav: makeFav('w4', 0, 'd', now - 60 * ONE_DAY), word: null },  // 60d ago → earlier
      ]
      const g = groupByTime(favs)
      expect(g.today.length).toBe(1)
      expect(g.thisWeek.length).toBe(1)
      expect(g.thisMonth.length).toBe(1)
      expect(g.earlier.length).toBe(1)
    })
  })

  describe('groupByPos', () => {
    it('按词性分 5 组', () => {
      const favs: FavWithWord[] = [
        { fav: makeFav('w1', 0, 'a', now), word: makeWord('w1', 'apple', ['n.', 'noun']) },
        { fav: makeFav('w2', 0, 'b', now), word: makeWord('w2', 'run', ['v.', 'verb']) },
        { fav: makeFav('w3', 0, 'c', now), word: makeWord('w3', 'beautiful', ['adj.']) },
        { fav: makeFav('w4', 0, 'd', now), word: makeWord('w4', 'quickly', ['adv']) },
        { fav: makeFav('w5', 0, 'e', now), word: makeWord('w5', 'wow', ['interj']) },
      ]
      const g = groupByPos(favs)
      expect(g.noun.length).toBe(1)
      expect(g.verb.length).toBe(1)
      expect(g.adj.length).toBe(1)
      expect(g.adv.length).toBe(1)
      expect(g.other.length).toBe(1)
    })
  })

  describe('filterFavs', () => {
    const favs: FavWithWord[] = [
      { fav: makeFav('w1', 0, '苹果', now - 1 * 60 * 60 * 1000), word: makeWord('w1', 'apple', ['n.']) },
      { fav: makeFav('w2', 0, '运行', now - 3 * ONE_DAY), word: makeWord('w2', 'run') },
      { fav: makeFav('w3', 0, '美丽的', now - 15 * ONE_DAY), word: makeWord('w3', 'beautiful') },
    ]

    it('按搜索 (word 字段)', () => {
      const r = filterFavs(favs, { search: 'app' })
      expect(r.length).toBe(1)
      expect(r[0].fav.wordId).toBe('w1')
    })

    it('按搜索 (text 字段)', () => {
      const r = filterFavs(favs, { search: '运行' })
      expect(r.length).toBe(1)
    })

    it('按时间组过滤', () => {
      const r = filterFavs(favs, { timeGroups: ['today'] })
      expect(r.length).toBe(1)
    })

    it('按词性过滤', () => {
      const r = filterFavs(favs, { posKeys: ['noun'] })
      expect(r.length).toBe(1)
    })

    it('多维度组合', () => {
      const r = filterFavs(favs, { search: 'a', timeGroups: ['today', 'thisWeek'] })
      expect(r.length).toBeGreaterThan(0)
    })

    it('空 options 返全部', () => {
      const r = filterFavs(favs, {})
      expect(r.length).toBe(3)
    })
  })

  describe('computeFavStats', () => {
    it('统计 total + 时间 + unique + mostFaved', () => {
      const favs: FavWithWord[] = [
        { fav: makeFav('w1', 0, 'a', now - 1 * 60 * 60 * 1000), word: makeWord('w1', 'apple', ['n.']) },
        { fav: makeFav('w1', 1, 'b', now - 2 * ONE_DAY), word: makeWord('w1', 'apple', ['n.']) },
        { fav: makeFav('w2', 0, 'c', now - 3 * ONE_DAY), word: makeWord('w2', 'run') },
      ]
      const s = computeFavStats(favs)
      expect(s.total).toBe(3)
      expect(s.uniqueWords).toBe(2)
      expect(s.mostFaved?.word).toBe('apple')
      expect(s.mostFaved?.count).toBe(2)
      expect(s.today).toBe(1)
    })

    it('空返 0', () => {
      const s = computeFavStats([])
      expect(s.total).toBe(0)
      expect(s.uniqueWords).toBe(0)
      expect(s.mostFaved).toBe(null)
    })
  })

  describe('exportFavsAsJson', () => {
    it('JSON 格式正确', () => {
      const favs: FavWithWord[] = [
        { fav: makeFav('w1', 0, '苹果', now), word: makeWord('w1', 'apple', ['n.']) },
      ]
      const json = exportFavsAsJson(favs)
      const data = JSON.parse(json)
      expect(data.version).toBe(1)
      expect(data.count).toBe(1)
      expect(data.favs[0].word).toBe('apple')
      expect(data.favs[0].text).toBe('苹果')
      expect(data.favs[0].pos).toEqual(['n.'])
      expect(data.exportedAt).toBeTruthy()
    })

    it('空数组也返合法 JSON', () => {
      const json = exportFavsAsJson([])
      const data = JSON.parse(json)
      expect(data.count).toBe(0)
      expect(data.favs).toEqual([])
    })
  })
})
