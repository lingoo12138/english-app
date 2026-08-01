// src/lib/followRead.ts - v1.92 W86-A 跟读评分
// 跟读模式 (W83 加了 TTS 切句) + STT 识别用户朗读 + 字符/词级评分

import type { Word } from '../types'

export interface FollowReadResult {
  /** 目标文本 (句子) */
  target: string
  /** 用户口述 */
  transcript: string
  /** 0-100 得分 */
  score: number
  /** 漏词 */
  missing: string[]
  /** 多词 */
  extra: string[]
  /** 错词 */
  wrong: { target: string; got: string }[]
}

/** 标准化: lowercase + 去标点 + 折叠空格 */
export function normalizeFR(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"\-()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 词级评分 (与 Dictation 复用 算法) */
export function scoreFollowRead(target: string, transcript: string): number {
  const t = normalizeFR(target)
  const u = normalizeFR(transcript)
  if (!t) return 0
  if (t === u) return 100

  const tWords = t.split(' ').filter(Boolean)
  const uWords = u.split(' ').filter(Boolean)
  let matched = 0
  for (const tw of tWords) {
    if (uWords.includes(tw)) matched++
  }
  const wordScore = (matched / tWords.length) * 100

  // 字符级相似度 (字符 60% + 词 40%)
  const tSet = new Set(t.split(''))
  const uSet = new Set(u.split(''))
  let charMatches = 0
  for (const c of tSet) {
    if (uSet.has(c)) charMatches++
  }
  const charScore = (charMatches / tSet.size) * 100

  const final = charScore * 0.4 + wordScore * 0.6

  if (final >= 95) return 100
  if (final >= 70) return 80
  if (final >= 40) return 50
  if (final > 0) return 20
  return 0
}

/** 词级 diff */
export function diffFollowRead(target: string, transcript: string): {
  missing: string[]
  extra: string[]
  wrong: { target: string; got: string }[]
} {
  const t = normalizeFR(target)
  const u = normalizeFR(transcript)
  const tWords = t.split(' ').filter(Boolean)
  const uWords = u.split(' ').filter(Boolean)

  const missing = tWords.filter(w => !uWords.includes(w))
  const extra = uWords.filter(w => !tWords.includes(w))

  const wrong: { target: string; got: string }[] = []
  for (let i = 0; i < Math.max(tWords.length, uWords.length); i++) {
    if (i < tWords.length && i < uWords.length && tWords[i] !== uWords[i]) {
      wrong.push({ target: tWords[i], got: uWords[i] })
    }
  }
  return { missing, extra, wrong }
}

/** 给定完整 body, 切句 */
export function splitSentences(body: string): string[] {
  return body
    .split(/[.!?]+\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** 主函数: 跟读评分 */
export function evaluateFollowRead(target: string, transcript: string): FollowReadResult {
  return {
    target,
    transcript,
    score: scoreFollowRead(target, transcript),
    ...diffFollowRead(target, transcript),
  }
}

// v1.92: 跟读结果保存 (复用 dictationErrors 表, source='follow-read')
export interface FollowReadError {
  wordId: string  // lesson id (Lesson.id 复用)
  difficulty: 'easy' | 'medium' | 'hard'
  source: 'follow-read'
  transcript: string
  target: string
  score: number
  ts: number
}
