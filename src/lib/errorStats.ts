// errorStats.ts - v1.35.0 W33 错题本升级
// 错题按类型分组 + 高频词统计 + 7/30 天趋势
import { db } from './db'

/** 错题按类型分组统计 */
export interface ErrorTypeStat {
  type: string
  count: number
  pct: number  // 占总错题百分比
}

/** 高频错词 (original) */
export interface HighFreqError {
  original: string
  count: number
  lastTs: number
}

/** 错题统计汇总 */
export interface ErrorSummary {
  total: number
  byType: ErrorTypeStat[]
  highFreq: HighFreqError[]  // Top 5
  /** 7 天每日错题数 (从老到新) */
  trend7: number[]
  /** 30 天每日错题数 */
  trend30: number[]
}

/** 拿错题统计 */
export async function getErrorSummary(): Promise<ErrorSummary> {
  const all = await db.writingErrors.orderBy('ts').reverse().toArray()
  if (all.length === 0) {
    return { total: 0, byType: [], highFreq: [], trend7: new Array(7).fill(0), trend30: new Array(30).fill(0) }
  }

  // 1. 按 type 分组
  const typeCount = new Map<string, number>()
  for (const e of all) {
    for (const err of e.errors || []) {
      typeCount.set(err.type, (typeCount.get(err.type) || 0) + 1)
    }
  }
  const totalType = Array.from(typeCount.values()).reduce((a, b) => a + b, 0) || 1
  const byType: ErrorTypeStat[] = Array.from(typeCount.entries())
    .map(([type, count]) => ({ type, count, pct: Math.round((count / totalType) * 100) }))
    .sort((a, b) => b.count - a.count)

  // 2. 高频错词 (original)
  const wordCount = new Map<string, { count: number; lastTs: number }>()
  for (const e of all) {
    const cur = wordCount.get(e.original) || { count: 0, lastTs: 0 }
    wordCount.set(e.original, { count: cur.count + 1, lastTs: Math.max(cur.lastTs, e.ts) })
  }
  const highFreq: HighFreqError[] = Array.from(wordCount.entries())
    .map(([original, v]) => ({ original, count: v.count, lastTs: v.lastTs }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 3. 7/30 天趋势
  const now = Date.now()
  const trend7 = new Array(7).fill(0)
  const trend30 = new Array(30).fill(0)
  for (const e of all) {
    const daysAgo7 = Math.floor((now - e.ts) / 86_400_000)
    if (daysAgo7 >= 0 && daysAgo7 < 7) trend7[6 - daysAgo7]++
    const daysAgo30 = Math.floor((now - e.ts) / 86_400_000)
    if (daysAgo30 >= 0 && daysAgo30 < 30) trend30[29 - daysAgo30]++
  }

  return { total: all.length, byType, highFreq, trend7, trend30 }
}

/** 错题类型中文标签 */
export const ERROR_TYPE_LABELS: Record<string, string> = {
  grammar: '语法',
  vocab: '用词',
  spelling: '拼写',
  style: '风格',
  tense: '时态',
  preposition: '介词',
  article: '冠词',
  other: '其他',
}

/** 错题类型配色 (按数量) */
export function getErrorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    grammar: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    vocab: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    spelling: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    style: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    tense: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    preposition: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    article: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    other: 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300',
  }
  return colors[type] || colors.other
}
