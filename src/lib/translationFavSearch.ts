// src/lib/translationFavSearch.ts - 释义收藏 跨词 搜索 (W98)
// 业务: 从 全词库 搜 词, 显示 收藏 翻译 + 收藏状态
import type { Word } from '../types'
import type { TranslationFav } from './db'

export interface CrossWordSearchResult {
  word: Word
  matchedFavs: TranslationFav[]  // 该词 收藏的释义
  favCount: number
}

function wordMatchesQuery(w: Word, q: string): boolean {
  if ((w.word || '').toLowerCase().includes(q)) return true
  if ((w.id || '').toLowerCase().includes(q)) return true
  if ((w.roots || []).some(r => (r.root || '').toLowerCase().includes(q))) return true
  if ((w.translations || []).some(t => (t || '').toLowerCase().includes(q))) return true
  if ((w.examples || []).some(e => (e.en || '').toLowerCase().includes(q))) return true
  return false
}

/** 跨词 搜索: 词名 / 释义文本 / 词根 包含 query 的 词 */
export function searchAllWords(
  words: Word[],
  favs: TranslationFav[],
  query: string,
  limit: number = 50
): CrossWordSearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  const favMap = new Map<string, TranslationFav[]>()
  for (const f of favs) {
    if (!favMap.has(f.wordId)) favMap.set(f.wordId, [])
    favMap.get(f.wordId)!.push(f)
  }
  const results: CrossWordSearchResult[] = []
  for (const w of words) {
    if (wordMatchesQuery(w, q)) {
      const wfavs = favMap.get(w.id) || []
      results.push({ word: w, matchedFavs: wfavs, favCount: wfavs.length })
    }
  }
  // 排序: 收藏数 降序, 然后 词名 字典序
  results.sort((a, b) => {
    if (b.favCount !== a.favCount) return b.favCount - a.favCount
    return a.word.word.localeCompare(b.word.word)
  })
  return results.slice(0, limit)
}

/** 统计 跨词 搜索 命中数 (用于 UI 显示) */
export function countSearchMatches(words: Word[], query: string): number {
  if (!query.trim()) return 0
  const q = query.toLowerCase().trim()
  let count = 0
  for (const w of words) {
    if (wordMatchesQuery(w, q)) count++
  }
  return count
}
