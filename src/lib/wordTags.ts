// wordTags.ts - v1.21.0 B11 生词本标签
// 用户给收藏的词打标签, 按 tag 分类管理/复习
import { db, addWordTag, getWordTags, getWordsByTag, getAllWordTags, removeWordTag, removeAllTagsForWord } from './db'
import type { WordTag } from './db'
import type { Favorite } from '../types'

/** Tag 长度上限 */
export const MAX_TAG_LEN = 20
/** 每个词 tag 数上限 */
export const MAX_TAGS_PER_WORD = 10
/** 全局 tag 数上限 */
export const MAX_TOTAL_TAGS = 50

/** 启发式 tag 建议 (基于词内容) */
const TAG_RULES: Array<{ keywords: string[]; tag: string }> = [
  { keywords: ['work', 'job', 'office', 'meeting', 'boss'], tag: 'work' },
  { keywords: ['travel', 'trip', 'flight', 'hotel', 'airport', 'tour'], tag: 'travel' },
  { keywords: ['food', 'eat', 'restaurant', 'cook', 'meal'], tag: 'food' },
  { keywords: ['school', 'study', 'exam', 'test', 'learn'], tag: 'study' },
  { keywords: ['tech', 'computer', 'software', 'code', 'data'], tag: 'tech' },
  { keywords: ['sport', 'game', 'football', 'basketball'], tag: 'sport' },
  { keywords: ['health', 'body', 'medicine', 'doctor'], tag: 'health' },
]

/** 解析 tag 输入 ("tag1, tag2" → ["tag1", "tag2"]) */
export function parseTagInput(input: string): string[] {
  if (!input) return []
  return input
    .split(/[,，;；\s]+/)  // 中英文逗号/分号/空格
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0 && t.length <= MAX_TAG_LEN)
    .filter((t, i, arr) => arr.indexOf(t) === i)  // 去重
}

/** 验证单 tag */
export function isValidTag(tag: string): boolean {
  if (!tag) return false
  if (tag.length > MAX_TAG_LEN) return false
  // 仅允许字母数字中文和 - _
  return /^[a-z0-9一-龥\-_]+$/.test(tag)
}

/** 批量加 tag (幂等) */
export async function addTagsToWord(
  wordId: string,
  tags: string[],
): Promise<{ added: number; skipped: number; failed: number }> {
  let added = 0
  let skipped = 0
  let failed = 0

  // 检查该词现有 tag 数
  const existing = await getWordTags(wordId)
  const existingTags = new Set(existing.map(t => t.tag))
  const available = MAX_TAGS_PER_WORD - existingTags.size

  for (const tag of tags) {
    if (!isValidTag(tag)) {
      failed++
      continue
    }
    if (existingTags.has(tag)) {
      skipped++
      continue
    }
    if (added >= available) {
      skipped++
      continue
    }
    try {
      await addWordTag(wordId, tag)
      existingTags.add(tag)
      added++
    } catch (e) {
      console.warn('[wordTags] 加 tag 失败:', wordId, tag, e)
      failed++
    }
  }
  return { added, skipped, failed }
}

/** 从词去 tag */
export async function removeTagFromWord(wordId: string, tag: string): Promise<void> {
  return removeWordTag(wordId, tag)
}

/** 清除词的所有 tag */
export async function clearAllTagsForWord(wordId: string): Promise<void> {
  return removeAllTagsForWord(wordId)
}

/** 统计: 所有 tag + 计数 (按 count 降序) */
export async function getAllTagsWithCount(): Promise<Array<{ tag: string; count: number }>> {
  const all = await getAllWordTags()
  const counts = new Map<string, number>()
  for (const t of all) {
    counts.set(t.tag, (counts.get(t.tag) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/** 按 tag 返所有 wordId */
export async function getWordIdsByTag(tag: string): Promise<string[]> {
  const items = await getWordsByTag(tag)
  return Array.from(new Set(items.map(i => i.wordId)))
}

/** 过滤收藏 (按 tag) */
export function filterFavoritesByTag(
  favorites: Favorite[],
  wordTagMap: Map<string, Set<string>>,
  tag: string | null,
): Favorite[] {
  if (!tag) return favorites
  return favorites.filter(f => wordTagMap.get(f.wordId)?.has(tag) || false)
}

/** 构建 wordId -> Set<tag> 映射 */
export async function buildWordTagMap(): Promise<Map<string, Set<string>>> {
  const all = await getAllWordTags()
  const map = new Map<string, Set<string>>()
  for (const t of all) {
    if (!map.has(t.wordId)) {
      map.set(t.wordId, new Set())
    }
    map.get(t.wordId)!.add(t.tag)
  }
  return map
}

/** 启发式建议 (基于词/翻译匹配 TAG_RULES) */
export function suggestTagsFromWord(word: string, translation?: string): string[] {
  const text = `${word} ${translation || ''}`.toLowerCase()
  const suggestions = new Set<string>()
  for (const rule of TAG_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        suggestions.add(rule.tag)
        break
      }
    }
  }
  return Array.from(suggestions)
}

/** tag 颜色 (基于 tag 字符串哈希) */
const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
]

export function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0x7fffffff
  }
  return TAG_COLORS[hash % TAG_COLORS.length]
}
