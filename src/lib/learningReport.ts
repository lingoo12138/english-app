// learningReport.ts - v1.11.0-C 学习日报/周报
// 聚合 IndexedDB (records/favorites/writingErrors/pronunciationAttempts)
// + localStorage (plan-progress/streak) 数据, 生成结构化报告
import { db } from './db'
import { formatDay, getStreak } from './streak'
import { getWord } from './words'
import type { Word } from '../types'

// === 数据结构 ===
export interface DailyReport {
  date: string                  // YYYY-MM-DD
  wordsLearned: number          // 今日学词 (unique view records, 过滤非真实词)
  pronunciationCount: number    // 今日跟读次数
  errorCount: number            // 今日错题 (writingErrors)
  favoritesAdded: number        // 今日新增收藏
  streak: number                // 连续学习天数
  totalWords: number            // 累计学词
  encouragement: string         // 鼓励文案
}

export interface WeeklyTrend {
  direction: 'up' | 'down' | 'flat'
  emoji: string                 // 📈 / 📉 / ➡️
  delta: number                 // 数值差
  pct: number                   // 百分比 (0.0-1.0, 正负都允许)
}

export interface WeeklyComparison {
  currentWords: number          // 本周学词
  previousWords: number         // 上周学词
  delta: number                 // 差值
  pct: number                   // 百分比
  direction: 'up' | 'down' | 'flat'  // v1.11.0-C: 趋势方向
  emoji: string                 // 📈 / 📉 / ➡️
  summary: string               // "比上周 +12%"
}

export interface WeeklyReport {
  weekStart: string             // YYYY-MM-DD (周一)
  totalWordsLearned: number
  dailyReports: DailyReport[]   // 7 天
  trend: WeeklyTrend            // 7 天趋势
  comparison: WeeklyComparison  // 与上周对比
  topWords: Array<{ word: Word; count: number }>   // Top 5 学词
  topErrors: Array<{ original: string; corrected: string; ts: number }>  // Top 5 错题
  encouragement: string
  // v1.28.0 W29: 3 新增字段
  weakRoots: Array<{ root: string; errorCount: number }>  // 弱项词根 Top 5
  hourDistribution: Array<{ hour: number; count: number }>  // 24 时段分布
  weeklyRetention: number  // 7 天平均 retention (0-1)
}

// === Helpers ===
function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function endOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** 取某天 [start, end] 时间戳 */
export function dayRange(date: Date): { start: number; end: number } {
  return { start: startOfDay(date), end: endOfDay(date) }
}

// 过滤非真实单词 ID(同 db.ts 规则一致)
const SYNTHETIC_ID_PREFIXES = ['scene:', 'scene-', 'daily-']
function isRealWordId(wordId: string): boolean {
  return !SYNTHETIC_ID_PREFIXES.some(p => wordId.startsWith(p))
}

/** 某日 unique 学词数 (view records 去重) */
async function getDayLearnedWords(date: Date): Promise<Set<string>> {
  const { start, end } = dayRange(date)
  const records = await db.records
    .where('timestamp')
    .between(start, end, true, true)
    .toArray()
  const set = new Set<string>()
  for (const r of records) {
    if (r.action === 'view' && isRealWordId(r.wordId)) {
      set.add(r.wordId)
    }
  }
  return set
}

/** 某日跟读次数 */
async function getDayPronunciationCount(date: Date): Promise<number> {
  const { start, end } = dayRange(date)
  const all = await db.pronunciationAttempts.toArray()
  return all.filter(p => p.ts >= start && p.ts <= end).length
}

/** 某日错题数 */
async function getDayErrorCount(date: Date): Promise<number> {
  const { start, end } = dayRange(date)
  const all = await db.writingErrors.toArray()
  return all.filter(e => e.ts >= start && e.ts <= end).length
}

/** 某日新增收藏数 */
async function getDayFavoritesAdded(date: Date): Promise<number> {
  const { start, end } = dayRange(date)
  const all = await db.favorites.toArray()
  return all.filter(f => f.addedAt >= start && f.addedAt <= end).length
}

