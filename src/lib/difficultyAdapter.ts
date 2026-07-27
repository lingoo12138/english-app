// src/lib/difficultyAdapter.ts - v1.48.0 W45 (verifier2 P1-B 修)
// v1.43 用 CEFR 6 档 (来自 difficulty 字段), 但 words.json 99% 无 difficulty 字段, 导致 result 空
// v1.48.0 改用学段 8 档 (primary/junior/.../daily), 跟 word.level 匹配, 真实数据能工作
import { db } from './db'
import { loadWords } from './words'
import type { Word } from '../types'

/** 8 个学段 (从低到高) - 跟 words.json level 字段一致 */
export type WordLevel =
  | 'primary' | 'junior' | 'senior' | 'gaozhong'
  | 'cet4' | 'cet6' | 'kaoyan' | 'daily'

/** 难度阶梯 (有序) */
export const DIFFICULTY_LADDER: WordLevel[] = [
  'primary', 'junior', 'senior', 'gaozhong',
  'cet4', 'cet6', 'kaoyan', 'daily',
]

/** 中文名 (UI 用) */
export const LEVEL_NAMES_ZH: Record<WordLevel, string> = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  gaozhong: '高考',
  cet4: '四级',
  cet6: '六级',
  kaoyan: '考研',
  daily: '日常',
}

export interface UserPerformance {
  errorRate: number
  favoriteRate: number
  masteryRate: number
  totalLearned: number
  totalFavorites: number
  totalErrors: number
  totalMastered: number
  currentLevel: WordLevel
  analyzedAt: number
}

export interface AdaptiveRecommendation {
  level: WordLevel
  direction: 'maintain' | 'level-up' | 'level-down'
  reason: string
  levelName: string
}

export const ERROR_RATE_DOWNGRADE = 0.3
export const MASTERY_RATE_UPGRADE = 0.8
export const MIN_LEARNED_FOR_ADAPT = 5

function shiftLevel(level: WordLevel, delta: 1 | -1): WordLevel {
  const idx = DIFFICULTY_LADDER.indexOf(level)
  if (idx < 0) return level
  const newIdx = Math.max(0, Math.min(DIFFICULTY_LADDER.length - 1, idx + delta))
  return DIFFICULTY_LADDER[newIdx]
}

function pickMostFrequentLevel(counts: Map<WordLevel, number>): WordLevel {
  let max = -1
  let result: WordLevel = 'junior'
  for (const [lvl, cnt] of counts) {
    if (cnt > max) { max = cnt; result = lvl }
  }
  return result
}

function asWordLevel(s: string | undefined): WordLevel | null {
  if (!s) return null
  return (DIFFICULTY_LADDER as string[]).includes(s) ? (s as WordLevel) : null
}

/** 兼容 v1.43 测试: getRecommendedWords 仍接受 CEFR 字符串, 内部映射到学段 */
export type CEFRLevel = WordLevel  // 别名, 兼容 v1.43 调用

