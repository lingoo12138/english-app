// sceneReview.ts - v1.16.0 B6 多场景关联
// CustomSceneLearn 学完 → 入 v1.11 reviews 表 → v1.11 reviewQueue 智能排序
import { db } from './db'
import type { ReviewItem } from '../types'
import type { CustomWord } from './customScenes'

/** 复习状态 */
export interface SceneReviewStatus {
  totalWords: number       // 场景总词数
  inReviewCount: number    // 在复习中的词数
  masteredCount: number    // 已掌握词数 (repetitions >= 3)
}

/** 批量入复习 (学完时调用) */
export async function addSceneWordsToReview(
  words: CustomWord[],
  sceneTitle: string,
): Promise<{ added: number; skipped: number }> {
  const now = Date.now()
  let added = 0
  let skipped = 0

  for (const w of words) {
    const wordId = `customScene:${w.word}`  // 区分来源 + 防冲突
    const existing = await db.reviews.get(wordId)
    if (existing) {
      // 已在复习中, 跳过 (避免覆盖间隔/难度)
      skipped++
      continue
    }
    const item: ReviewItem = {
      wordId,
      nextReview: now,  // 立即可复习
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
    }
    await db.reviews.put(item)
    added++
  }
  return { added, skipped }
}

/** 取场景复习状态 */
export async function getSceneReviewStatus(
  words: CustomWord[],
): Promise<SceneReviewStatus> {
  let inReviewCount = 0
  let masteredCount = 0
  for (const w of words) {
    const wordId = `customScene:${w.word}`
    const r = await db.reviews.get(wordId)
    if (r) {
      inReviewCount++
      if (r.repetitions >= 3) {
        masteredCount++
      }
    }
  }
  return {
    totalWords: words.length,
    inReviewCount,
    masteredCount,
  }
}

/** 场景列表用: 取某场景复习中的词数 */
export async function getSceneInReviewCount(words: CustomWord[]): Promise<number> {
  let count = 0
  for (const w of words) {
    const wordId = `customScene:${w.word}`
    const r = await db.reviews.get(wordId)
    if (r) count++
  }
  return count
}

/** 删除场景时同步清复习 (可选, 调用方决定) */
export async function removeSceneWordsFromReview(words: CustomWord[]): Promise<number> {
  let removed = 0
  for (const w of words) {
    const wordId = `customScene:${w.word}`
    const existing = await db.reviews.get(wordId)
    if (existing) {
      await db.reviews.delete(wordId)
      removed++
    }
  }
  return removed
}

/** 自定义场景词 ID 前缀 (导出供其他模块识别) */
export const CUSTOM_SCENE_WORD_PREFIX = 'customScene:'
