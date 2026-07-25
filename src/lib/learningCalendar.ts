// learningCalendar.ts - v1.19.0 B9 学习日历
// 复用 v1.11 learningReport.getDailyReport 数据
// 7×N 网格月历 + 热力图配色
import { getDailyReport } from './learningReport'

/** 日历格子数据 */
export interface CalendarDay {
  date: Date
  dateKey: string       // YYYY-MM-DD
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  actionCount: number   // 动作总数 (pronunciationCount + errorCount + favoritesAdded)
  wordCount: number     // 学词数
  hasData: boolean      // 是否有学习数据
}

/** 月历数据 */
export interface CalendarMonth {
  year: number
  month: number         // 0-11
  monthName: string     // "2026 年 7 月"
  weeks: CalendarDay[][]  // 6-7 周 (周日-周六)
  totalActions: number  // 月累计动作
  totalWords: number    // 月累计词
  activeDays: number    // 有数据的天数
  daysInMonth: number   // 当月天数
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 月份名 */
export function getMonthName(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`
}

/** 当月天数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** 热力图等级 (0-4) */
export function getHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 5) return 1
  if (count <= 15) return 2
  if (count <= 30) return 3
  return 4
}

/** 热度色 */
export const HEATMAP_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-stone-100 dark:bg-stone-800',  // 无
  1: 'bg-emerald-100 dark:bg-emerald-900/30',  // 浅
  2: 'bg-emerald-300 dark:bg-emerald-700/50',  // 中
  3: 'bg-emerald-500 dark:bg-emerald-500',  // 深
  4: 'bg-emerald-700 dark:bg-emerald-300',  // 极深 (深色模式下亮)
}

/** 取某日 DailyReport 的动作数 */
function getDayActionCount(daily: { pronunciationCount: number; errorCount: number; favoritesAdded: number }): number {
  return daily.pronunciationCount + daily.errorCount + daily.favoritesAdded
}

/** 取月历数据 (含上下月填充) */
export async function getCalendarMonth(year: number, month: number): Promise<CalendarMonth> {
  const today = new Date()
  const todayKey = formatDateKey(today)
  const daysInMonth = getDaysInMonth(year, month)

  // 当月所有日期
  const currentMonthDays: Date[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    currentMonthDays.push(new Date(year, month, d))
  }

  // 第一格 = 当月 1 号所在周的周日
  const firstDayOfWeek = currentMonthDays[0].getDay()  // 0=Sun
  const startDate = new Date(year, month, 1 - firstDayOfWeek)

  // 总共 6 周 (42 格), 足以覆盖任何月
  const totalCells = 42
  const allDates: Date[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    allDates.push(d)
  }

  // 并行取每日数据
  const dailyReports = await Promise.all(
    allDates.map(d => getDailyReport(d)),
  )

  // 构造 weeks
  const weeks: CalendarDay[][] = []
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d
      const date = allDates[idx]
      const daily = dailyReports[idx]
      const actionCount = getDayActionCount(daily)
      week.push({
        date,
        dateKey: formatDateKey(date),
        dayOfMonth: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: formatDateKey(date) === todayKey,
        actionCount,
        wordCount: daily.wordsLearned,
        hasData: actionCount > 0 || daily.wordsLearned > 0,
      })
    }
    weeks.push(week)
  }

  // 累计当月
  const currentMonthCells = weeks.flat().filter(c => c.isCurrentMonth)
  const totalActions = currentMonthCells.reduce((s, c) => s + c.actionCount, 0)
  const totalWords = currentMonthCells.reduce((s, c) => s + c.wordCount, 0)
  const activeDays = currentMonthCells.filter(c => c.hasData).length

  return {
    year,
    month,
    monthName: getMonthName(year, month),
    weeks,
    totalActions,
    totalWords,
    activeDays,
    daysInMonth,
  }
}

/** 月累计动作数 (同步, 不查 IDB) */
export function getMonthActionCountSync(year: number, month: number): number {
  return 0  // 占位, 实际异步用 getCalendarMonth
}

/** 月累计词数 (同步, 不查 IDB) */
export function getMonthWordCountSync(year: number, month: number): number {
  return 0  // 占位
}

/** 调整月份 (返回新 year/month) */
export function adjustMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return {
    year: Math.floor(total / 12),
    month: total % 12,
  }
}

/** 是否当月 */
export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date()
  return year === now.getFullYear() && month === now.getMonth()
}