/** 取 date 对应周一的 Date (周一开始) */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // getDay: 0=Sun, 1=Mon, ..., 6=Sat
  // 周一作为 start, 距周一的天数: (getDay()+6)%7
  const dayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayOffset)
  return d
}

// === 核心 API ===
/** 生成某日日报 */
export async function getDailyReport(date: Date = new Date()): Promise<DailyReport> {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const [wordsSet, pronunciationCount, errorCount, favoritesAdded, streak, totalLearned] = await Promise.all([
    getDayLearnedWords(day),
    getDayPronunciationCount(day),
    getDayErrorCount(day),
    getDayFavoritesAdded(day),
    getStreak(),
    db.records.where('action').equals('view').count().then(async () => {
      // 累计学词 (unique, 过滤非真实词)
      const all = await db.records.where('action').equals('view').toArray()
      return new Set(all.filter(r => isRealWordId(r.wordId)).map(r => r.wordId)).size
    }),
  ])

  const report: DailyReport = {
    date: formatDay(day.getTime()),
    wordsLearned: wordsSet.size,
    pronunciationCount,
    errorCount,
    favoritesAdded,
    streak,
    totalWords: totalLearned,
    encouragement: '',
  }
  report.encouragement = getEncouragement({
    wordsLearned: report.wordsLearned,
    pronunciationCount: report.pronunciationCount,
    errorCount: report.errorCount,
    favoritesAdded: report.favoritesAdded,
    streak: report.streak,
  })
  return report
}

// === 趋势 & 对比 ===
/** 给定一个数值序列, 返回趋势方向 (与前半段平均值对比) */
export function getTrend(values: number[]): WeeklyTrend {
  if (values.length < 2) {
    return { direction: 'flat', emoji: '➡️', delta: 0, pct: 0 }
  }
  // 对比"后一半"和"前一半"平均值
  const mid = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, mid)
  const secondHalf = values.slice(mid)
  const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)
  const delta = secondAvg - firstAvg
  if (Math.abs(delta) < 0.5) {
    return { direction: 'flat', emoji: '➡️', delta: 0, pct: 0 }
  }
  const pct = firstAvg > 0 ? delta / firstAvg : (delta > 0 ? 1 : 0)
  if (delta > 0) {
    return { direction: 'up', emoji: '📈', delta, pct }
  }
  return { direction: 'down', emoji: '📉', delta, pct }
}

/** 当前 vs 上周对比 */
export function getComparison(current: number, previous: number): WeeklyComparison {
  const delta = current - previous
  if (previous === 0) {
    if (current === 0) {
      return { currentWords: current, previousWords: previous, delta: 0, pct: 0, direction: "flat", emoji: '➡️', summary: '与上周持平' }
    }
    return { currentWords: current, previousWords: previous, delta, pct: 1, direction: "up", emoji: '📈', summary: '首次记录 🎉' }
  }
  const pct = delta / previous
  if (Math.abs(pct) < 0.05) {
    return { currentWords: current, previousWords: previous, delta, pct, direction: "flat", emoji: '➡️', summary: '与上周持平' }
  }
  if (pct > 0) {
    const sign = pct >= 1 ? '+100%+' : `+${Math.round(pct * 100)}%`
    return { currentWords: current, previousWords: previous, delta, pct, direction: "up", emoji: '📈', summary: `比上周 ${sign}` }
  }
  return { currentWords: current, previousWords: previous, delta, pct, direction: "down", emoji: '📉', summary: `比上周 ${Math.round(pct * 100)}%` }
}

// === 鼓励文案 (5-8 种) ===
export interface EncouragementStats {
  wordsLearned: number
  pronunciationCount: number
  errorCount: number
  favoritesAdded: number
  streak: number
}

