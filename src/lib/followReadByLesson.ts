// src/lib/followReadByLesson.ts - v1.98 W89-D 跟读按句/按课分组
import type { FollowReadScore } from './followReadScore'

/** 按句分组: lessonId -> sentenceIndex -> scores[] */
export function groupBySentence(scores: FollowReadScore[]): Record<string, Record<number, number[]>> {
  const result: Record<string, Record<number, number[]>> = {}
  for (const s of scores) {
    if (!result[s.lessonId]) result[s.lessonId] = {}
    if (!result[s.lessonId][s.sentenceIndex]) result[s.lessonId][s.sentenceIndex] = []
    result[s.lessonId][s.sentenceIndex].push(s.score)
  }
  return result
}

/** 按课分组: lessonId -> scores[] */
export function groupByLesson(scores: FollowReadScore[]): Record<string, FollowReadScore[]> {
  const result: Record<string, FollowReadScore[]> = {}
  for (const s of scores) {
    if (!result[s.lessonId]) result[s.lessonId] = []
    result[s.lessonId].push(s)
  }
  return result
}

/** 单句统计 */
export interface SentenceStat {
  lessonId: string
  sentenceIndex: number
  best: number
  worst: number
  avg: number
  count: number
}

export function sentenceStats(scores: FollowReadScore[]): SentenceStat[] {
  const grouped = groupBySentence(scores)
  const result: SentenceStat[] = []
  for (const [lessonId, sentences] of Object.entries(grouped)) {
    for (const [idx, list] of Object.entries(sentences)) {
      result.push({
        lessonId,
        sentenceIndex: Number(idx),
        best: Math.max(...list),
        worst: Math.min(...list),
        avg: Math.round(list.reduce((s: number, x: number) => s + x, 0) / list.length),
        count: list.length,
      })
    }
  }
  return result.sort((a, b) => a.lessonId.localeCompare(b.lessonId) || a.sentenceIndex - b.sentenceIndex)
}

/** 单课统计 */
export interface LessonStat {
  lessonId: string
  best: number
  worst: number
  avg: number
  count: number
  sentenceCount: number  // 不同句 idx 数
}

export function lessonStats(scores: FollowReadScore[]): LessonStat[] {
  const grouped = groupByLesson(scores)
  const bySentence = groupBySentence(scores)
  const result: LessonStat[] = []
  for (const [lid, list] of Object.entries(grouped)) {
    const sentenceCount = Object.keys(bySentence[lid] || {}).length
    const totals = list.map(s => s.score)
    result.push({
      lessonId: lid,
      best: Math.max(...totals),
      worst: Math.min(...totals),
      avg: Math.round(totals.reduce((s: number, x: number) => s + x, 0) / list.length),
      count: list.length,
      sentenceCount,
    })
  }
  return result.sort((a, b) => a.lessonId.localeCompare(b.lessonId))
}
