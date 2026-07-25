// notebookBulk.ts - v1.20.0 B10 生词本批量操作
// 批量入复习 / 删除 / 导出 CSV
import { db } from './db'
import type { Favorite, ReviewItem } from '../types'

/** 批量操作结果 */
export interface BulkResult {
  success: number
  failed: number
  errors: string[]
}

/** 批量入复习 (复用 v1.11 reviews 表 + v1.16 sceneReview 模式) */
export async function addFavoritesToReview(favorites: Favorite[]): Promise<{
  added: number
  skipped: number
  failed: number
}> {
  const now = Date.now()
  let added = 0
  let skipped = 0
  let failed = 0

  for (const fav of favorites) {
    try {
      const wordId = fav.wordId
      const existing = await db.reviews.get(wordId)
      if (existing) {
        skipped++
        continue
      }
      const item: ReviewItem = {
        wordId,
        nextReview: now,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
      }
      await db.reviews.put(item)
      added++
    } catch (e) {
      failed++
      console.warn('[notebookBulk] 入复习失败:', fav.wordId, e)
    }
  }
  return { added, skipped, failed }
}

/** 批量删除收藏 */
export async function removeFavorites(favorites: Favorite[]): Promise<BulkResult> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const fav of favorites) {
    try {
      await db.favorites.delete(fav.wordId)
      success++
    } catch (e) {
      failed++
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${fav.wordId}: ${msg}`)
    }
  }
  return { success, failed, errors }
}

/** 导出 CSV (逗号分隔, 转义引号) */
export function exportFavoritesAsCSV(
  favorites: Favorite[],
  wordLookup?: (wordId: string) => { translation?: string; difficulty?: string } | undefined,
): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const header = 'word,translation,difficulty,addedAt'
  const lines = [header]
  for (const fav of favorites) {
    const meta = wordLookup?.(fav.wordId) || {}
    const translation = escape(meta.translation || '')
    const difficulty = escape(meta.difficulty || '')
    const addedAt = new Date(fav.addedAt).toISOString()
    lines.push(`${escape(fav.wordId)},${translation},${difficulty},${addedAt}`)
  }
  return lines.join('\n')
}

/** 触发 CSV 下载 */
export function downloadFavoritesCSV(
  favorites: Favorite[],
  wordLookup?: (wordId: string) => { translation?: string; difficulty?: string } | undefined,
): void {
  const csv = exportFavoritesAsCSV(favorites, wordLookup)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notebook-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 全选辅助 */
export function selectAll(allFavorites: Favorite[]): Set<string> {
  return new Set(allFavorites.map(f => f.wordId))
}

/** 反选辅助 */
export function invertSelection(
  currentSelected: Set<string>,
  allFavorites: Favorite[],
): Set<string> {
  const all = new Set(allFavorites.map(f => f.wordId))
  const inverted = new Set<string>()
  for (const id of all) {
    if (!currentSelected.has(id)) {
      inverted.add(id)
    }
  }
  return inverted
}

/** 清空选择 */
export function clearSelection(): Set<string> {
  return new Set()
}
