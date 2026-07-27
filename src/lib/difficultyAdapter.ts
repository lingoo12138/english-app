// src/lib/difficultyAdapter.ts - v1.43.0 W43-A 单词难度自适应
// 北极星: 让英语在你想用的时候就能用上 = 触发可业 + 内容能用 + 学得会
// 设计: 分析用户表现 (错词率/收藏率/掌握率) 动态调推荐词难度
// 0 成本, 纯本地算法, 不持久化 (每次重算)
import { db } from './db'
import { loadWords } from './words'
import type { Word } from '../types'

/** CEFR 等级 (A1 入门 → C2 母语级) */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** 难度阶梯 (有序) */
export const DIFFICULTY_LADDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** 错词率阈值: >30% 触发降级 */
export const ERROR_RATE_DOWNGRADE = 0.3
/** 掌握率阈值: >80% 触发升级 */
export const MASTERY_RATE_UPGRADE = 0.8
/** 数据不足阈值: 累计学词 < 5 不调级 */
export const MIN_LEARNED_FOR_ADAPT = 5
/** 最近 N 天 view records 用于推当前学段 */
const RECENT_DAYS = 14

/** difficulty 1-5 → CEFR 名称 (1→A1, 2→A2, 3→B1, 4→B2, 5→C1)
 *  - 与 learningReport.difficultyToCEFR 一致, 避免冲突
 *  - C2 暂无可匹配 difficulty, 不会出现
 */
const DIFFICULTY_TO_CEFR: Record<number, CEFRLevel> = {
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
  5: 'C1',
}

/** 词 difficulty → CEFR (无 difficulty 或越界返回 null) */
export function difficultyToCEFR(difficulty: number | undefined): CEFRLevel | null {
  if (!difficulty || difficulty < 1 || difficulty > 5) return null
  return DIFFICULTY_TO_CEFR[difficulty] || null
}

/** CEFR → 阶梯索引 (0-5) */
export function levelToIndex(l: CEFRLevel): number {
  return DIFFICULTY_LADDER.indexOf(l)
}

/** 索引 → CEFR (越界自动 clamp 到 [0, ladder.length-1]) */
export function indexToLevel(i: number): CEFRLevel {
  return DIFFICULTY_LADDER[Math.max(0, Math.min(DIFFICULTY_LADDER.length - 1, i))]
}

/** 用户学习表现汇总 */
export interface UserPerformance {
  /** 错词率: writingErrors 数 / favorites 数 (无收藏时为 0) */
  errorRate: number
  /** 收藏率: favorites / 累计学词 (无学时为 0) */
  favoriteRate: number
  /** 掌握率: repetitions >= 3 数 / favorites 数 (无收藏时为 0) */
  masteryRate: number
  /** 累计学词 (unique view wordIds) */
  totalLearned: number
  /** 收藏总数 */
  totalFavorites: number
  /** 错题总数 (writingErrors) */
  totalErrors: number
  /** 掌握数 (repetitions >= 3) */
  totalMastered: number
  /** 当前学段: 基于最近 14 天 view records 平均 difficulty */
  currentLevel: CEFRLevel
}

/**
 * 分析用户学习表现 (纯本地, 0 成本)
 * - 错词率: writingErrors count / favorites count
 * - 收藏率: favorites / totalLearned (unique view)
 * - 掌握率: reviews.repetitions >= 3 / favorites
 * - 当前学段: 最近 14 天 view records 平均 difficulty → CEFR
 * - 数据全空时 currentLevel 默认为 A2 (中间档, 安全起点)
 */