const ENCOURAGEMENTS_HOT: string[] = [
  '太燃了!今天学得真猛,继续乘风破浪 🚀',
  '今天的你比昨天更厉害,不要停!💪',
  '效率开挂的一天,继续保持节奏 ✨',
  '你是这条街上最靓的仔!🌟',
  '学神附体,明天也别客气 🔥',
]

const ENCOURAGEMENTS_STREAK: string[] = [
  '坚持的力量!连续学习太难得了 🔥',
  '连续打卡 N 天,坚持就是胜利 ✊',
  '习惯已养成,继续稳稳向前 🏆',
]

const ENCOURAGEMENTS_OK: string[] = [
  '今天也有在学,真不错!继续加油 👏',
  '每天进步一点点,英语就慢慢流利了 🌱',
  '稳扎稳打,贵在坚持!💎',
  '别急,慢慢来,你已经比昨天好了 ⭐',
]

const ENCOURAGEMENTS_LOW: string[] = [
  '今天节奏慢一点也没关系,明天补上就好 🌷',
  '哪怕一个词,也是进步 🥚',
  '不要紧,起起伏伏才是学习常态 🍀',
]

const ENCOURAGEMENTS_REST: string[] = [
  '今天学得不多?给自己充充电吧 ☕',
  '劳逸结合,明天精神更好 🌙',
  '休息也是学习的一部分 🌿',
]

export function getEncouragement(stats: EncouragementStats): string {
  const { wordsLearned, streak, errorCount } = stats
  // 0 优先级最高: 没学
  if (wordsLearned === 0 && streak === 0) {
    return ENCOURAGEMENTS_REST[Math.floor(Math.random() * ENCOURAGEMENTS_REST.length)]
  }
  // 高强度: 学词 >=10 或 跟读>=5
  if (wordsLearned >= 10) {
    return ENCOURAGEMENTS_HOT[Math.floor(Math.random() * ENCOURAGEMENTS_HOT.length)]
  }
  // 连续 3 天以上
  if (streak >= 3) {
    return ENCOURAGEMENTS_STREAK[Math.floor(Math.random() * ENCOURAGEMENTS_STREAK.length)].replace('N', String(streak))
  }
  // 中等: 学词 1-9
  if (wordsLearned >= 1) {
    return ENCOURAGEMENTS_OK[Math.floor(Math.random() * ENCOURAGEMENTS_OK.length)]
  }
  // 没学词但有 streak
  if (streak >= 1) {
    return ENCOURAGEMENTS_OK[Math.floor(Math.random() * ENCOURAGEMENTS_OK.length)]
  }
  // 错题>=3 但没学词: 改错也算学
  if (errorCount >= 3) {
    return '今天专注改错,严谨的学习态度 ✏️'
  }
  return ENCOURAGEMENTS_LOW[Math.floor(Math.random() * ENCOURAGEMENTS_LOW.length)]
}

