// src/workers/lessonScore.worker.ts - W135 课文评分 计算 Worker
// 跨课复用词 (5,423 词 × 20 课 × N 课) + 课文评分 移到 Worker
// 主线程只负责拉 IDB 数据 + 喂给 worker, 计算不阻塞 UI

import type { Lesson } from '../data/textbook'

export const LESSON_SCORE_THRESHOLDS = {
  mastered: 90,
  inProgress: 30,
} as const

export const CROSS_LESSON_MIN = 2

export interface LessonScore {
  lessonId: string
  title: string
  emoji: string
  level: string
  totalVocab: number
  masteredCount: number
  notMasteredCount: number
  masteryRate: number
  status: 'mastered' | 'in_progress' | 'not_started'
  crossLessonVocab: string[]
}

/** 跨课复用词 — O(lessons × vocab), 在 Worker 中跑 */
export function findCrossLessonWords(lessons: Lesson[], minCount: number = CROSS_LESSON_MIN): string[] {
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

/** 计算单课评分 — 不依赖 IDB, 纯函数, 适合 Worker */
export function computeLessonScore(
  lesson: Lesson,
  notMastered: Set<string>,
  crossLessonSet: Set<string>,
): LessonScore {
  const totalVocab = lesson.vocabulary.length
  let masteredCount = 0
  const crossLessonVocab: string[] = []
  for (const w of lesson.vocabulary) {
    const low = w.toLowerCase()
    if (!notMastered.has(low)) masteredCount++
    if (crossLessonSet.has(low)) crossLessonVocab.push(w)
  }
  const masteryRate = totalVocab > 0 ? Math.round((masteredCount / totalVocab) * 100) : 0
  let status: LessonScore['status']
  if (masteryRate >= LESSON_SCORE_THRESHOLDS.mastered) status = 'mastered'
  else if (masteryRate >= LESSON_SCORE_THRESHOLDS.inProgress) status = 'in_progress'
  else status = 'not_started'
  return {
    lessonId: lesson.id,
    title: lesson.title,
    emoji: lesson.emoji,
    level: lesson.level,
    totalVocab,
    masteredCount,
    notMasteredCount: totalVocab - masteredCount,
    masteryRate,
    status,
    crossLessonVocab,
  }
}

export type LessonScoreWorkerRequest =
  | { id: number; type: 'crossLesson'; lessons: Lesson[]; minCount?: number }
  | { id: number; type: 'computeAll'; lessons: Lesson[]; notMastered: string[] }
  | { id: number; type: 'computeOne'; lesson: Lesson; notMastered: string[]; crossLesson: string[] }

export type LessonScoreWorkerResponse =
  | { id: number; ok: true; type: string; result: any }
  | { id: number; ok: false; error: string }

self.onmessage = (e: MessageEvent<LessonScoreWorkerRequest>) => {
  const req = e.data
  try {
    let result: any
    switch (req.type) {
      case 'crossLesson': {
        result = findCrossLessonWords(req.lessons, req.minCount)
        break
      }
      case 'computeAll': {
        const notMastered = new Set(req.notMastered)
        // 1) 跨课复用词 (在 worker 中算, 避免主线程)
        const crossLesson = findCrossLessonWords(req.lessons)
        const crossSet = new Set(crossLesson)
        // 2) 逐课评分
        result = req.lessons.map(l => computeLessonScore(l, notMastered, crossSet))
        break
      }
      case 'computeOne': {
        const notMastered = new Set(req.notMastered)
        const crossSet = new Set(req.crossLesson)
        result = computeLessonScore(req.lesson, notMastered, crossSet)
        break
      }
      default:
        throw new Error(`unknown request type: ${(req as any).type}`)
    }
    const res: LessonScoreWorkerResponse = { id: req.id, ok: true, type: req.type, result }
    ;(self as any).postMessage(res)
  } catch (err) {
    const res: LessonScoreWorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as any).postMessage(res)
  }
}
