// 学习日历 - GitHub 风格热力图
import { useState, useEffect } from 'react'
import { getDailyStats, formatDay, getStreak, getTotalDays } from '../lib/streak'

interface CalendarProps {
  days?: number  // 显示多少天
  compact?: boolean
}

export default function StudyCalendar({ days = 84, compact = false }: CalendarProps) {
  const [stats, setStats] = useState<Map<string, number>>(new Map())
  const [streak, setStreak] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [days])

  async function loadData() {
    setLoading(true)
    const [dayStats, streakCount, totalD] = await Promise.all([
      getDailyStats(days),
      getStreak(),
      getTotalDays(),
    ])
    setStats(dayStats)
    setStreak(streakCount)
    setTotalDays(totalD)
    setLoading(false)
  }

  // 计算网格(7 列 = 一周,每天一行)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDayOfWeek = today.getDay()  // 0=周日

  // 从今天往前数 days 天
  // 网格布局:每一列是一个"周",每行是周一/二/.../周日
  // 我们要做成"水平网格,最近日期在最右"
  // 先算出所有要展示的日期
  const dates: { date: Date; count: number; dayStr: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStr = formatDay(d.getTime())
    dates.push({
      date: d,
      count: stats.get(dayStr) || 0,
      dayStr,
    })
  }

  // 找到第一天的星期几,在前面补空白
  const firstDate = dates[0]?.date
  const firstDayOfWeek = firstDate ? firstDate.getDay() : 0

  // 颜色梯度(0,1-2,3-5,6-10,11+)
  function getColor(count: number): string {
    if (count === 0) return 'bg-stone-100 dark:bg-stone-800'
    if (count <= 2) return 'bg-brand-100 dark:bg-brand-900/40'
    if (count <= 5) return 'bg-brand-300 dark:bg-brand-700/60'
    if (count <= 10) return 'bg-brand-500 dark:bg-brand-500'
    return 'bg-brand-700 dark:bg-brand-400'
  }

  // 月份分隔(只显示 1 号的月份)
  const monthLabels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  dates.forEach((d, idx) => {
    const dayOfWeek = d.date.getDay()
    if (dayOfWeek === 0 && d.date.getDate() <= 7) {
      const m = d.date.getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ weekIndex: idx, label: `${m + 1}月` })
        lastMonth = m
      }
    }
  })

  const cellSize = compact ? 'w-3 h-3' : 'w-4 h-4'
  const gap = compact ? 'gap-0.5' : 'gap-1'

  if (loading) {
    return <div className="text-stone-400 text-sm">加载中...</div>
  }

  return (
    <div>
      {/* 统计摘要 */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-2xl font-bold text-brand-600">{streak} 天</div>
          <div className="text-xs text-stone-500">连续打卡</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{totalDays} 天</div>
          <div className="text-xs text-stone-500">累计打卡</div>
        </div>
      </div>

      {/* 月份标签 */}
      <div className={`flex ${gap} mb-1 pl-${firstDayOfWeek}`}>
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-[10px] text-stone-400"
            style={{ marginLeft: i === 0 ? 0 : 'auto' }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* 热力图 */}
      <div className="overflow-x-auto">
        <div className={`inline-flex flex-col ${gap} min-w-full`}>
          {/* 星期标签(左侧) */}
          <div className="flex">
            <div className={`flex flex-col ${gap} mr-1.5 pt-0.5`}>
              {['', '一', '', '三', '', '五', ''].map((d, i) => (
                <div key={i} className={`${cellSize} text-[10px] text-stone-400 leading-none`}>
                  {d}
                </div>
              ))}
            </div>

            {/* 网格:7 行(天) × N 列(周) */}
            <div className="flex flex-col">
              {/* 顶部空白(对齐第一周) */}
              <div className="flex" style={{ marginBottom: 0 }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className={`${cellSize} ${gap}`} />
                ))}
                {/* 然后按列填充 */}
                {Array.from({ length: Math.ceil((dates.length + firstDayOfWeek) / 7) }).map((_, weekIdx) => (
                  <div key={weekIdx} className={`flex flex-col ${gap} mr-0.5`}>
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const dateIdx = weekIdx * 7 + dayIdx - firstDayOfWeek
                      if (dateIdx < 0 || dateIdx >= dates.length) {
                        return <div key={dayIdx} className={cellSize} />
                      }
                      const d = dates[dateIdx]
                      const isToday = d.dayStr === formatDay(Date.now())
                      return (
                        <div
                          key={dayIdx}
                          className={`${cellSize} rounded-sm ${getColor(d.count)} ${
                            isToday ? 'ring-2 ring-brand-600 ring-offset-1 dark:ring-offset-stone-900' : ''
                          }`}
                          title={`${d.dayStr}: 学了 ${d.count} 个词`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 颜色图例 */}
      <div className="flex items-center gap-2 mt-3 text-xs text-stone-500">
        <span>少</span>
        <div className={`${cellSize} rounded-sm bg-stone-100 dark:bg-stone-800`} />
        <div className={`${cellSize} rounded-sm bg-brand-100 dark:bg-brand-900/40`} />
        <div className={`${cellSize} rounded-sm bg-brand-300 dark:bg-brand-700/60`} />
        <div className={`${cellSize} rounded-sm bg-brand-500`} />
        <div className={`${cellSize} rounded-sm bg-brand-700 dark:bg-brand-400`} />
        <span>多</span>
      </div>
    </div>
  )
}