export async function analyzeUserPerformance(): Promise<UserPerformance> {
  try {
    const [favorites, records, errors, reviews, words] = await Promise.all([
      db.favorites.toArray(),
      db.records.where('action').equals('view').toArray(),
      db.writingErrors.toArray(),
      db.reviews.toArray(),
      loadWords(),
    ])

    const totalFavorites = favorites.length
    const totalErrors = errors.length
    const totalLearned = new Set(records.map(r => r.wordId)).size
    const totalMastered = reviews.filter(r => r.repetitions >= 3).length

    // 比率: 分母为 0 时用 0 (避免 NaN)
    const errorRate = totalFavorites > 0 ? totalErrors / totalFavorites : 0
    const favoriteRate = totalLearned > 0 ? totalFavorites / totalLearned : 0
    const masteryRate = totalFavorites > 0 ? totalMastered / totalFavorites : 0

    // 当前学段: 最近 14 天 view records 平均 difficulty
    const cutoff = Date.now() - RECENT_DAYS * 86_400_000
    const recentRecords = records.filter(r => r.timestamp >= cutoff)
    const wordMap = new Map<string, Word>(words.map(w => [w.id, w]))
    let sumDifficulty = 0
    let countDifficulty = 0
    for (const r of recentRecords) {
      const w = wordMap.get(r.wordId)
      if (w && typeof w.difficulty === 'number') {
        sumDifficulty += w.difficulty
        countDifficulty++
      }
    }
    const avgDifficulty = countDifficulty > 0 ? sumDifficulty / countDifficulty : 0
    // 数据全空时保持 A2 默认 (中间档, 安全起点), 不走难度映射
    const currentLevel = countDifficulty > 0
      ? (difficultyToCEFR(Math.round(avgDifficulty)) || 'A2')
      : 'A2'

    return {
      errorRate,
      favoriteRate,
      masteryRate,
      totalLearned,
      totalFavorites,
      totalErrors,
      totalMastered,
      currentLevel,
    }
  } catch (e) {
    // catch (e: unknown) + Error 守卫, 与 v1.6 修复一致
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('difficultyAdapter: analyzeUserPerformance 失败:', err.message)
    return {
      errorRate: 0,
      favoriteRate: 0,
      masteryRate: 0,
      totalLearned: 0,
      totalFavorites: 0,
      totalErrors: 0,
      totalMastered: 0,
      currentLevel: 'A2',
    }
  }
}

/**
 * 根据表现动态调推荐词难度
 * - 数据不足 (累计学词 < 5) → 维持 currentLevel
 * - 错词率 >30% → 降 1 步 (A1→A1 clamp, A2→A1, B1→A2 ...)
 * - 掌握率 >80% → 升 1 步 (A1→A2, A2→B1 ..., C1→C2 clamp)
 * - 升降互斥, 优先降级 (避免用户在错率高时还推难的)
 */
export async function getAdaptiveLevel(): Promise<CEFRLevel> {
  const perf = await analyzeUserPerformance()
  // 数据不足, 不调级
  if (perf.totalLearned < MIN_LEARNED_FOR_ADAPT) {
    return perf.currentLevel
  }
  let idx = levelToIndex(perf.currentLevel)
  if (perf.errorRate > ERROR_RATE_DOWNGRADE) {
    idx = Math.max(0, idx - 1)
  } else if (perf.masteryRate > MASTERY_RATE_UPGRADE) {
    idx = Math.min(DIFFICULTY_LADDER.length - 1, idx + 1)
  }
  return indexToLevel(idx)
}

/**
 * 推荐 N 个词, 难度在 level ± 1 步内, 同 level 优先
 * @param level 目标 CEFR 等级
 * @param count 推荐数
 * @param seenIds 已选词 ID 集合 (排除用), undefined 不过滤
 * @returns 按"同 level → -1 步 → +1 步"顺序取满 count
 */
export async function getRecommendedWords(
  level: CEFRLevel,
  count: number,
  seenIds?: Set<string>,
): Promise<Word[]> {
  if (count <= 0) return []
  try {
    const allWords = await loadWords()
    const targetIdx = levelToIndex(level)
    const exclude = seenIds || new Set<string>()

    // 候选等级: 优先同 level, 然后 -1, +1
    const levelOrder: CEFRLevel[] = [level]
    if (targetIdx > 0) levelOrder.push(indexToLevel(targetIdx - 1))
    if (targetIdx < DIFFICULTY_LADDER.length - 1) levelOrder.push(indexToLevel(targetIdx + 1))

    // 严格按等级顺序取 (同 level 优先)
    const result: Word[] = []
    for (const lvl of levelOrder) {
      const sameLevel = allWords.filter(w => {
        const cefr = difficultyToCEFR(w.difficulty)
        return cefr === lvl && !exclude.has(w.id)
      })
      // 字母序稳定排序 (与 plan.ts step 3 一致)
      sameLevel.sort((a, b) => a.word.localeCompare(b.word))
      for (const w of sameLevel) {
        if (result.length >= count) break
        result.push(w)
      }
      if (result.length >= count) break
    }

    return result
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('difficultyAdapter: getRecommendedWords 失败:', err.message)
    return []
  }
}
