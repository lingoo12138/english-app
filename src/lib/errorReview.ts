// errorReview.ts - v1.1-D1 错题自动入复习
// 核心理念: 错过的词自动加入 Anki 复习队列, 跟 favorites 复用
// 数据流: writingErrors (write+chat) → extractErrorWords → addErrorWordsToFavorites → /cards 复习
import { addFavorite, isFavorite, getAllWritingErrors } from './db'
import { loadWords } from './words'
import type { WritingError } from './db'

/**
 * 从错题里提取要复习的词 (取 suggestion 字段, 标点剥离)
 */
export function extractErrorWords(we: WritingError | WritingError[]): string[] {
  const arr = Array.isArray(we) ? we : [we]
  const out: string[] = []
  for (const w of arr) {
    for (const e of w.errors) {
      const word = e.suggestion
        .replace(/[.,!?;:'"()\[\]{}—–-]/g, '')  // 标点
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .split(/\s+/)[0]  // 取第一个词
      if (word && word.length >= 2 && /^[a-z]+$/.test(word)) {
        out.push(word)
      }
    }
  }
  // 去重
  return Array.from(new Set(out))
}

/**
 * 查词库匹配 (缓存)
 */
let wordCache: Map<string, string> | null = null
async function getWordMap(): Promise<Map<string, string>> {
  if (wordCache) return wordCache
  const words = await loadWords()
  wordCache = new Map()
  for (const w of words) {
    wordCache.set(w.word.toLowerCase(), w.id)
  }
  return wordCache
}

/**
 * 把错题里的词加入生词本 (跳过已存在, 跳过查不到的)
 * @returns 加入的 wordId 列表
 */
export async function addErrorWordsToFavorites(we: WritingError | WritingError[]): Promise<string[]> {
  const words = extractErrorWords(we)
  if (words.length === 0) return []
  const map = await getWordMap()
  const added: string[] = []
  for (const w of words) {
    const wordId = map.get(w)
    if (!wordId) continue  // 词库里没找到, 跳过
    const already = await isFavorite(wordId)
    if (already) continue  // 已在生词本, 跳过
    await addFavorite(wordId)
    added.push(wordId)
  }
  return added
}

/**
 * 清除 word 缓存 (测试用)
 */
export function clearWordCache(): void {
  wordCache = null
}

/**
 * 统计待复习错词数 (所有错题里出现过的 word, 跟 favorites 交集)
 * 注: 简单做 — favorites 总数即为待复习数 (跟现有 /cards 逻辑保持一致)
 */
export async function getErrorWordsCount(): Promise<number> {
  // 写过的错题里的词, 加入了多少 favorites
  const allErrors = await getAllWritingErrors()
  if (allErrors.length === 0) return 0
  const words = extractErrorWords(allErrors)
  if (words.length === 0) return 0
  const map = await getWordMap()
  let count = 0
  for (const w of words) {
    const wordId = map.get(w)
    if (wordId && await isFavorite(wordId)) {
      count++
    }
  }
  return count
}

/**
 * 错题里的所有 unique 词 (不限是否在词库)
 */
export async function getAllErrorWords(): Promise<string[]> {
  const allErrors = await getAllWritingErrors()
  return extractErrorWords(allErrors)
}
