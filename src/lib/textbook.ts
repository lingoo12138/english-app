// 课文 (Textbook) - 业务逻辑层
// v1.85.0: 查询 + 词汇表解析 + 完成状态
import { LESSONS, type Lesson } from '../data/textbook'
import type { Word } from '../types'
import { isFavorite, addFavorite, removeFavorite, getAllFavorites } from './db'

/** 返回所有课文 */
export function getAllLessons(): Lesson[] {
  return LESSONS
}

/** 按 id 查课文, 没找到返 null */
export function getLessonById(id: string): Lesson | null {
  return LESSONS.find(l => l.id === id) || null
}

/**
 * 解析课文的 vocabulary → 真实 Word 对象
 * - 查不到 (不在 words.json) 跳过, 不阻塞渲染
 * - 保持 lesson.vocabulary 顺序
 */
export function getLessonVocabWords(lesson: Lesson, allWords: Word[]): Word[] {
  const byWord = new Map<string, Word>()
  for (const w of allWords) {
    byWord.set(w.word.toLowerCase(), w)
  }
  const out: Word[] = []
  const seen = new Set<string>()
  for (const term of lesson.vocabulary) {
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    const found = byWord.get(key)
    if (found) {
      out.push(found)
      seen.add(key)
    }
  }
  return out
}

/**
 * 检查 body 中所有出现的 vocabulary 词, 返 [start, end) 区间数组
 * - 用于 LessonDetailPage 高亮
 * - 大小写不敏感, 按出现顺序排
 * - 重叠区间跳过 (后开始的赢)
 */
export interface VocabRange {
  word: Word
  start: number
  end: number
}

export function findVocabInBody(body: string, vocab: Word[]): VocabRange[] {
  if (!body || vocab.length === 0) return []
  const ranges: VocabRange[] = []
  const lower = body.toLowerCase()
  for (const word of vocab) {
    const needle = word.word.toLowerCase()
    if (!needle) continue
    let from = 0
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from)
      if (idx < 0) break
      // 单词边界 (前后为非字母)
      const before = idx > 0 ? lower[idx - 1] : ''
      const after = idx + needle.length < lower.length ? lower[idx + needle.length] : ''
      if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) {
        ranges.push({ word, start: idx, end: idx + needle.length })
      }
      from = idx + needle.length
    }
  }
  // 按 start 排序, 移除重叠 (保留先出现的)
  ranges.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const filtered: VocabRange[] = []
  let lastEnd = -1
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      filtered.push(r)
      lastEnd = r.end
    }
  }
  return filtered
}

// === 完成状态 (复用 favorites 表 + wordTags 区分) ===
// v1.85.0: 用 'lesson:<id>' 字符串作为 wordId 加到 favorites 表, 不破坏 schema
// (wordId 主键为 string, 加 'lesson:' 前缀避免与真实 wordId 冲突)

const LESSON_TAG_PREFIX = 'lesson:'

/** 构造 favorite 表里的 lesson id (e.g. 'lesson:travel-airport') */
export function getLessonFavoriteId(lessonId: string): string {
  return `${LESSON_TAG_PREFIX}${lessonId}`
}

/** 从 favorite id 反解 lesson id */
export function getLessonIdFromFavorite(favId: string): string | null {
  if (!favId.startsWith(LESSON_TAG_PREFIX)) return null
  return favId.slice(LESSON_TAG_PREFIX.length)
}

/** 判断某课是否标记为已学 (查 favorites 表) */
export async function isLessonLearned(lessonId: string): Promise<boolean> {
  return isFavorite(getLessonFavoriteId(lessonId))
}

/** 标记为已学 (复用 favorites.addFavorite) */
export async function markLessonLearned(lessonId: string): Promise<void> {
  await addFavorite(getLessonFavoriteId(lessonId))
}

/** 取消已学 (复用 favorites.removeFavorite) */
export async function unmarkLessonLearned(lessonId: string): Promise<void> {
  await removeFavorite(getLessonFavoriteId(lessonId))
}

/** 批量查已学 ids (供列表页用) */
export async function getLearnedLessonIds(): Promise<Set<string>> {
  const favs = await getAllFavorites()
  const ids = new Set<string>()
  for (const f of favs) {
    const lid = getLessonIdFromFavorite(f.wordId)
    if (lid) ids.add(lid)
  }
  return ids
}

/** 估算阅读进度 (0-1) - 基于滚动位置 */
export function calcReadingProgress(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  if (scrollHeight <= clientHeight) return 1  // 内容不足一屏 → 100%
  const max = scrollHeight - clientHeight
  if (max <= 0) return 1
  return Math.min(1, Math.max(0, scrollTop / max))
}
