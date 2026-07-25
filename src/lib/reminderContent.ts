// reminderContent.ts - v1.24.0 W25 学习提醒动态内容
// 复用 v1.11 reviewQueue/learningReport + IDB, 给 reminder 生成动态文案
import { db } from './db'
import { getDueReviews } from './db'
import { getDailyReport } from './learningReport'

/** 估算复习 1 个词需要 0.5 分钟, 新词 0.3 分钟 */
const MIN_PER_REVIEW = 0.5
const MIN_PER_NEW = 0.3

/** 今日数据汇总 (给 reminder 用) */
export interface ReminderStats {
  dueCount: number
  newCount: number
  learnedToday: number
  minutes: number
  daysInactive: number
}

/** 拿今日到期 + 新词 + 学词 + 不活跃天数 */
export async function getReminderStats(): Promise<ReminderStats> {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [dueReviews, dailyReport, todayFavorites, lastTs] = await Promise.all([
    getDueReviews(),
    getDailyReport(now),
    db.favorites
      .where('addedAt')
      .between(today.getTime(), tomorrow.getTime())
      .count(),
    getLastStudyTimestamp(),
  ])

  const dueCount = dueReviews.length
  const newCount = todayFavorites
  const minutes = Math.max(1, Math.round(dueCount * MIN_PER_REVIEW + newCount * MIN_PER_NEW))
  const daysInactive = lastTs
    ? Math.floor((now.getTime() - lastTs) / 86_400_000)
    : 0

  return {
    dueCount,
    newCount,
    learnedToday: dailyReport.wordsLearned,
    minutes,
    daysInactive,
  }
}

/** 拿最近学习时间戳 (从 records 表) — 给不活跃检测用 */
export async function getLastStudyTimestamp(): Promise<number | null> {
  try {
    const rec = await db.records.orderBy('timestamp').reverse().first()
    return rec?.timestamp ?? null
  } catch {
    return null
  }
}

/** 生成动态通知正文 (核心函数) */
export async function buildReminderBody(): Promise<string> {
  const stats = await getReminderStats()

  // 1) 不活跃召回 (最高优先级)
  if (stats.daysInactive >= 3) {
    return `别断! ${stats.daysInactive} 天前你学了 ${stats.learnedToday} 个词, 今天 5 分钟恢复一下`
  }

  // 2) 有复习
  if (stats.dueCount > 0) {
    if (stats.newCount > 0) {
      return `${stats.dueCount} 个复习 + ${stats.newCount} 个新词, ${stats.minutes} 分钟搞定`
    }
    return `${stats.dueCount} 个复习, ${stats.minutes} 分钟搞定`
  }

  // 3) 有新词
  if (stats.newCount > 0) {
    return `${stats.newCount} 个新词, ${stats.minutes} 分钟搞定`
  }

  // 4) 啥也没 — 引导学
  return '今天 0 个复习, 学 3 个新词 1 分钟搞定'
}

/** 估算学习时长 (分钟) — 给 Settings 预览用 */
export function estimateMinutes(dueCount: number, newCount: number): number {
  return Math.max(1, Math.round(dueCount * MIN_PER_REVIEW + newCount * MIN_PER_NEW))
}
