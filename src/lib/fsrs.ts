// FSRS 4.5 简化版 (v1.11.0-A)
// 4 参数模型: D 难度 / S 稳定性 / R 可检索性 / T 间隔天数
// 独立实现, 不依赖 SM-2. 留 1 周调优再补完整 FSRS 4.5 17 参数版本.
import type { ReviewItem } from '../types'

// === 评级枚举 (Anki 标准 4 键) ===
export const Rating = {
  Again: 1,  // 完全忘记, 短期重试
  Hard: 2,   // 困难回忆, 间隔略短
  Good: 3,   // 正常回忆
  Easy: 4,   // 轻松回忆, 间隔拉长
} as const

export type Rating = (typeof Rating)[keyof typeof Rating]

// === 4 参数卡片状态 ===
export interface FSRSCard {
  d: number         // Difficulty 难度 (1-10, 默认 5, 越大越难)
  s: number         // Stability 稳定性 (天数, 越大记得越久, 默认 2)
  r: number         // Retrievability 可检索性 (0-1, 1=刚记牢, 0=完全忘)
  t: number         // 当前间隔 (天)
  due: number       // 下次复习时间戳 (ms)
  lastReview: number // 上次复习时间戳 (ms), 0 表示未复习过
  reps: number      // 累计成功复习次数
  lapses: number    // 累计遗忘 (Again) 次数
}

// === 默认值常量 (留 1 周调优) ===
const DEFAULT_D = 5
const DEFAULT_S = 2
const DEFAULT_R = 1
const DEFAULT_T = 0
const MIN_INTERVAL = 1  // 最少 1 天
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 新卡片默认值
 * @param now 时间戳 (ms), 默认 Date.now()
 */
export function initFSRS(now: number = Date.now()): FSRSCard {
  return {
    d: DEFAULT_D,
    s: DEFAULT_S,
    r: DEFAULT_R,
    t: DEFAULT_T,
    due: now,           // 新卡 due=now, 立即可学
    lastReview: 0,      // 0 表示从未复习
    reps: 0,
    lapses: 0,
  }
}

/**
 * 限制数值到 [min, max]
 */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 简化版遗忘曲线: R(t, S) = 1 / (1 + t/S)
 * - t: 距上次复习的天数
 * - S: stability (越大衰减越慢)
 */
function forgettingCurve(tDays: number, s: number): number {
  if (s <= 0) return 0
  return 1 / (1 + tDays / s)
}

/**
 * 计算下次间隔 (天)
 * @param prevT 之前间隔
 * @param prevR 当前可检索性
 * @param newS 新稳定性
 * @param rating 评级
 */
function nextInterval(prevT: number, prevR: number, newS: number, rating: Rating): number {
  // 简化版: 综合 stability 和 评级倍率
  // Again: 强制 1 天短期重试
  if (rating === Rating.Again) {
    return MIN_INTERVAL
  }
  // Hard/Good/Easy: 基础 = S * 调整因子
  // 调整因子: Hard=0.8, Good=1.0, Easy=1.3
  const factor = rating === Rating.Hard ? 0.8 : rating === Rating.Good ? 1.0 : 1.3
  // 考虑当前 R: R 越低, 间隔越短 (公式: prevT * (1 - 0.5*(1-prevR)) * factor)
  const rAdjust = 1 - 0.5 * (1 - prevR)  // R=1 → 1, R=0.5 → 0.75, R=0 → 0.5
  const candidate = prevT * rAdjust * factor * (newS / DEFAULT_S)
  return Math.max(MIN_INTERVAL, Math.round(candidate))
}

/**
 * 评级后更新卡片参数
 * @param card 旧卡片
 * @param rating 评级
 * @param now 当前时间戳 (ms)
 */
export function reviewFSRS(card: FSRSCard, rating: Rating, now: number = Date.now()): FSRSCard {
  // 1) 算更新后的 D (难度)
  let newD = card.d
  if (rating === Rating.Again) newD += 1.5
  else if (rating === Rating.Hard) newD += 0.5
  else if (rating === Rating.Good) newD += 0  // 不变
  else if (rating === Rating.Easy) newD -= 0.5
  newD = clamp(newD, 1, 10)

  // 2) 算更新后的 S (稳定性)
  // Again: 减半; Hard: 略降; Good: 略升; Easy: 大升
  let newS = card.s
  if (rating === Rating.Again) newS = card.s * 0.5
  else if (rating === Rating.Hard) newS = card.s * 0.85
  else if (rating === Rating.Good) newS = card.s * 1.1
  else if (rating === Rating.Easy) newS = card.s * 1.3
  newS = Math.max(0.5, newS)  // 至少 0.5 天

  // 3) 算新间隔 T
  const newT = nextInterval(card.t, card.r, newS, rating)

  // 4) 算新可检索性 R (复习后: 0.85-0.99 区间, Again 时降到 0.5 等待重试)
  let newR: number
  if (rating === Rating.Again) newR = 0.5
  else if (rating === Rating.Hard) newR = 0.85
  else if (rating === Rating.Good) newR = 0.95
  else newR = 0.99

  // 5) 更新累计计数
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

/**
 * 计算当前可检索概率 (0-1)
 * - 基于上次复习时间 + 当前时间, 用遗忘曲线估算
 * - 距离 due 越近 R 越接近 1, 超过 due 则衰减
 */
export function getRetrievability(card: FSRSCard, now: number = Date.now()): number {
  if (card.lastReview === 0) return 1  // 从未复习过 = 完全可检索
  const elapsedDays = (now - card.lastReview) / DAY_MS
  return clamp(forgettingCurve(elapsedDays, card.s), 0, 1)
}

/**
 * 间隔天数 (根据 due - lastReview)
 */
export function getIntervalDays(card: FSRSCard): number {
  return card.t
}

// === SM-2 ↔ FSRS 转换 (用于旧数据兼容) ===
/**
 * SM-2 ReviewItem → FSRSCard
 * - SM-2 easeFactor (1.3-2.5+) → FSRS difficulty (1-10): easeFactor 越低, D 越高
 * - SM-2 interval → FSRS stability (粗略 1:1 起步)
 * - SM-2 repetitions → FSRS reps
 */
export function fromSM2(item: ReviewItem, now: number = Date.now()): FSRSCard {
  // easeFactor 2.5 → D=5 (中等), 1.3 → D=10 (最难), 3.0 → D=1 (最易)
  // 公式: D = round((3.0 - easeFactor) / 0.17) 但 clamp 到 [1, 10]
  const rawD = (3.0 - item.easeFactor) / 0.17
  const d = clamp(Math.round(rawD), 1, 10)
  // 稳定性 = 当前间隔 (天), 至少 1
  const s = Math.max(1, item.interval)
  // R 估算: 用 (1 + t/S)^-1 假设 due 接近 now
  const r = item.interval > 0 ? 0.9 : 1
  return {
    d,
    s,
    r,
    t: item.interval,
    due: item.nextReview,
    lastReview: item.nextReview - item.interval * DAY_MS,
    reps: item.repetitions,
    lapses: 0,  // SM-2 没记录 lapses, 默认 0
  }
}

/**
 * FSRSCard → SM-2 ReviewItem (反向, 用于回写)
 * - FSRS D (1-10) → easeFactor: D=5 → 2.5, D=10 → 1.3
 */
export function toSM2(card: FSRSCard): ReviewItem {
  const easeFactor = clamp(3.0 - card.d * 0.17, 1.3, 3.0)
  return {
    wordId: '',  // 调用方需自行填充
    nextReview: card.due,
    interval: card.t,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions: card.reps,
  }
}
