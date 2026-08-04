// src/lib/translationFavSearch.ts - 释义收藏 跨词 搜索 (W98 verifier 修 v1)
// 业务: 从 全词库 搜 词, 显示 收藏 翻译 + 收藏状态
import type { Word } from '../types'
import type { TranslationFav } from './db'

export type MatchedField = 'word' | 'root' | 'translation' | 'example' | 'phrase'

export interface CrossWordSearchResult {
  word: Word
  matchedFavs: TranslationFav[]  // 该词 收藏的释义
  favCount: number
  matchedField: MatchedField  // 哪个 字段 命中 (P2-2)
}

export interface CrossWordSearchOutput {
  results: CrossWordSearchResult[]  // 限 limit 后
  totalMatches: number  // 限 前 总数 (P1-1/P1-2)
  truncated: boolean  // 是 否 截断 (P1-2)
}

const DEFAULT_LIMIT = 50

/** 检测 单 词 是 否 命中 query, 返 命中 字段 (P1-5 删 w.id 噪声) */
function matchWord(w: Word, q: string): MatchedField | null {
  if ((w.word || '').toLowerCase().includes(q)) return 'word'
  if ((w.roots || []).some(r =>
    (r.root || '').toLowerCase().includes(q) ||
    (r.meaning || '').toLowerCase().includes(q)  // P2-6 词根 meaning
  )) return 'root'
  if ((w.translations || []).some(t => (t || '').toLowerCase().includes(q))) return 'translation'
  if ((w.examples || []).some(e =>
    (e.en || '').toLowerCase().includes(q) ||
    (e.zh || '').toLowerCase().includes(q)  // P1-6 examples.zh
  )) return 'example'
  if ((w.phrases || []).some(p =>
    (p.phrase || '').toLowerCase().includes(q) ||
    (p.translation || '').toLowerCase().includes(q)  // P1-7 phrases
  )) return 'phrase'
  return null
}

/** 跨词 搜索: 单遍 出 {results, totalMatches, truncated} (P1-1 单遍 重构) */
export function searchAllWords(
  words: Word[],
  favs: TranslationFav[],
  query: string,
  limit: number = DEFAULT_LIMIT
): CrossWordSearchOutput {
  if (!query.trim()) return { results: [], totalMatches: 0, truncated: false }
  const q = query.toLowerCase().trim()
  // favMap 一次 遍历 构 (P2-15 改 .has + .get!.push 模式)
  const favMap = new Map<string, TranslationFav[]>()
  for (const f of favs) {
    const list = favMap.get(f.wordId)
    if (list) list.push(f)
    else favMap.set(f.wordId, [f])
  }
  const allResults: CrossWordSearchResult[] = []
  for (const w of words) {
    const field = matchWord(w, q)
    if (field) {
      const wfavs = favMap.get(w.id) || []
      allResults.push({ word: w, matchedFavs: wfavs, favCount: wfavs.length, matchedField: field })
    }
  }
  // 排序: 收藏数 降序 + 词名 字典序 (P2-5 兜底)
  allResults.sort((a, b) => {
    if (b.favCount !== a.favCount) return b.favCount - a.favCount
    return (a.word.word || '').localeCompare(b.word.word || '')
  })
  const totalMatches = allResults.length
  const results = allResults.slice(0, limit)
  return { results, totalMatches, truncated: totalMatches > limit }
}

/** 统计 总 命中 (UI 备 用, 实际 推荐 用 searchAllWords.totalMatches) */
export function countSearchMatches(words: Word[], query: string): number {
  if (!query.trim()) return 0
  const q = query.toLowerCase().trim()
  let count = 0
  for (const w of words) {
    if (matchWord(w, q)) count++
  }
  return count
}
