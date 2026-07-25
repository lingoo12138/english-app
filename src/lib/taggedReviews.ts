// taggedReviews.ts - v1.22.0 B12 复习按 tag 过滤
// 复用 v1.11 reviewQueue + v1.21 wordTags
import { getAllReviews, getDueReviews } from './db'
import { getWordIdsByTag, getAllTagsWithCount } from './wordTags'
import { sortReviewQueue, toReviewQueueItem } from './reviewQueue'
import type { ReviewItem } from '../types'

/** 按 tag 返所有 reviews (可选 onlyDue) */
export async function getReviewsByTag(
  tag: string,
  onlyDue: boolean = true,
): Promise<ReviewItem[]> {
  const wordIds = new Set(await getWordIdsByTag(tag))
  const all = onlyDue ? await getDueReviews() : await getAllReviews()
  return all.filter(r => wordIds.has(r.wordId))
}

/** 按 tag 计数 */
export async function getReviewCountByTag(
  tag: string,
  onlyDue: boolean = true,
): Promise<number> {
  const reviews = await getReviewsByTag(tag, onlyDue)
  return reviews.length
}

/** 返所有 tag + 待复习数 (按 due 数降序) */
export async function getAllTagsWithReviewCount(
  onlyDue: boolean = true,
): Promise<Array<{ tag: string; count: number; totalCount: number }>> {
  // 1. 取所有 tag 统计 (总词数)
  const allTagStats = await getAllTagsWithCount()
  // 2. 返 due 数
  if (!onlyDue) {
    return allTagStats.map(t => ({ ...t, count: t.count, totalCount: t.count }))
  }
  // 3. 并行查每个 tag 的 due 数
  const counts = await Promise.all(
    allTagStats.map(async (t) => ({
      tag: t.tag,
      totalCount: t.count,
      count: await getReviewCountByTag(t.tag, true),
    })),
  )
  // 4. 按 due 数降序
  return counts.sort((a, b) => b.count - a.count)
}

/** 按 tag + 智能排序返 ReviewQueueItem */
export async function getReviewsByTagWithScore(
  tag: string,
  onlyDue: boolean = true,
  smartSort: boolean = true,
) {
  const reviews = await getReviewsByTag(tag, onlyDue)
  const items = reviews.map(toReviewQueueItem)
  return sortReviewQueue(items, Date.now(), { smartSort })
}

/** 检查 wordId 是否有某 tag */
export async function isWordInTag(wordId: string, tag: string): Promise<boolean> {
  const ids = await getWordIdsByTag(tag)
  return ids.includes(wordId)
}
