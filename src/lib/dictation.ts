// src/lib/dictation.ts - v1.87 W81-D 听写核心逻辑
//
// 流程:
// 1. 系统 TTS 朗读 target (词/短句/长句)
// 2. 用户 STT 识别 → transcript
// 3. 比对 transcript vs target → score
// 4. 错词入错题本 (errors DB)

import type { Word } from '../types'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DictationItem {
  /** 目标文本 (词 / 短句 / 长句) */
  target: string
  /** 主词 (便于入错题本) */
  sourceWord?: Word
  /** 难度 */
  difficulty: Difficulty
}

/** 标准化: lowercase + 去标点 + 折叠空格 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"\-()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 计算 Levenshtein 距离 (字符级) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 删除
        dp[i][j - 1] + 1,      // 插入
        dp[i - 1][j - 1] + cost // 替换
      )
    }
  }
  return dp[m][n]
}

/** 评分: 0-100 (按词命中率 + 字符相似度综合) */
export function scoreAnswer(target: string, transcript: string): number {
  const t = normalize(target)
  const u = normalize(transcript)
  if (!t) return 0
  if (t === u) return 100

  // 字符级相似度 (更稳定)
  const dist = levenshtein(t, u)
  const maxLen = Math.max(t.length, u.length, 1)
  const charScore = Math.max(0, 1 - dist / maxLen) * 100

  // 词级相似度
  const tWords = t.split(' ').filter(Boolean)
  const uWords = u.split(' ').filter(Boolean)
  let matched = 0
  for (const tw of tWords) {
    if (uWords.includes(tw)) matched++
  }
  const wordScore = (matched / Math.max(tWords.length, 1)) * 100

  // 综合 (字符 60% + 词 40%)
  const final = charScore * 0.6 + wordScore * 0.4

  if (final >= 95) return 100
  if (final >= 70) return 80
  if (final >= 40) return 50
  if (final > 0) return 20
  return 0
}

/** 词级 diff (返回错词 / 漏词 / 替换词) */
export function diffWords(target: string, transcript: string): {
  missing: string[]   // 漏掉
  extra: string[]     // 多出
  wrong: { target: string; got: string }[]  // 错词
} {
  const tWords = normalize(target).split(' ').filter(Boolean)
  const uWords = normalize(transcript).split(' ').filter(Boolean)
  const missing = tWords.filter(w => !uWords.includes(w))
  const extra = uWords.filter(w => !tWords.includes(w))
  // 错词 = transcript 中不在 target 的词
  const wrong: { target: string; got: string }[] = []
  for (let i = 0; i < Math.max(tWords.length, uWords.length); i++) {
    if (i < tWords.length && i < uWords.length && tWords[i] !== uWords[i]) {
      wrong.push({ target: tWords[i], got: uWords[i] })
    }
  }
  return { missing, extra, wrong }
}

/** 随机选词 (不重复, from 高频词库) */
export function pickWord(words: Word[], used: Set<string>, seed: number = Date.now()): Word | null {
  const candidates = words
    .filter(w => !used.has(w.id) && w.word.length >= 3 && w.word.length <= 7)
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
  if (candidates.length === 0) return null
  // 用 seed 取 random
  const idx = seed % candidates.length
  return candidates[idx]
}

/** 生成短句 (3-5 词) 从 word 库 */
export function makeShortSentence(words: Word[], anchor: Word): string {
  // 简单模板: a/an + adj + anchor + noun
  const a = /^[aeiou]/i.test(anchor.word) ? 'an' : 'a'
  const adjWord = pickWord(words, new Set([anchor.id]), anchor.word.length)
  if (!adjWord) return `${a} ${anchor.word} for me`
  return `${a} ${adjWord.word} ${anchor.word} for me`
}

/** 生成 DictationItem */
export function buildItem(words: Word[], difficulty: Difficulty, used: Set<string>, seed: number = Date.now()): DictationItem | null {
  // v1.87 W81-D P1 修: 不再 mutate used, 改由 caller 处理 add. 避免外部 state mutation 副作用
  const w = pickWord(words, used, seed)
  if (!w) return null
  // 注: caller 负责 used.add(w.id) 后 setUsed(new Set(...))

  if (difficulty === 'easy') {
    return { target: w.word, sourceWord: w, difficulty }
  }
  if (difficulty === 'medium') {
    return { target: makeShortSentence(words, w), sourceWord: w, difficulty }
  }
  // hard: 模板句
  const templates = [
    `I want to ${w.word} something for you`,
    `She likes to ${w.word} every morning`,
    `They will ${w.word} it tomorrow`,
  ]
  return { target: templates[seed % templates.length], sourceWord: w, difficulty }
}
