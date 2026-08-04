// src/lib/errorReview.ts - v1.93 W87-A 错题复习模式 (修 v1: P0 全修 + P1 算法)
// 错题变 Flashcard, 答对移出, 答错留 (push 末尾), 偷看计 0
// 兼容旧 export: extractErrorWords / addErrorWordsToFavorites / clearWordCache / getErrorWordsCount
import { addFavorite, isFavorite, getAllWritingErrors } from './db'
import { loadWords } from './words'
import type { DictationError, WritingError } from './db'

export type ReviewError = (DictationError & { source: 'dictation' | 'spelling' | 'follow-read' }) | (WritingError & { source: 'write' | 'chat' | 'chinese' })

/** 错题卡片信息 (写作 + 听写 + 拼写 + 跟读 统一) */
export interface ReviewCard {
  id: string
  source: 'write' | 'chat' | 'chinese' | 'dictation' | 'spelling' | 'follow-read'
  prompt: string       // 用户答错的版本 (writing original / dictation transcript)
  answer: string       // 正确答案 (writing corrected / dictation target)
  hint?: string        // 错误类型 (写作错: tense/spelling/grammar; 听写/拼写: wordId)
  ts: number
}

/** 写错题 → 卡片 */
export function writingToCard(e: WritingError): ReviewCard {
  const hintStr = e.errors
    .map(x => `${x.type}: ${x.explanation} (${x.original}→${x.suggestion})`)
    .join(' | ')
  return {
    id: `w-${e.id}`,
    source: e.source as 'write' | 'chat' | 'chinese',
    prompt: e.original,
    answer: e.corrected,
    hint: hintStr || undefined,
    ts: e.ts,
  }
}

/** 听写/拼写/跟读 → 卡片 */
export function dictationToCard(e: DictationError): ReviewCard {
  return {
    id: `d-${e.id}`,
    source: (e.source || 'dictation') as 'dictation' | 'spelling' | 'follow-read',
    prompt: e.transcript,
    answer: e.target,
    hint: e.difficulty,
    ts: e.ts,
  }
}

/** 写错题 + 听写错题 → 统一卡片 (按 ts desc 排序) */
export function toReviewCards(
  writing: WritingError[],
  dictation: DictationError[]
): ReviewCard[] {
  const all = [...writing.map(writingToCard), ...dictation.map(dictationToCard)]
  return all.sort((a, b) => b.ts - a.ts)
}

/** 抽卡 (随机) - 已不使用, 保留 export 兼容 */
export function pickCard(cards: ReviewCard[]): ReviewCard | null {
  if (cards.length === 0) return null
  return cards[Math.floor(Math.random() * cards.length)]
}

/** 标准化 (去标点 + 去空格, 用于字符 multiset) */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s.,!?;:'"\-()\[\]]/g, '')
    .trim()
}

/** 词级标准化 (保留空格, 用于词匹配) */
function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"\-()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 字符 multiset (频率 map, 不去重不计空格) */
function charFreq(s: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const c of s) {
    m.set(c, (m.get(c) || 0) + 1)
  }
  return m
}

/** 评分 (与 Dictation 算法对齐: 字符 60% + 词 40%, 字符 multiset 去空格) */
export function scoreAnswer(answer: string, userAnswer: string): number {
  const a = normalize(answer)
  const u = normalize(userAnswer)
  if (!a) return 0
  if (a === u) return 100

  // 词级
  const aWords = normalizeWord(answer).split(' ').filter(Boolean)
  const uWords = normalizeWord(userAnswer).split(' ').filter(Boolean)
  let wordMatched = 0
  for (const w of aWords) {
    if (uWords.includes(w)) wordMatched++
  }
  const wordScore = aWords.length > 0 ? (wordMatched / aWords.length) * 100 : 0

  // 字符级 (multiset, 去空格)
  const aFreq = charFreq(a)
  const uFreq = charFreq(u)
  let charMatches = 0
  let totalChars = 0
  for (const [c, n] of aFreq) {
    totalChars += n
    charMatches += Math.min(n, uFreq.get(c) || 0)
  }
  const charScore = totalChars > 0 ? (charMatches / totalChars) * 100 : 0

  // 跟 dictation 一致: 字符 60% + 词 40%
  return charScore * 0.6 + wordScore * 0.4
}

