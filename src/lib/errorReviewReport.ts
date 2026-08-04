// src/lib/errorReviewReport.ts - 错题复习 答完 学习报告
// W96: 答完 summary 屏 增强 (准确率/平均分/最高/最低/难度分布/偷看率)

import type { ReviewSession } from './errorReview'

export interface ReviewReport {
  total: number
  correct: number
  wrong: number
  accuracy: number
  avgScore: number
  bestScore: number
  worstScore: number
  peekedCount: number
  peekRate: number
  difficulty: {
    mastered: number
    easy: number
    medium: number
    hard: number
  }
  sourceBreakdown: Record<string, number>
  gradeBreakdown: {
    perfect: number
    good: number
    ok: number
    bad: number
  }
}

export function buildReviewReport(session: ReviewSession): ReviewReport {
  const total = session.total
  const correct = session.correct
  const wrong = session.wrong
  const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0

  const scores = session.history.map(h => h.score)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0
  const worstScore = scores.length > 0 ? Math.min(...scores) : 0

  const peekedCount = session.history.filter(h => h.peeked).length
  const peekRate = scores.length > 0 ? Math.round((peekedCount / scores.length) * 100) : 0

  const cardBestScore: Record<string, number> = {}
  for (const h of session.history) {
    if (!cardBestScore[h.cardId] || h.score > cardBestScore[h.cardId]) {
      cardBestScore[h.cardId] = h.score
    }
  }
  const cardIds = Object.keys(cardBestScore)
  const difficulty = { mastered: 0, easy: 0, medium: 0, hard: 0 }
  for (const cid of cardIds) {
    const best = cardBestScore[cid]
    if (best >= 95) difficulty.mastered++
    else if (best >= 80) difficulty.easy++
    else if (best >= 40) difficulty.medium++
    else difficulty.hard++
  }

  // 修 v1 (P1-2): 读 history.source (W96 业务)
  const sourceBreakdown: Record<string, number> = {}
  for (const h of session.history) {
    const src = h.source || 'other'
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
  }

  const gradeBreakdown = { perfect: 0, good: 0, ok: 0, bad: 0 }
  for (const s of scores) {
    if (s >= 95) gradeBreakdown.perfect++
    else if (s >= 70) gradeBreakdown.good++
    else if (s >= 40) gradeBreakdown.ok++
    else gradeBreakdown.bad++
  }

  return {
    total, correct, wrong, accuracy,
    avgScore, bestScore, worstScore,
    peekedCount, peekRate,
    difficulty, sourceBreakdown, gradeBreakdown,
  }
}

export function formatReport(r: ReviewReport): {
  accuracyLabel: string
  scoreLabel: string
  peekLabel: string
  gradeLabel: string
  difficultyLabel: string
} {
  let accuracyLabel = ''
  if (r.accuracy >= 90) accuracyLabel = '🏆 优秀'
  else if (r.accuracy >= 70) accuracyLabel = '👍 不错'
  else if (r.accuracy >= 50) accuracyLabel = '💪 加油'
  else accuracyLabel = '📚 多练'

  let scoreLabel = ''
  if (r.avgScore >= 90) scoreLabel = '平均分很高, 掌握不错'
  else if (r.avgScore >= 70) scoreLabel = '平均分不错'
  else if (r.avgScore >= 40) scoreLabel = '平均分中等'
  else scoreLabel = '平均分较低, 建议多复习'

  let peekLabel = ''
  if (r.peekedCount === 0) peekLabel = '没有偷看, 真实力!'
  else if (r.peekRate < 20) peekLabel = '偷看 ' + r.peekedCount + ' 次 (' + r.peekRate + '%), 良好'
  else peekLabel = '偷看 ' + r.peekedCount + ' 次 (' + r.peekRate + '%), 建议多回忆'

  const gradeLabel = '完美 ' + r.gradeBreakdown.perfect + ' · 良好 ' + r.gradeBreakdown.good + ' · 一般 ' + r.gradeBreakdown.ok + ' · 较差 ' + r.gradeBreakdown.bad
  const difficultyLabel = '掌握 ' + r.difficulty.mastered + ' · 简单 ' + r.difficulty.easy + ' · 中等 ' + r.difficulty.medium + ' · 难词 ' + r.difficulty.hard

  return { accuracyLabel, scoreLabel, peekLabel, gradeLabel, difficultyLabel }
}
