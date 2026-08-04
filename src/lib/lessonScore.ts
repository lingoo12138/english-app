// src/lib/lessonScore.ts - 课文评分 (跨课复用词 掌握度)
// W97: 20 篇课文 评分 业务
import { LESSONS, type Lesson } from '../data/textbook'
import { LESSONS_P2 } from '../data/textbook-p2'
import { LESSONS_P3 } from '../data/textbook-p3'
import { getAllWritingErrors, getAllDictationErrors, getAllErrorReviewScores } from './db'

const ALL_LESSONS: Lesson[] = [...LESSONS, ...LESSONS_P2, ...LESSONS_P3]

export interface LessonScore {
  lessonId: string
  title: string
  emoji: string
  level: string
  totalVocab: number
  masteredCount: number
  notMasteredCount: number
  masteryRate: number  // 0-100
  status: 'mastered' | 'in_progress' | 'not_started'
  crossLessonVocab: string[]  // 跨课复用词 (在 ≥2 篇 出现)
}

/** 跨课复用词: 在 ≥2 篇课文出现 */
export function findCrossLessonWords(lessons: Lesson[] = ALL_LESSONS): string[] {
  const wordCount: Record<string, number> = {}
  for (const lesson of lessons) {
    for (const word of lesson.vocabulary) {
      wordCount[word] = (wordCount[word] || 0) + 1
    }
  }
  return Object.entries(wordCount)
    .filter(([_, count]) => count >= 2)
    .map(([word]) => word)
    .sort()
}

/** 用户已掌握的词 (不在 错误列表) */
export function getUserMasteredWords(): Set<string> {
  const errorWords = new Set<string>()
  // 错题本: writing/dictation 错误
  for (const err of getAllWritingErrorsSync()) {
    // 简化: 错误 包含 的 词 标为 不 掌握
  }
  for (const err of getAllDictationErrorsSync()) {
  }
  // 错题 复习: score < 40 标 不 掌握
  for (const r of getAllErrorReviewScoresSync()) {
  }
  return new Set()  // 简化 返回
}

// 同步版本 - 业务 层 调用
function getAllWritingErrorsSync(): any[] {
  // 实际 业务 改 用 IDB, 这里 简化
  return []
}
function getAllDictationErrorsSync(): any[] {
  return []
}
function getAllErrorReviewScoresSync(): any[] {
  return []
}

/** 算 课文 评分 (异步 IDB) */
export async function computeLessonScores(): Promise<LessonScore[]> {
  const [writing, dictation, reviews] = await Promise.all([
    getAllWritingErrors(),
    getAllDictationErrors(),
    getAllErrorReviewScores(),
  ])

  // 错题集合 (用户不掌握)
  const notMastered = new Set<string>()
  for (const e of writing) {
    if (e.errors) {
      for (const err of e.errors) {
        notMastered.add(err.suggestion.toLowerCase())
      }
    }
  }
  // DictationError 字段: wordId (是 内部 ID, 不是 词), 这里 简化 不取
  for (const r of reviews) {
    if (r.score < 40) notMastered.add(r.cardId.toLowerCase())
  }

  // 算 跨课 复用
  const crossLesson = new Set(findCrossLessonWords())

  // 算 每 篇 评分
  const result: LessonScore[] = []
  for (const lesson of ALL_LESSONS) {
    const totalVocab = lesson.vocabulary.length
    const masteredCount = lesson.vocabulary.filter(w => !notMastered.has(w.toLowerCase())).length
    const masteryRate = totalVocab > 0 ? Math.round((masteredCount / totalVocab) * 100) : 0
    let status: 'mastered' | 'in_progress' | 'not_started'
    if (masteryRate >= 90) status = 'mastered'
    else if (masteryRate >= 30) status = 'in_progress'
    else status = 'not_started'
    result.push({
      lessonId: lesson.id,
      title: lesson.title,
      emoji: lesson.emoji,
      level: lesson.level,
      totalVocab,
      masteredCount,
      notMasteredCount: totalVocab - masteredCount,
      masteryRate,
      status,
      crossLessonVocab: lesson.vocabulary.filter(w => crossLesson.has(w)),
    })
  }
  return result
}

/** 跨课复用词 总数 */
export function getCrossLessonTotal(): number {
  return findCrossLessonWords().length
}
