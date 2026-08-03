// src/lib/errorHistory.ts - v1.99 W90 错题复习统计核心 (修 v1: 接 session 真数据 + 纯函数 analyzeScores)
import type { WritingError, DictationError } from './db'
import { analyzeScores, type CardAnalysis, type Difficulty } from './errorDifficulty'

/** 错题来源 (写错 / 听写 / 拼写 / 跟读) */
export type ErrorSource = 'write' | 'chat' | 'chinese' | 'dictation' | 'spelling' | 'follow-read'

/** 统一错题 + 复习历史 */
export interface UnifiedError {
  cardId: string
  source: ErrorSource
  /** 错题原文 (writing original / dictation transcript) */
  original: string
  /** 正确答案 (writing corrected / dictation target) */
  corrected: string
  /** 历次评分 (旧 → 新), 从 session.history 提取 */
  scores: number[]
  /** 错题入 IDB 时间 */
  addedAt: number
  /** 错题最后修改时间 */
  lastTs: number
}

/** 错题 → 统一卡 id (跟 W87 errorReview.ts 一致) */
export function errorToCardId(e: WritingError): string {
  return `w-${e.id}`
}
export function dictationToCardId(e: DictationError): string {
  return `d-${e.id}`
}

/** 错题集合 (writing + dictation) → UnifiedError[] */
export function toUnifiedErrors(
  writing: WritingError[],
  dictation: DictationError[],
  historyMap: Record<string, number[]> = {}  // cardId -> scores[]
): UnifiedError[] {
  const result: UnifiedError[] = []
  for (const w of writing) {
    const cardId = errorToCardId(w)
    result.push({
      cardId,
      source: w.source as ErrorSource,
      original: w.original,
      corrected: w.corrected,
      scores: historyMap[cardId] || [],
      addedAt: w.ts,
      lastTs: w.ts,
    })
  }
  for (const d of dictation) {
    const cardId = dictationToCardId(d)
    result.push({
      cardId,
      source: (d.source || 'dictation') as ErrorSource,
      original: d.transcript,
      corrected: d.target,
      scores: historyMap[cardId] || [],
      addedAt: d.ts,
      lastTs: d.ts,
    })
  }
  return result
}

/** 合并 session history 到 historyMap */
export function extractHistoryMap(history: { cardId: string; score: number }[]): Record<string, number[]> {
  const map: Record<string, number[]> = {}
  for (const h of history) {
    if (!map[h.cardId]) map[h.cardId] = []
    map[h.cardId].push(h.score)
  }
  return map
}

/** 卡分析 (用 ErrorReviewPage 相同的 analyzeScores, 修 v1 删 mockSession as any) */
export interface ErrorCardAnalysis extends CardAnalysis {
  original: string
  corrected: string
  source: ErrorSource
  addedAt: number
}

export function analyzeUnifiedError(e: UnifiedError): ErrorCardAnalysis {
  // 修 v1: 用纯函数 analyzeScores, 不再 mock session
  const base = analyzeScores(e.cardId, e.scores)
  return {
    ...base,
    original: e.original,
    corrected: e.corrected,
    source: e.source,
    addedAt: e.addedAt,
  }
}

/** 按 source 分组 */
export function groupBySource(errors: UnifiedError[]): Record<ErrorSource, UnifiedError[]> {
  const result: Record<ErrorSource, UnifiedError[]> = {
    write: [], chat: [], chinese: [],
    dictation: [], spelling: [], 'follow-read': [],
  }
  for (const e of errors) result[e.source].push(e)
  return result
}

/** 统计: 全部错题的难度分布 */
export interface ErrorStats {
  total: number
  byDifficulty: Record<Difficulty, number>
  bySource: Record<ErrorSource, number>
  /** 答对过的卡数 (有 >= 80 的分数) */
  withSomeCorrect: number
  /** 难词 (hard) 卡数 */
  hard: number
  /** 已掌握 (mastered) 卡数 */
  mastered: number
}

export function computeErrorStats(errors: UnifiedError[]): ErrorStats {
  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, mastered: 0 }
  const bySource: Record<ErrorSource, number> = {
    write: 0, chat: 0, chinese: 0,
    dictation: 0, spelling: 0, 'follow-read': 0,
  }
  let withSomeCorrect = 0
  for (const e of errors) {
    const a = analyzeUnifiedError(e)
    byDifficulty[a.difficulty]++
    bySource[e.source]++
    if (a.correctCount > 0) withSomeCorrect++
  }
  return {
    total: errors.length,
    byDifficulty,
    bySource,
    withSomeCorrect,
    hard: byDifficulty.hard,
    mastered: byDifficulty.mastered,
  }
}

/** 排序: 按 bestScore desc, worstScore asc, count desc, ts desc */
export function sortByDifficulty(errors: UnifiedError[]): UnifiedError[] {
  return [...errors].sort((a, b) => {
    const aa = analyzeUnifiedError(a)
    const bb = analyzeUnifiedError(b)
    if (aa.difficulty === bb.difficulty) return b.addedAt - a.addedAt
    // mastered 排前, hard 排后
    const order: Record<Difficulty, number> = { mastered: 0, easy: 1, medium: 2, hard: 3 }
    return order[aa.difficulty] - order[bb.difficulty]
  })
}
