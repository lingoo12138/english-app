// src/workers/fsrs.worker.ts - W135 FSRS 计算 Web Worker
// FSRS 4.5 简化版 (4 参数模型: D 难度 / S 稳定性 / R 可检索性 / T 间隔天数)
// 独立实现, 不依赖 SM-2. 留 1 周调优再补完整 FSRS 4.5 17 参数版本.
// 在 Worker 中运行, 避免主线程卡顿 (批量复习/课程评分时)

import type { ReviewItem } from '../types'

// === 评级枚举 (Anki 标准 4 键) ===
export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const

export type Rating = (typeof Rating)[keyof typeof Rating]

// === 4 参数卡片状态 ===
export interface FSRSCard {
  d: number
  s: number
  r: number
  t: number
  due: number
  lastReview: number
  reps: number
  lapses: number
}

const DEFAULT_D = 5
const DEFAULT_S = 2
const DEFAULT_R = 1
const DEFAULT_T = 0
const MIN_INTERVAL = 1
const DAY_MS = 24 * 60 * 60 * 1000

export function initFSRS(now: number = Date.now()): FSRSCard {
  return {
    d: DEFAULT_D,
    s: DEFAULT_S,
    r: DEFAULT_R,
    t: DEFAULT_T,
    due: now,
    lastReview: 0,
    reps: 0,
    lapses: 0,
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function forgettingCurve(tDays: number, s: number): number {
  if (s <= 0) return 0
  return 1 / (1 + tDays / s)
}

function nextInterval(prevT: number, prevR: number, newS: number, rating: Rating): number {
  if (rating === Rating.Again) return MIN_INTERVAL
  const factor = rating === Rating.Hard ? 0.8 : rating === Rating.Good ? 1.0 : 1.3
  const rAdjust = 1 - 0.5 * (1 - prevR)
  const candidate = prevT * rAdjust * factor * (newS / DEFAULT_S)
  return Math.max(MIN_INTERVAL, Math.round(candidate))
}

export function reviewFSRS(card: FSRSCard, rating: Rating, now: number = Date.now()): FSRSCard {
  let newD = card.d
  if (rating === Rating.Again) newD += 1.5
  else if (rating === Rating.Hard) newD += 0.5
  else if (rating === Rating.Good) newD += 0
  else if (rating === Rating.Easy) newD -= 0.5
  newD = clamp(newD, 1, 10)

  let newS = card.s
  if (rating === Rating.Again) newS = card.s * 0.5
  else if (rating === Rating.Hard) newS = card.s * 0.85
  else if (rating === Rating.Good) newS = card.s * 1.1
  else if (rating === Rating.Easy) newS = card.s * 1.3
  newS = Math.max(0.5, newS)

  const newT = nextInterval(card.t, card.r, newS, rating)

  let newR: number
  if (rating === Rating.Again) newR = 0.5
  else if (rating === Rating.Hard) newR = 0.85
  else if (rating === Rating.Good) newR = 0.95
  else newR = 0.99

  const newReps = rating === Rating.Again ? card.reps : card.reps + 1
  const newLapses = rating === Rating.Again ? card.lapses + 1 : card.lapses

  return {
    d: newD,
    s: newS,
    r: newR,
    t: newT,
    due: now + newT * DAY_MS,
    lastReview: now,
    reps: newReps,
    lapses: newLapses,
  }
}

export function getRetrievability(card: FSRSCard, now: number = Date.now()): number {
  if (card.lastReview === 0) return 1
  const elapsedDays = (now - card.lastReview) / DAY_MS
  return clamp(forgettingCurve(elapsedDays, card.s), 0, 1)
}

export function getIntervalDays(card: FSRSCard): number {
  return card.t
}

export function fromSM2(item: ReviewItem, now: number = Date.now()): FSRSCard {
  const rawD = (3.0 - item.easeFactor) / 0.17
  const d = clamp(Math.round(rawD), 1, 10)
  const s = Math.max(1, item.interval)
  const r = item.interval > 0 ? 0.9 : 1
  return {
    d,
    s,
    r,
    t: item.interval,
    due: item.nextReview,
    lastReview: item.nextReview - item.interval * DAY_MS,
    reps: item.repetitions,
    lapses: 0,
  }
}

export function toSM2(card: FSRSCard): ReviewItem {
  const easeFactor = clamp(3.0 - card.d * 0.17, 1.3, 3.0)
  return {
    wordId: '',
    nextReview: card.due,
    interval: card.t,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions: card.reps,
  }
}

// === Worker message protocol ===
export type FsrsWorkerRequest =
  | { id: number; type: 'init'; now?: number }
  | { id: number; type: 'review'; card: FSRSCard; rating: Rating; now?: number }
  | { id: number; type: 'retrievability'; card: FSRSCard; now?: number }
  | { id: number; type: 'intervalDays'; card: FSRSCard }
  | { id: number; type: 'fromSM2'; item: ReviewItem; now?: number }
  | { id: number; type: 'toSM2'; card: FSRSCard }
  | { id: number; type: 'batchReview'; cards: FSRSCard[]; ratings: Rating[]; now?: number }

export type FsrsWorkerResponse =
  | { id: number; ok: true; type: string; result: any }
  | { id: number; ok: false; error: string }

self.onmessage = (e: MessageEvent<FsrsWorkerRequest>) => {
  const req = e.data
  try {
    let result: any
    switch (req.type) {
      case 'init':
        result = initFSRS(req.now)
        break
      case 'review':
        result = reviewFSRS(req.card, req.rating, req.now)
        break
      case 'retrievability':
        result = getRetrievability(req.card, req.now)
        break
      case 'intervalDays':
        result = getIntervalDays(req.card)
        break
      case 'fromSM2':
        result = fromSM2(req.item, req.now)
        break
      case 'toSM2':
        result = toSM2(req.card)
        break
      case 'batchReview': {
        // 批量复习: 一次性处理 N 张卡, 减少 postMessage 往返
        const { cards, ratings, now } = req
        if (cards.length !== ratings.length) {
          throw new Error(`batchReview length mismatch: cards=${cards.length} ratings=${ratings.length}`)
        }
        result = cards.map((c, i) => reviewFSRS(c, ratings[i], now))
        break
      }
      default:
        throw new Error(`unknown request type: ${(req as any).type}`)
    }
    const res: FsrsWorkerResponse = { id: req.id, ok: true, type: req.type, result }
    ;(self as any).postMessage(res)
  } catch (err) {
    const res: FsrsWorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as any).postMessage(res)
  }
}