// === 周报 ===
/** 生成周报 (weekStart: 周一 Date) */
export async function getWeeklyReport(weekStart: Date = getWeekStart(new Date())): Promise<WeeklyReport> {
  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)

  // 7 天日报
  const dailyReports: DailyReport[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const r = await getDailyReport(day)
    dailyReports.push(r)
  }

  const totalWordsLearned = dailyReports.reduce((s, d) => s + d.wordsLearned, 0)
  const trendValues = dailyReports.map(d => d.wordsLearned)
  const trend = getTrend(trendValues)

  // 上周对比
  const prevWeekStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prevStart = prevWeekStart.getTime()
  const prevEnd = start.getTime() - 1
  const prevRecords = await db.records
    .where('timestamp')
    .between(prevStart, prevEnd, true, true)
    .toArray()
  const prevUnique = new Set<string>()
  for (const r of prevRecords) {
    if (r.action === 'view' && isRealWordId(r.wordId)) {
      prevUnique.add(r.wordId)
    }
  }
  const comparison = getComparison(totalWordsLearned, prevUnique.size)

  // Top 5 学词 (本周 view 记录按 wordId 计数)
  const weekStartMs = start.getTime()
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000 - 1
  const weekRecords = await db.records
    .where('timestamp')
    .between(weekStartMs, weekEndMs, true, true)
    .toArray()
  const wordCount = new Map<string, number>()
  for (const r of weekRecords) {
    if (r.action === 'view' && isRealWordId(r.wordId)) {
      wordCount.set(r.wordId, (wordCount.get(r.wordId) || 0) + 1)
    }
  }
  const topWordIds = Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topWords: Array<{ word: Word; count: number }> = []
  for (const [wid, count] of topWordIds) {
    const w = await getWord(wid)
    if (w) topWords.push({ word: w, count })
  }

  // Top 5 错题
  const weekErrors = await db.writingErrors
    .where('ts')
    .between(weekStartMs, weekEndMs, true, true)
    .toArray()
  const topErrors = weekErrors
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5)
    .map(e => ({ original: e.original, corrected: e.corrected, ts: e.ts }))

  // 周报鼓励: 基于 totalWords + comparison 方向
  let encouragement: string
  if (totalWordsLearned === 0) {
    encouragement = '本周还没开始,随时都可以出发 🚀'
  } else if (comparison.direction === 'up') {
    encouragement = `本周比上周更强!${comparison.summary} 📈`
  } else if (comparison.direction === 'down') {
    encouragement = '本周节奏放缓,下周一起冲回来 💪'
  } else {
    encouragement = '本周稳如老狗,继续保持!🐶'
  }

  const endTs = start.getTime() + 7 * 24 * 60 * 60 * 1000
  return {
    weekStart: formatDay(start.getTime()),
    totalWordsLearned,
    dailyReports,
    trend,
    comparison,
    topWords,
    topErrors,
    encouragement,
    // v1.28.0 W29: 3 新增
    weakRoots: await getWeakRoots(start.getTime(), endTs),
    hourDistribution: await getHourDistribution(start.getTime(), endTs),
    weeklyRetention: await getWeeklyRetention(),
  }
}

// === v1.28.0 W29 新增函数 ===

/** 弱项词根: 错题记录中含词根的 error 计数 Top 5 */
export async function getWeakRoots(
  startTs: number,
  endTs: number,
): Promise<Array<{ root: string; errorCount: number }>> {
  try {
    const { db } = await import('./db')
    const errors = await db.writingErrors
      .where('ts')
      .between(startTs, endTs)
      .toArray()
    if (errors.length === 0) return []

    // 累计每个 original 的错误数
    const wordErrorCount = new Map<string, number>()
    for (const e of errors) {
      const key = (e as any).original || (e as any).wordId
      if (!key) continue
      wordErrorCount.set(key, (wordErrorCount.get(key) || 0) + 1)
    }

    // 按错误数排序, 取前 5 个 wordId
    const top = Array.from(wordErrorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([wordId, errorCount]) => ({ root: wordId, errorCount }))
    return top
  } catch {
    return []
  }
}

/** 24 时段分布: 0-23 每小时学习次数 */
export async function getHourDistribution(
  startTs: number,
  endTs: number,
): Promise<Array<{ hour: number; count: number }>> {
  try {
    const { db } = await import('./db')
    const records = await db.records
      .where('timestamp')
      .between(startTs, endTs)
      .toArray()
    const hours = new Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }))
    for (const r of records) {
      const h = new Date(r.timestamp).getHours()
      hours[h].count++
    }
    return hours
  } catch {
    return new Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }))
  }
}

/** 7 天平均 retention: 复习正确率 (0-1) */
export async function getWeeklyRetention(): Promise<number> {
  try {
    const { db } = await import('./db')
    const all = await db.reviews.toArray()
    if (all.length === 0) return 0
    // retention ~ 1 - (1/easeFactor) 的平均
    // easeFactor 越高, retention 越高
    const sum = all.reduce((s, r) => s + (1 - 1 / (r.easeFactor || 2.5)), 0)
    return Math.min(1, sum / all.length)
  } catch {
    return 0
  }
}
