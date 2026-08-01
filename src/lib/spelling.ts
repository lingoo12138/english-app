// src/lib/spelling.ts - v1.90 W84 单词卡 (Spelling Card)
// 跟听写类似, 但纯拼写 (1 词) + 字符级 diff 反馈

import type { Word } from '../types'

export interface SpellingItem {
  /** 目标词 (canonical) */
  target: string
  /** 主词 */
  sourceWord: Word
}

export type Difficulty = 'easy' | 'medium' | 'hard'

const RANGE: Record<Difficulty, [number, number]> = {
  easy: [1, 4],
  medium: [5, 6],
  hard: [7, 12],
}

/** 随机选词 (按难度字符范围) */
export function pickSpellingWord(
  words: Word[],
  used: Set<string>,
  difficulty: Difficulty,
  seed: number = Date.now(),
): Word | null {
  const [minLen, maxLen] = RANGE[difficulty]
  const candidates = words
    .filter(w => !used.has(w.id) && w.word.length >= minLen && w.word.length <= maxLen)
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
  if (candidates.length === 0) return null
  const idx = seed % candidates.length
  return candidates[idx]
}

/** 字符级 diff: 找出错字位置 */
export function spellingDiff(target: string, user: string): {
  correct: boolean           // 完全对
  missing: number[]          // 漏字符位置 (1-indexed)
  wrong: number[]            // 错字符位置
  extra: number[]            // 多字符位置
} {
  const t = target.toLowerCase()
  const u = user.toLowerCase().trim()
  if (t === u) return { correct: true, missing: [], wrong: [], extra: [] }

  // 简单 Levenshtein + 字符级比对
  const maxLen = Math.max(t.length, u.length)
  const missing: number[] = []
  const wrong: number[] = []
  const extra: number[] = []

  // 简单 LCS
  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array(u.length + 1).fill(0))
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= u.length; j++) {
      if (t[i - 1] === u[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // 反向追踪
  let i = t.length, j = u.length
  const tUsed = new Set<number>()
  const uUsed = new Set<number>()
  while (i > 0 && j > 0) {
    if (t[i - 1] === u[j - 1]) {
      tUsed.add(i - 1)
      uUsed.add(j - 1)
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--  // missing
    } else {
      j--  // extra
    }
  }

  for (let k = 0; k < t.length; k++) {
    if (!tUsed.has(k)) {
      // missing or wrong
      if (k < u.length && !uUsed.has(k)) wrong.push(k)
      else missing.push(k)
    }
  }
  for (let k = 0; k < u.length; k++) {
    if (!uUsed.has(k)) extra.push(k)
  }

  return { correct: false, missing, wrong, extra }
}

/** 拼写评分: 0-100 */
export function scoreSpelling(target: string, user: string): number {
  if (target.toLowerCase() === user.toLowerCase().trim()) return 100
  const diff = spellingDiff(target, user)
  if (diff.correct) return 100
  const errors = diff.missing.length + diff.wrong.length + diff.extra.length
  if (errors === 0) return 100
  const ratio = errors / target.length
  if (ratio <= 0.2) return 80
  if (ratio <= 0.5) return 50
  if (errors < target.length) return 20
  return 0
}

/** 渲染字符级反馈 (错字位置用颜色) */
export function renderSpellingHint(target: string, user: string): {
  parts: { char: string; status: 'ok' | 'wrong' | 'missing' }[]
  userParts: { char: string; status: 'ok' | 'wrong' | 'extra' }[]
} {
  const t = target.toLowerCase()
  const u = user.toLowerCase().trim()
  if (t === u) {
    return {
      parts: t.split('').map(c => ({ char: c, status: 'ok' as const })),
      userParts: u.split('').map(c => ({ char: c, status: 'ok' as const })),
    }
  }

  const diff = spellingDiff(target, user)

  // 渲染 target
  const tParts: { char: string; status: 'ok' | 'wrong' | 'missing' }[] = []
  for (let i = 0; i < t.length; i++) {
    let status: 'ok' | 'wrong' | 'missing' = 'ok'
    if (diff.wrong.includes(i)) status = 'wrong'
    else if (diff.missing.includes(i)) status = 'missing'
    tParts.push({ char: t[i], status })
  }

  // 渲染 user (按对齐: 配对 ok, 多 extra)
  const uParts: { char: string; status: 'ok' | 'wrong' | 'extra' }[] = []
  for (let i = 0; i < u.length; i++) {
    let status: 'ok' | 'wrong' | 'extra' = 'ok'
    if (diff.extra.includes(i)) status = 'extra'
    else if (i < t.length && (diff.wrong.includes(i) || diff.missing.includes(i))) status = 'wrong'
    uParts.push({ char: u[i], status })
  }

  return { parts: tParts, userParts: uParts }
}
