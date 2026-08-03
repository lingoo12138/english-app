// src/lib/errorDifficulty.ts - v1.95 W89-B 错题难度自适应
// 答对 >= 80 次数 >= 3 自动 mark "已掌握" (不再出现)
// 答错 < 40 次数 >= 2 标"难词" (推末尾 + 加深)
import type { ReviewSession, ReviewCard } from './errorReview'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'mastered'

export interface CardAnalysis {
  cardId: string
  difficulty: Difficulty
  attempts: number
  avgScore: number
  bestScore: number
  worstScore: number
  correctCount: number   // score >= 80
  wrongCount: number     // score < 40
  recentScores: number[]  // 最近 5 次分数 (旧 → 新)
  trend: 'up' | 'down' | 'flat'
}

const MASTERY_THRESHOLD = 3   // 答对 >= 80 次数 >= 3 = mastered
const HARD_THRESHOLD = 2      // 答错 < 40 次数 >= 2 = hard
const EASY_AVG = 80           // avg >= 80 = easy
const HARD_AVG = 40           // avg < 40 = hard

/** v1.99 W90 修 v1: 纯函数版 analyzeScores (无 mock session) */
export function analyzeScores(cardId: string, scores: number[]): Omit<CardAnalysis, 'cardId'> {
  const attempts = scores.length
  const correctCount = scores.filter(s => s >= 80).length
  const wrongCount = scores.filter(s => s < 40).length
  const avgScore = attempts > 0 ? Math.round(scores.reduce((s, x) => s + x, 0) / attempts) : 0
  const bestScore = attempts > 0 ? Math.max(...scores) : 0
  const worstScore = attempts > 0 ? Math.min(...scores) : 0
  const recentScores = scores.slice(-5)

  let trend: 'up' | 'down' | 'flat' = 'flat'
  if (recentScores.length >= 3) {
    const recent = recentScores.slice(-3)
    const prev = scores.slice(0, -3)
    if (prev.length >= 2) {
      const recentAvg = recent.reduce((s, x) => s + x, 0) / recent.length
      const prevAvg = prev.reduce((s, x) => s + x, 0) / prev.length
      if (recentAvg - prevAvg > 10) trend = 'up'
      else if (prevAvg - recentAvg > 10) trend = 'down'
    }
  }

  let difficulty: Difficulty
  if (correctCount >= MASTERY_THRESHOLD) {
    difficulty = 'mastered'
  } else if (wrongCount >= HARD_THRESHOLD || (attempts > 0 && avgScore < HARD_AVG)) {
    difficulty = 'hard'
  } else if (attempts > 0 && avgScore >= EASY_AVG) {
    difficulty = 'easy'
  } else {
    difficulty = 'medium'
  }

  return {
    difficulty,
    attempts,
    avgScore,
    bestScore,
    worstScore,
    correctCount,
    wrongCount,
    recentScores,
    trend,
  }
}

/** 从 session.history 提取某卡的尝试分数 (旧 → 新) */
function extractScores(session: ReviewSession, cardId: string): number[] {
  return session.history
    .filter(h => h.cardId === cardId)
    .map(h => h.score)
}

/** 分析单卡难度 */
export function analyzeCard(session: ReviewSession, card: ReviewCard): CardAnalysis {
  const scores = extractScores(session, card.id)
  const attempts = scores.length
  const correctCount = scores.filter(s => s >= 80).length
  const wrongCount = scores.filter(s => s < 40).length
  const avgScore = attempts > 0 ? Math.round(scores.reduce((s, x) => s + x, 0) / attempts) : 0
  const bestScore = attempts > 0 ? Math.max(...scores) : 0
  const worstScore = attempts > 0 ? Math.min(...scores) : 0
  const recentScores = scores.slice(-5)

  // 趋势: 最近 3 次平均 vs 前 3 次平均
  let trend: 'up' | 'down' | 'flat' = 'flat'
  if (recentScores.length >= 3) {
    const recent = recentScores.slice(-3)
    const prev = scores.slice(0, -3)
    if (prev.length >= 2) {
      const recentAvg = recent.reduce((s, x) => s + x, 0) / recent.length
      const prevAvg = prev.reduce((s, x) => s + x, 0) / prev.length
      if (recentAvg - prevAvg > 10) trend = 'up'
      else if (prevAvg - recentAvg > 10) trend = 'down'
    }
  }

  let difficulty: Difficulty
  if (correctCount >= MASTERY_THRESHOLD) {
    difficulty = 'mastered'
  } else if (wrongCount >= HARD_THRESHOLD || (attempts > 0 && avgScore < HARD_AVG)) {
    difficulty = 'hard'
  } else if (attempts > 0 && avgScore >= EASY_AVG) {
    difficulty = 'easy'
  } else {
    difficulty = 'medium'
  }

  return {
    cardId: card.id,
    difficulty,
    attempts,
    avgScore,
    bestScore,
    worstScore,
    correctCount,
    wrongCount,
    recentScores,
    trend,
  }
}

/** 答完一题后, 检查是否应该自动掌握或标难 */
export function updateCardDifficulty(session: ReviewSession, card: ReviewCard, score: number): ReviewSession {
  // 直接 append 到 history
  const newHistory = [...session.history, { cardId: card.id, score, grade: score >= 80 ? 'good' : score >= 40 ? 'ok' : 'bad' }]
  // mastered 不再留在 remaining
  const correctCount = newHistory.filter(h => h.cardId === card.id && h.score >= 80).length
  const wrongCount = newHistory.filter(h => h.cardId === card.id && h.score < 40).length

  let newRemaining = session.remaining
  if (correctCount >= MASTERY_THRESHOLD) {
    // 答对 >= 80 次数 >= 3, 移出
    newRemaining = session.remaining.filter(c => c.id !== card.id)
  } else if (wrongCount >= HARD_THRESHOLD) {
    // 答错 < 40 次数 >= 2, 标 hard + 推末尾 (加深)
    const without = session.remaining.filter(c => c.id !== card.id)
    if (without.length > 0) {
      newRemaining = [...without, card]
    } else {
      newRemaining = session.remaining
    }
  }

  return {
    ...session,
    history: newHistory,
    remaining: newRemaining,
  }
}

/** 难度 emoji + 颜色 */
export function difficultyStyle(d: Difficulty): { emoji: string; color: string; label: string } {
  switch (d) {
    case 'mastered': return { emoji: '🌟', color: 'text-emerald-500', label: '已掌握' }
    case 'easy': return { emoji: '🟢', color: 'text-emerald-500', label: '简单' }
    case 'medium': return { emoji: '🟡', color: 'text-amber-500', label: '中等' }
    case 'hard': return { emoji: '🔴', color: 'text-rose-500', label: '难词' }
  }
}

/** 趋势 emoji */
export function trendArrow(t: 'up' | 'down' | 'flat'): string {
  return t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
}

/** 统计池中各难度卡数 */
export function countByDifficulty(session: ReviewSession, cards: ReviewCard[]): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, mastered: 0 }
  for (const c of cards) {
    const a = analyzeCard(session, c)
    counts[a.difficulty]++
  }
  return counts
}
