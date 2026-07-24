// listeningRecommend.ts - v1.7.0 B 听力自适应
// 用写作错题数据反向推 "该听哪课" — 哪课 vocabulary 命中错词多, 优先推
// 纯本地算法, 0 成本, 不持久化 (每次重算)
import type { ListeningLesson } from '../data/listening'
import { extractErrorWords } from './errorReview'
import type { WritingError } from './db'

/**
 * 提取该课的关键词集合 (vocabulary + blanks 答案)
 * 全部小写, 短语用空格分隔 (e.g. "oat milk", "key card")
 */
export function extractLessonKeywords(lesson: ListeningLesson): Set<string> {
  const set = new Set<string>()
  for (const v of lesson.vocabulary) {
    set.add(v.word.toLowerCase().trim())
  }
  for (const b of lesson.blanks) {
    set.add(b.answer.toLowerCase().trim())
  }
  return set
}

/**
 * 计算该课命中错词数
 * errorWords: 大小写不敏感, 短语按整段匹配
 * @returns { score: 命中数, matchedWords: 命中的错词列表 (原 case) }
 */
export function calculateLessonScore(
  lesson: ListeningLesson,
  errorWords: Set<string>,
): { score: number; matchedWords: string[] } {
  const keywords = extractLessonKeywords(lesson)
  const matched: string[] = []
  for (const w of errorWords) {
    if (keywords.has(w.toLowerCase())) matched.push(w)
  }
  return { score: matched.length, matchedWords: matched }
}

/**
 * 推荐 Top N 课
 * - errors 为空 或 提取不到错词 → 返回空
 * - 已完成课降权 0.3 倍 (但仍可见)
 * - 按 score 降序排, score > 0 才返回, 取 Top N
 */
export function recommendLessons(
  lessons: ListeningLesson[],
  errors: WritingError[],
  completedIds: Set<string>,
  topN: number = 3,
): Array<{ lesson: ListeningLesson; score: number; matchedWords: string[]; isCompleted: boolean }> {
  if (errors.length === 0) return []
  const errorWords = new Set(extractErrorWords(errors))
  if (errorWords.size === 0) return []

  const scored = lessons.map(lesson => {
    const { score, matchedWords } = calculateLessonScore(lesson, errorWords)
    const isCompleted = completedIds.has(lesson.id)
    const adjustedScore = isCompleted ? score * 0.3 : score
    return { lesson, score: adjustedScore, matchedWords, isCompleted }
  })

  // 降序
  scored.sort((a, b) => b.score - a.score)
  return scored.filter(s => s.score > 0).slice(0, topN)
}