export async function analyzeUserPerformance(): Promise<UserPerformance> {
  try {
    const [favorites, records, errors, reviews, words] = await Promise.all([
      db.favorites.toArray(),
      db.records.toArray(),
      db.writingErrors.toArray(),
      db.reviews.toArray(),
      loadWords(),
    ])

    const totalFavorites = favorites.length
    const totalErrors = errors.length
    const totalLearned = new Set(records.map(r => r.wordId)).size
    const totalMastered = reviews.filter(r => r.repetitions >= 3).length

    const errorRate = totalFavorites > 0 ? totalErrors / totalFavorites : 0
    const favoriteRate = totalLearned > 0 ? totalFavorites / totalLearned : 0
    const masteryRate = totalFavorites > 0 ? totalMastered / totalFavorites : 0

    const wordMap = new Map<string, Word>(words.map(w => [w.id, w]))
    const levelCounts = new Map<WordLevel, number>()
    for (const f of favorites) {
      const w = wordMap.get(f.wordId)
      const lvl = asWordLevel(w?.level)
      if (lvl) levelCounts.set(lvl, (levelCounts.get(lvl) || 0) + 1)
    }
    for (const r of reviews) {
      const w = wordMap.get(r.wordId)
      const lvl = asWordLevel(w?.level)
      if (lvl) levelCounts.set(lvl, (levelCounts.get(lvl) || 0) + 1)
    }
    const currentLevel = pickMostFrequentLevel(levelCounts)

    return {
      errorRate, favoriteRate, masteryRate,
      totalLearned, totalFavorites, totalErrors, totalMastered,
      currentLevel, analyzedAt: Date.now(),
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('difficultyAdapter: analyzeUserPerformance 失败:', err.message)
    return {
      errorRate: 0, favoriteRate: 0, masteryRate: 0,
      totalLearned: 0, totalFavorites: 0, totalErrors: 0, totalMastered: 0,
      currentLevel: 'junior', analyzedAt: Date.now(),
    }
  }
}

export async function getAdaptiveLevel(): Promise<AdaptiveRecommendation> {
  const perf = await analyzeUserPerformance()
  const lvl = perf.currentLevel

  if (perf.totalLearned < MIN_LEARNED_FOR_ADAPT) {
    return { level: lvl, direction: 'maintain', reason: '数据不足, 维持当前学段', levelName: LEVEL_NAMES_ZH[lvl] }
  }

  if (perf.errorRate > ERROR_RATE_DOWNGRADE) {
    const lowered = shiftLevel(lvl, -1)
    if (lowered !== lvl) {
      return {
        level: lowered, direction: 'level-down',
        reason: `错词率 ${(perf.errorRate * 100).toFixed(0)}% 偏高, 降一级更易上手`,
        levelName: LEVEL_NAMES_ZH[lowered],
      }
    }
  }

  if (perf.masteryRate > MASTERY_RATE_UPGRADE) {
    const upped = shiftLevel(lvl, 1)
    if (upped !== lvl) {
      return {
        level: upped, direction: 'level-up',
        reason: `掌握率 ${(perf.masteryRate * 100).toFixed(0)}% 优秀, 升一级挑战`,
        levelName: LEVEL_NAMES_ZH[upped],
      }
    }
  }

  return { level: lvl, direction: 'maintain', reason: '当前学段合适, 继续保持', levelName: LEVEL_NAMES_ZH[lvl] }
}

/**
 * 推荐 N 个词, 难度在 level ± 1 步内, 同 level 优先
 * 关键: 用 word.level 匹配 (跟 words.json 一致), 不依赖 difficulty 字段
 * fallback: 如果 level 找不到词, 扩到全部 level 取
 */
export async function getRecommendedWords(
  level: CEFRLevel,
  count: number,
  seenIds?: Set<string>,
): Promise<Word[]> {
  if (count <= 0) return []
  try {
    const all = await loadWords()
    const exclude = seenIds || new Set<string>()
    const stepIdx = DIFFICULTY_LADDER.indexOf(level as WordLevel)

    // 同 level 优先
    const target = all.filter(w => w.level === level && !exclude.has(w.id))
    const nearby: Word[] = []
    if (stepIdx >= 0) {
      const lower = DIFFICULTY_LADDER[stepIdx - 1]
      const upper = DIFFICULTY_LADDER[stepIdx + 1]
      if (lower) nearby.push(...all.filter(w => w.level === lower && !exclude.has(w.id)))
      if (upper) nearby.push(...all.filter(w => w.level === upper && !exclude.has(w.id)))
    }

    // 70% 目标 + 30% 兜底
    const targetCount = Math.ceil(count * 0.7)
    const nearbyCount = count - targetCount
    const shuffled = (arr: Word[]) => [...arr].sort(() => Math.random() - 0.5)
    let result = [
      ...shuffled(target).slice(0, targetCount),
      ...shuffled(nearby).slice(0, nearbyCount),
    ].filter(Boolean)

    // v1.48.0 W45: fallback - 同 level 0 词时扩到全部 level (verifier2 P1-B)
    if (result.length === 0) {
      const fallback = all.filter(w => !exclude.has(w.id))
      result = shuffled(fallback).slice(0, count)
    }

    return result
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('difficultyAdapter: getRecommendedWords 失败:', err.message)
    return []
  }
}

/** v1.43 兼容: levelToIndex / indexToLevel 内部使用, 测试用 */
export function levelToIndex(l: CEFRLevel): number {
  return DIFFICULTY_LADDER.indexOf(l as WordLevel)
}

export function indexToLevel(i: number): CEFRLevel {
  return DIFFICULTY_LADDER[Math.max(0, Math.min(DIFFICULTY_LADDER.length - 1, i))]
}

/** v1.43 兼容: difficultyToCEFR 保留 (words.json 大多数词无 difficulty, 返 null) */
export function difficultyToCEFR(difficulty: number | undefined): CEFRLevel | null {
  if (!difficulty || difficulty < 1 || difficulty > 5) return null
  // 1→primary, 2→junior, 3→senior, 4→gaozhong, 5→cet4
  const map: Record<number, WordLevel> = {
    1: 'primary', 2: 'junior', 3: 'senior', 4: 'gaozhong', 5: 'cet4',
  }
  return map[difficulty] || null
}
