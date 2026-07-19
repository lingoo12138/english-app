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
