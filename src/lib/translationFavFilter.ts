// src/lib/translationFavFilter.ts - v1.97 W89-C 释义收藏过滤/分组/导出
import type { TranslationFav } from './db'
import type { Word } from '../types'

export type TimeGroup = 'today' | 'thisWeek' | 'thisMonth' | 'earlier'

/** 收藏 + 关联 word */
export interface FavWithWord {
  fav: TranslationFav
  word: Word | null
}

/** 按时间分组 */
export function groupByTime(favs: FavWithWord[]): Record<TimeGroup, FavWithWord[]> {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay

  const result: Record<TimeGroup, FavWithWord[]> = {
    today: [], thisWeek: [], thisMonth: [], earlier: [],
  }
  for (const fw of favs) {
    const age = now - fw.fav.addedAt
    if (age < oneDay) result.today.push(fw)
    else if (age < oneWeek) result.thisWeek.push(fw)
    else if (age < oneMonth) result.thisMonth.push(fw)
    else result.earlier.push(fw)
  }
  return result
}

/** 按 word 词性过滤 (返回 {noun, verb, adj, adv, other}) */
export function groupByPos(favs: FavWithWord[]): Record<string, FavWithWord[]> {
  const result: Record<string, FavWithWord[]> = {
    noun: [], verb: [], adj: [], adv: [], other: [],
  }
  for (const fw of favs) {
    if (!fw.word) {
      result.other.push(fw)
      continue
    }
    const pos = fw.word.pos || []
    if (pos.some(p => /^(n\.?|noun|n)$/i.test(p.trim()))) result.noun.push(fw)
    else if (pos.some(p => /^(v\.?|verb|v)$/i.test(p.trim()))) result.verb.push(fw)
    else if (pos.some(p => /^(adj\.?|adjective|a)$/i.test(p.trim()))) result.adj.push(fw)
    else if (pos.some(p => /^(adv\.?|adverb)$/i.test(p.trim()))) result.adv.push(fw)
    else result.other.push(fw)
  }
  return result
}

/** 多维度过滤 */
export interface FilterOptions {
  search?: string
  timeGroups?: TimeGroup[]
  posKeys?: string[]   // 'noun' | 'verb' | 'adj' | 'adv' | 'other'
}

export function filterFavs(
  favs: FavWithWord[],
  options: FilterOptions
): FavWithWord[] {
  let result = favs
  const { search, timeGroups, posKeys } = options

  if (search) {
    const q = search.toLowerCase()
    result = result.filter(fw => {
      if (fw.word && fw.word.word.toLowerCase().includes(q)) return true
      return fw.fav.text.toLowerCase().includes(q)
    })
  }

  if (timeGroups && timeGroups.length > 0 && timeGroups.length < 4) {
    const grouped = groupByTime(result)
    result = timeGroups.flatMap(g => grouped[g])
  }

  if (posKeys && posKeys.length > 0 && posKeys.length < 5) {
    const grouped = groupByPos(result)
    result = posKeys.flatMap(k => grouped[k] || [])
  }

  return result
}

/** 统计 */
export interface FavStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  uniqueWords: number
  mostFaved: { wordId: string; word: string; count: number } | null
}

export function computeFavStats(favs: FavWithWord[]): FavStats {
  const grouped = groupByTime(favs)
  const wordCount = new Map<string, number>()
  for (const fw of favs) {
    wordCount.set(fw.fav.wordId, (wordCount.get(fw.fav.wordId) || 0) + 1)
  }
  let mostFaved: { wordId: string; word: string; count: number } | null = null
  for (const [wordId, count] of wordCount) {
    if (!mostFaved || count > mostFaved.count) {
      const w = favs.find(fw => fw.fav.wordId === wordId)?.word
      mostFaved = { wordId, word: w?.word || wordId, count }
    }
  }
  return {
    total: favs.length,
    today: grouped.today.length,
    thisWeek: grouped.thisWeek.length,
    thisMonth: grouped.thisMonth.length,
    uniqueWords: wordCount.size,
    mostFaved,
  }
}

/** 导出 JSON */
export function exportFavsAsJson(favs: FavWithWord[]): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    count: favs.length,
    favs: favs.map(fw => ({
      wordId: fw.fav.wordId,
      word: fw.word?.word || null,
      pos: fw.word?.pos || [],
      index: fw.fav.index,
      text: fw.fav.text,
      addedAt: new Date(fw.fav.addedAt).toISOString(),
    })),
  }, null, 2)
}
