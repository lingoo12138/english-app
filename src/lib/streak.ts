// 学习数据统计
import { db } from './db'
import type { LearnRecord } from '../types'

// 获取所有学习记录(只取 view 动作)
export async function getAllViewRecords(): Promise<LearnRecord[]> {
  return await db.records.where('action').equals('view').toArray()
}

// 按天聚合:每天学的 unique 词数
export async function getDailyStats(days: number = 90): Promise<Map<string, number>> {
  const start = Date.now() - days * 24 * 60 * 60 * 1000
  const records = await db.records
    .where('timestamp')
    .above(start)
    .toArray()

  const dayMap = new Map<string, Set<string>>()
  for (const r of records) {
    if (r.action === 'view') {
      const day = formatDay(r.timestamp)
      if (!dayMap.has(day)) dayMap.set(day, new Set())
      dayMap.get(day)!.add(r.wordId)
    }
  }

  const countMap = new Map<string, number>()
  for (const [day, set] of dayMap) {
    countMap.set(day, set.size)
  }
  return countMap
}

// 格式化日期为 YYYY-MM-DD
export function formatDay(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 计算连续打卡天数(到今天为止)
export async function getStreak(): Promise<number> {
  const stats = await getDailyStats(365)
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 从今天往回数
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const day = formatDay(checkDate.getTime())
    if (stats.has(day) && stats.get(day)! > 0) {
      streak++
    } else if (i === 0) {
      // 今天没学,不算断(给用户机会),从昨天开始算
      continue
    } else {
      break
    }
  }
  return streak
}

// === v1.41.0 W41 streak 升级 ===

/** 连续里程碑 */
export interface StreakMilestone {
  days: number
  emoji: string
  label: string
  reached: boolean
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, emoji: '🌱', label: '起步', reached: false },
  { days: 7, emoji: '🔥', label: '周坚持', reached: false },
  { days: 14, emoji: '⚡', label: '两周', reached: false },
  { days: 30, emoji: '🏆', label: '月度', reached: false },
  { days: 60, emoji: '💎', label: '双月', reached: false },
  { days: 100, emoji: '👑', label: '百日', reached: false },
  { days: 365, emoji: '🎉', label: '年度', reached: false },
]

/** 拿 streak + 里程碑状态 */
export async function getStreakWithMilestones(): Promise<{
  current: number
  longest: number
  milestones: StreakMilestone[]
  nextMilestone: StreakMilestone | null
  daysToNext: number
}> {
  const current = await getStreak()
  const longest = await getLongestStreak()
  const milestones = STREAK_MILESTONES.map(m => ({
    ...m,
    reached: current >= m.days,
  }))
  const nextMilestone = milestones.find(m => !m.reached) || null
  const daysToNext = nextMilestone ? nextMilestone.days - current : 0
  return { current, longest, milestones, nextMilestone, daysToNext }
}

/** 拿历史最长 streak (从 records 算) */
export async function getLongestStreak(): Promise<number> {
  const stats = await getDailyStats(3650)
  const days = Array.from(stats.entries())
    .filter(([_, count]) => count > 0)
    .map(([day]) => day)
    .sort()
  if (days.length === 0) return 0

  let longest = 1
  let current = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000
    if (Math.round(diff) === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

/** Streak 状态 (给 UI 提示) */
export function getStreakMessage(current: number): {
  emoji: string
  message: string
  isWarning: boolean  // < 3 警告
} {
  if (current === 0) {
    return { emoji: '😴', message: '今天还没学, 学 5 分钟恢复一下', isWarning: true }
  }
  if (current === 1) {
    return { emoji: '🌱', message: '连续 1 天, 加油!', isWarning: false }
  }
  if (current < 3) {
    return { emoji: '🌿', message: `连续 ${current} 天, 不错的开始!`, isWarning: false }
  }
  if (current < 7) {
    return { emoji: '🔥', message: `连续 ${current} 天, 别断!`, isWarning: false }
  }
  if (current < 30) {
    return { emoji: '⚡', message: `连续 ${current} 天, 习惯养成中!`, isWarning: false }
  }
  if (current < 100) {
    return { emoji: '🏆', message: `连续 ${current} 天, 你是达人!`, isWarning: false }
  }
  return { emoji: '👑', message: `连续 ${current} 天, 传说级别!`, isWarning: false }
}

// 总学习天数(学过的总天数)
export async function getTotalDays(): Promise<number> {
  const stats = await getDailyStats(3650)  // 10 年
  return stats.size
}

// 错词/薄弱词:被标记为 unknown 最多的词
export async function getWeakWords(limit: number = 20): Promise<{ wordId: string; count: number }[]> {
  const unknownRecords = await db.records.where('action').equals('unknown').toArray()
  const counter = new Map<string, number>()
  for (const r of unknownRecords) {
    counter.set(r.wordId, (counter.get(r.wordId) || 0) + 1)
  }
  return Array.from(counter.entries())
    .map(([wordId, count]) => ({ wordId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// 收藏词数
export async function getFavoriteCount(): Promise<number> {
  return await db.favorites.count()
}
