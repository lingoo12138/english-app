// 加载词库 — W145 LCP 优化
// 历史: v0.1 - v2.1.25 一直全量 fetch words.json (6.3MB), LCP 卡 6.7s
// W145: 拆 chunk + 按需加载
//  - words-index.json: 轻量级 metadata (~430KB), 含 id/word/level/first_letter/first_translation
//  - words-{a..z}.json: 按字母 25 个 chunks (平均 196KB)
//  - getWord(id): 通过 id 推 first_letter → fetch 1 chunk → 找 word
//  - loadWords(): 全量加载 (后置, 用于 dataExport/aiPlanGenerator 大导出)
//
// 性能:
//  - DailyWordCard: 1 fetch ~196KB (单 chunk) vs 6.3MB → LCP 6.7s → 期望 ≤2s
//  - WordList virtual 模式: 1-2 chunk 取决于 visible letter
//  - WordDetail: 1 fetch 196KB
//  - Search: 走 index (430KB) client-side filter
//  - Export/Plan: 全量 loadWords() 后置触发
import type { Word } from '../types'

// 修复: 跟随 vite base path(部署到子路径如 GitHub Pages 时也要对)
const BASE_URL = import.meta.env.BASE_URL || '/'

/** W145 轻量级 index entry (id+word+level+first_letter+first_translation) */
export interface WordIndexEntry {
  id: string
  word: string
  level: string
  first_letter: string
  first_translation: string
}

// 内存缓存
let wordsIndexCache: WordIndexEntry[] | null = null
let wordsFullCache: Word[] | null = null
const letterCache: Map<string, Word[]> = new Map()

/** W145: 加载轻量级 index (~430KB)
 *  - 用于 search / 列表显示 / getWord(id) 推 letter
 *  - 单次 fetch, 内存常驻
 *  - 失败返回 [] (兼容旧行为)
 */
export async function loadWordsIndex(): Promise<WordIndexEntry[]> {
  if (wordsIndexCache) return wordsIndexCache
  try {
    const res = await fetch(`${BASE_URL}data/words-index.json`)
    wordsIndexCache = await res.json()
    return wordsIndexCache!
  } catch (e) {
    console.error('词库 index 加载失败', e)
    return []
  }
}

/** W145: 加载单字母 chunk (~196KB)
 *  - 用于 getWord(id) / WordList virtual 模式
 *  - 内存 LRU 缓存 (简单 Map, 上限 10 chunk 避免内存爆)
 */
export async function loadWordsByLetter(letter: string): Promise<Word[]> {
  const c = (letter || '').toLowerCase()
  if (!/^[a-z]$/.test(c)) {
    console.warn(`loadWordsByLetter: 无效 letter "${letter}"`)
    return []
  }
  if (letterCache.has(c)) return letterCache.get(c)!
  try {
    const res = await fetch(`${BASE_URL}data/words-${c}.json`)
    const words: Word[] = await res.json()
    // 简单 LRU: 上限 10 chunk (~2MB)
    if (letterCache.size >= 10) {
      const firstKey = letterCache.keys().next().value
      if (firstKey) letterCache.delete(firstKey)
    }
    letterCache.set(c, words)
    return words
  } catch (e) {
    console.error(`词库 chunk ${c} 加载失败`, e)
    return []
  }
}

/** W145: 按 id 推 letter → fetch 1 chunk → 找 word
 *  - 优先用 index 推 letter (避免逐 chunk 试)
 *  - 失败回退 loadWords (全量) — 兼容旧 chunk 缺失
 */
export async function getWord(id: string): Promise<Word | undefined> {
  // 1. 尝试用 index 推 first_letter
  const index = await loadWordsIndex()
  const idx = index.find(e => e.id === id)
  if (idx && idx.first_letter) {
    const chunk = await loadWordsByLetter(idx.first_letter)
    const w = chunk.find(w => w.id === id)
    if (w) return w
  }
  // 2. fallback: 全量加载 (chunk 找不到时)
  const all = await loadWords()
  return all.find(w => w.id === id)
}

/** W145: 全量加载 — 仅用于大导出 (dataExport / aiPlanGenerator / errorReview 全量)
 *  - 6.3MB JSON 解析, 后置触发, 不影响 LCP
 *  - 全局只加载一次 (缓存)
 */
export async function loadWords(): Promise<Word[]> {
  if (wordsFullCache) return wordsFullCache
  try {
    const res = await fetch(`${BASE_URL}data/words.json`)
    wordsFullCache = await res.json()
    return wordsFullCache!
  } catch (e) {
    console.error('词库加载失败', e)
    return []
  }
}

/** W145: 搜索 — 走 index (430KB client-side filter)
 *  - 性能: 5423 行 Array.filter 一次性 ~10ms, 远快于 fetch 全量
 *  - 命中后 lazy fetch chunk 拿完整 word 详情
 */
export async function searchWords(query: string, level?: string): Promise<WordIndexEntry[]> {
  const index = await loadWordsIndex()
  const q = query.trim().toLowerCase()
  return index.filter(e => {
    const matchQ = !q || e.word.toLowerCase().includes(q) || e.first_translation.includes(q)
    const matchLevel = !level || level === 'all' || e.level === level
    return matchQ && matchLevel
  })
}

/** W145: 同步版 (legacy) — 已废弃, 保留 stub 返回 []
 *  - 原因: W145 之后所有 loadWords 改 async, 同步版无意义
 *  - 兼容: 旧代码 import 但不 await, 会被 vitest 提示 lint
 *  - 实际: 搜索任何同步用法 (e.g. in render) 应改为 useEffect + state
 */
export function loadWordsSync(): Word[] {
  console.warn('[W145] loadWordsSync 已废弃, 请改用 async loadWords() / loadWordsIndex() / loadWordsByLetter()')
  return wordsFullCache || []
}

// 等级元数据 (W145 不动)
export const LEVELS = [
  { value: 'all', label: '全部', color: 'bg-stone-500' },
  { value: 'primary', label: '小学', color: 'bg-pink-500' },
  { value: 'junior', label: '初中', color: 'bg-orange-500' },
  { value: 'senior', label: '高中', color: 'bg-amber-500' },
  { value: 'gaozhong', label: '高考', color: 'bg-amber-600' },
  { value: 'cet4', label: 'CET-4', color: 'bg-sky-500' },
  { value: 'cet6', label: 'CET-6', color: 'bg-blue-500' },
  { value: 'kaoyan', label: '考研', color: 'bg-indigo-500' },
  { value: 'daily', label: '日常', color: 'bg-emerald-500' },
] as const

/** W145: 清空所有缓存 (测试用) */
export function _clearWordsCache(): void {
  wordsIndexCache = null
  wordsFullCache = null
  letterCache.clear()
}

/** W145: 缓存状态 (测试用) */
export function _getCacheStats(): { index: boolean; full: boolean; letters: number } {
  return {
    index: wordsIndexCache !== null,
    full: wordsFullCache !== null,
    letters: letterCache.size,
  }
}
