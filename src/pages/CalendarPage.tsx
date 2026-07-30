// CalendarPage.tsx - v1.19.0 B9 学习日历
// 7×N 网格 + 热力图 + 月份切换
import { useState, useEffect } from 'react'
import { useTranslate } from '../lib/useTranslate'
import { Link } from 'react-router-dom'
import {
  getCalendarMonth,
  adjustMonth,
  isCurrentMonth,
  getHeatmapLevel,
  HEATMAP_COLORS,
  type CalendarMonth as CalData,
} from '../lib/learningCalendar'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarPage() {
  const { t } = useTranslate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [data, setData] = useState<CalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getCalendarMonth(year, month)
      .then(d => setData(d))
      .catch(e => console.error('[CalendarPage] load failed:', e))
      .finally(() => setLoading(false))
  }, [year, month])

  const handlePrev = () => {
    const next = adjustMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }
  const handleNext = () => {
    const next = adjustMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }
  const handleToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📅 {t('calendar.title')}</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          月度学习可视化 · 颜色越深 = 学习越多
        </p>
      </div>

      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="btn-ghost text-sm"
          aria-label="上一月"
        >
          ← 上一月
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {data ? data.monthName : `${year} 年 ${month + 1} 月`}
          </h2>
          {!isCurrentMonth(year, month) && (
            <button
              onClick={handleToday}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              aria-label="回到本月"
            >
              今天
            </button>
          )}
        </div>
        <button
          onClick={handleNext}
          className="btn-ghost text-sm"
          aria-label="下一月"
        >
          下一月 →
        </button>
      </div>

      {/* 月度统计 */}
      {data && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="card p-3">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.totalActions}
            </div>
            <div className="text-xs text-stone-500 mt-1">月动作数</div>
          </div>
          <div className="card p-3">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {data.totalWords}
            </div>
            <div className="text-xs text-stone-500 mt-1">月学词数</div>
          </div>
          <div className="card p-3">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {data.activeDays} / {data.daysInMonth}
            </div>
            <div className="text-xs text-stone-500 mt-1">活跃天数</div>
          </div>
        </div>
      )}

      {/* 日历网格 */}
      {loading ? (
        <div className="text-center py-8 text-stone-500">⏳ 加载中...</div>
      ) : data ? (
        <section className="card">
          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-xs font-medium text-stone-500 dark:text-stone-400 py-1">
                {w}
              </div>
            ))}
          </div>
          {/* 日期格子 */}
          <div className="space-y-1">
            {data.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const level = getHeatmapLevel(day.actionCount)
                  const colorClass = HEATMAP_COLORS[level]
                  return (
                    <div
                      key={day.dateKey}
                      title={`${day.dateKey} - 动作 ${day.actionCount} 个, 词 ${day.wordCount} 个${day.isToday ? ' (今天)' : ''}`}
                      className={`aspect-square rounded text-center flex flex-col items-center justify-center cursor-default ${colorClass} ${
                        day.isCurrentMonth ? '' : 'opacity-30'
                      } ${day.isToday ? 'ring-2 ring-emerald-500' : ''}`}
                      aria-label={`${day.dateKey} 动作 ${day.actionCount} 个, 词 ${day.wordCount} 个`}
                    >
                      <div className={`text-sm font-medium ${day.isCurrentMonth ? '' : 'text-stone-400'}`}>
                        {day.dayOfMonth}
                      </div>
                      {day.hasData && day.isCurrentMonth && (
                        <div className="text-[10px] text-stone-700 dark:text-stone-200">
                          {day.actionCount}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {/* 图例 */}
          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-stone-500">
            <span>少</span>
            {([0, 1, 2, 3, 4] as const).map(level => (
              <div
                key={level}
                className={`w-4 h-4 rounded ${HEATMAP_COLORS[level]}`}
                title={`等级 ${level}`}
              />
            ))}
            <span>多</span>
          </div>
        </section>
      ) : null}

      {/* 跳转链接 */}
      <div className="text-center">
        <Link to="/reports" className="btn-ghost text-sm">
          📊 查看日报/周报
        </Link>
      </div>
    </div>
  )
}
