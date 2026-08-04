// src/lib/lessonScore.ts - 课文评分 (跨课复用词 掌握度)
// W97: 20 篇课文 评分 业务 (verifier W97 修 v1)
import { LESSONS, type Lesson } from '../data/textbook'
import { LESSONS_P2 } from '../data/textbook-p2'
import { LESSONS_P3 } from '../data/textbook-p3'
import { getAllWritingErrors, getAllDictationErrors, getAllErrorReviewScores } from './db'

const ALL_LESSONS: Lesson[] = [...LESSONS, ...LESSONS_P2, ...LESSONS_P3]

// 阈值 常量 (跟 XP_REWARDS 风格一致) - P1-3 修
export const LESSON_SCORE_THRESHOLDS = {
  mastered: 90,
  inProgress: 30,
}

// 跨课 阈值 - P1-2 修
export const CROSS_LESSON_MIN = 2

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
  crossLessonVocab: string[]  // 跨课复用词
}

/** 跨课复用词 (minLessonCount = 2) - P1-1 大小写 归一化 */
export function findCrossLessonWords(lessons: Lesson[] = ALL_LESSONS, minCount: number = CROSS_LESSON_MIN): string[] {
  const wordCount: Record<string, number> = {}
  for (const lesson of lessons) {
    for (const word of lesson.vocabulary) {
      const w = word.toLowerCase()
      wordCount[w] = (wordCount[w] || 0) + 1
    }
  }
  return Object.entries(wordCount)
    .filter(([_, count]) => count >= minCount)
    .map(([word]) => word)
    .sort()
}

/** 错题 取词 (听写 / 写作 / 错题复习) */
async function getNotMasteredWords(): Promise<Set<string>> {
  const [writing, dictation, reviews] = await Promise.all([
    getAllWritingErrors(),
    getAllDictationErrors(),
    getAllErrorReviewScores(),
  ])
  const notMastered = new Set<string>()

  // writing 错题: suggestion 是 LLM 改错 词
  for (const e of writing) {
    if (e.errors) {
      for (const err of e.errors) {
        if (err.suggestion) notMastered.add(err.suggestion.toLowerCase())
      }
    }
  }

  // 听写 错题: wordId 是 Word.id (如 "phone") - P0-1 修
  for (const e of dictation) {
    if (e.wordId) notMastered.add(e.wordId.toLowerCase())
  }

  // 错题 复习: 反查 cardId (w-/d- 前缀 → 找 原词) - P0-2 修
  // cardId 形如 w-123 (writing) / d-456 (dictation)
  for (const r of reviews) {
    if (r.score >= 60) continue  // P1-4 修: 已 复习 成功 不 算 不 掌握
    if (r.cardId.startsWith('w-')) {
      const wid = parseInt(r.cardId.slice(2), 10)
      if (!isNaN(wid)) {
        const we = writing.find(w => w.id === wid)
        if (we?.errors) {
          for (const err of we.errors) {
            if (err.suggestion) notMastered.add(err.suggestion.toLowerCase())
          }
        }
      }
    } else if (r.cardId.startsWith('d-')) {
      const did = parseInt(r.cardId.slice(2), 10)
      if (!isNaN(did)) {
        const de = dictation.find(d => d.id === did)
        if (de?.wordId) notMastered.add(de.wordId.toLowerCase())
      }
    }
  }

  return notMastered
}

/** 算 课文 评分 (异步 IDB) */
export async function computeLessonScores(): Promise<LessonScore[]> {
  const notMastered = await getNotMasteredWords()
  const crossLesson = new Set(findCrossLessonWords())

  const result: LessonScore[] = []
  for (const lesson of ALL_LESSONS) {
    const totalVocab = lesson.vocabulary.length
    const masteredCount = lesson.vocabulary.filter(w => !notMastered.has(w.toLowerCase())).length
    const masteryRate = totalVocab > 0 ? Math.round((masteredCount / totalVocab) * 100) : 0
    let status: 'mastered' | 'in_progress' | 'not_started'
    if (masteryRate >= LESSON_SCORE_THRESHOLDS.mastered) status = 'mastered'
    else if (masteryRate >= LESSON_SCORE_THRESHOLDS.inProgress) status = 'in_progress'
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
      crossLessonVocab: lesson.vocabulary.filter(w => crossLesson.has(w.toLowerCase())),
    })
  }
  return result
}

/** 跨课复用词 总数 */
export function getCrossLessonTotal(): number {
  return findCrossLessonWords().length
}