/** 评分档: 100=perfect / 80=good / 50=ok(partial) / 20=bad / 0=wrong */
export function gradeAnswer(score: number): 'perfect' | 'good' | 'ok' | 'bad' | 'wrong' {
  if (score >= 95) return 'perfect'
  if (score >= 70) return 'good'
  if (score >= 40) return 'ok'
  if (score > 0) return 'bad'
  return 'wrong'
}

/** 复习会话状态 (v1.93 修: 队列模型, remaining 数组) */
export interface ReviewSession {
  total: number         // 初始总卡数
  remaining: ReviewCard[]  // 剩余队列 (答对 shift, 答错 shift + push 末尾)
  correct: number       // 答对数
  wrong: number         // 答错数
  history: { cardId: string; score: number; grade: string; peeked?: boolean; source?: string }[]
}

/** 新会话 (排序后入列) */
export function newReviewSession(cards: ReviewCard[]): ReviewSession {
  const sorted = [...cards].sort((a, b) => b.ts - a.ts)
  return {
    total: sorted.length,
    remaining: sorted,
    correct: 0,
    wrong: 0,
    history: [],
  }
}

/** 答一题: 答对从 remaining 头部移除, 答错移到末尾 */
export function answerInSession(
  session: ReviewSession,
  userAnswer: string,
  peeked: boolean = false
): { session: ReviewSession; score: number; grade: string; isLast: boolean; card: ReviewCard | null } {
  const card = session.remaining[0]
  if (!card) {
    return { session, score: 0, grade: 'wrong', isLast: true, card: null }
  }

  // 偷看强制 0 分
  const score = peeked ? 0 : scoreAnswer(card.answer, userAnswer)
  const grade = peeked ? 'wrong' : gradeAnswer(score)
  const correct = grade === 'perfect' || grade === 'good'  // >= 70

  const newRemaining = [...session.remaining]
  newRemaining.shift()  // 弹出当前
  if (!correct) {
    newRemaining.push(card)  // 答错留: push 末尾, 下次再出
  }

  const isLast = newRemaining.length === 0
  const newSession: ReviewSession = {
    ...session,
    remaining: newRemaining,
    correct: session.correct + (correct ? 1 : 0),
    wrong: session.wrong + (correct ? 0 : 1),
    history: [...session.history, { cardId: card.id, score, grade, peeked, source: card.source }],
  }
  return { session: newSession, score, grade, isLast, card }
}

/** 进度: 已答 / 总 (0-1) */
export function sessionProgress(session: ReviewSession): number {
  if (session.total === 0) return 0
  const done = session.total - session.remaining.length
  return done / session.total
}

// ===== v1.1-D1 旧 export (兼容) =====

/**
 * 从错题里提取要复习的词 (取 suggestion 字段, 标点剥离)
 */
export function extractErrorWords(we: WritingError | WritingError[]): string[] {
  const arr = Array.isArray(we) ? we : [we]
  const out: string[] = []
  for (const w of arr) {
    for (const e of w.errors) {
      const word = e.suggestion
        .replace(/[.,!?;:'"()\[\]{}—–-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .split(/\s+/)[0]
      if (word && word.length >= 2 && /^[a-z]+$/.test(word)) {
        out.push(word)
      }
    }
  }
  return Array.from(new Set(out))
}

let wordCache: Map<string, string> | null = null
async function getWordMap(): Promise<Map<string, string>> {
  if (wordCache) return wordCache
  const words = await loadWords()
  wordCache = new Map()
  for (const w of words) {
    wordCache.set(w.word.toLowerCase(), w.id)
  }
  return wordCache
}

export async function addErrorWordsToFavorites(we: WritingError | WritingError[]): Promise<string[]> {
  const words = extractErrorWords(we)
  if (words.length === 0) return []
  const map = await getWordMap()
  const added: string[] = []
  for (const w of words) {
    const wordId = map.get(w)
    if (!wordId) continue
    const already = await isFavorite(wordId)
    if (already) continue
    await addFavorite(wordId)
    added.push(wordId)
  }
  return added
}

export function clearWordCache(): void {
  wordCache = null
}

export async function getErrorWordsCount(): Promise<number> {
  const allErrors = await getAllWritingErrors()
  if (allErrors.length === 0) return 0
  const words = extractErrorWords(allErrors)
  return words.length
}
