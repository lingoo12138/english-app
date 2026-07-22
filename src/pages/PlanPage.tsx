// 计划页 - v0.22.5
// 7 天完成曲线 + 当日统计 + 总结
import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { generateTodayPlan, markWordCompleted, type TodayPlan } from '../lib/plan'
import { Link } from 'react-router-dom'
import { levelColor, levelLabel } from '../lib/learnReport'

interface DayProgress {
  date: string  // YYYY-MM-DD
  count: number  // 完成数
  goal: number   // 当日目标
  pct: number
}

export default function PlanPage() {
  const dailyGoal = useStore(s => s.dailyGoal)
  const targetLevel = useStore(s => s.targetLevel)
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [history, setHistory] = useState<DayProgress[]>([])
  const [streak, setStreak] = useState(0)
  const [totalAll, setTotalAll] = useState(0)
  // P2 修: 词列表完成态用 state 同步, 不用 inline localStorage
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    refresh()
  }, [dailyGoal, targetLevel])

  const refresh = async () => {
    const p = await generateTodayPlan(dailyGoal, targetLevel)
    setPlan(p)
    computeHistory()
  }

  // 7 天历史(从 localStorage)
  // P1 修: 倒序连续天数 (从今天往前数, 连续 count>=goal 的天数)
  // P1 修: 用 dailyGoal 快照, 不用当前 dailyGoal
  const computeHistory = () => {
    const days: DayProgress[] = []
    let total = 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      let count = 0
      let storedGoal = 0
      try {
        const raw = localStorage.getItem('plan-progress-' + key)
        if (raw) {
          const data = JSON.parse(raw)
          if (Array.isArray(data)) count = data.length
          else {
            count = (data.completed || []).length
            storedGoal = data.goal || 0
          }
        }
      } catch {}
      const goal = storedGoal > 0 ? storedGoal : dailyGoal
      const pct = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0
      days.push({ date: key, count, goal, pct })
      total += count
    }
    // 倒序连续天数: 从最后一天(今天)往前数, 连续 count>=goal 的天数
    let s = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count >= days[i].goal && days[i].goal > 0) s++
      else break
    }
    setHistory(days)
    setStreak(s)
    setTotalAll(total)
    // 同步今日完成集合
    const todayKey = days[days.length - 1]?.date
    if (todayKey) {
      const raw = localStorage.getItem('plan-progress-' + todayKey)
      if (raw) {
        const data = JSON.parse(raw)
        const arr = Array.isArray(data) ? data : (data.completed || [])
        setCompletedSet(new Set(arr))
      }
    }
  }

  const handleMark = async (wordId: string) => {
    markWordCompleted(wordId, undefined, dailyGoal)
    await refresh()
  }

  if (!plan) {
    return <div className="card text-center py-8">加载中...</div>
  }

  const maxCount = Math.max(...history.map(d => d.count), dailyGoal, 1)
  const completedDays = history.filter(d => d.count >= d.goal).length
  const weekAvg = history.length > 0 ? Math.round(totalAll / history.length) : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">📅 学习计划</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">每日目标 {dailyGoal} 词 · {targetLevel === 'all' ? '全部' : targetLevel}</p>
      </div>

      {/* 7 天曲线 */}
      <div className="card">
        <h2 className="font-semibold mb-3">📊 近 7 天</h2>
        <div className="flex items-end gap-2 h-32 mb-2">
          {history.map(d => {
            const today = d.date === history[history.length - 1]?.date
            const dayLabel = d.date.slice(5)  // MM-DD
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-stone-500 dark:text-stone-400">{d.count}</div>
                <div
                  className={`w-full rounded-t transition-all ${
                    d.count >= d.goal
                      ? 'bg-gradient-to-t from-emerald-500 to-emerald-300'
                      : today
                      ? 'bg-gradient-to-t from-cyan-500 to-cyan-300 animate-pulse'
                      : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '8px' }}
                />
                <div className={`text-[10px] ${today ? 'font-bold text-brand-600' : 'text-stone-400'}`}>
                  {dayLabel}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-700">
          <span>完成日 {completedDays}/7</span>
          <span>日均 {weekAvg} 词</span>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{streak}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">连续天数 🔥</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{completedDays}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">完成 7 天中</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{totalAll}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">总学词(7天)</div>
        </div>
      </div>

      {/* 今日详情 */}
      <div className="card">
        <h2 className="font-semibold mb-3">📌 今日详情</h2>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-brand-600">{plan.completed}</span>
          <span className="text-stone-500 dark:text-stone-400">/ {plan.total}</span>
          <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">({plan.progressPct}%)</span>
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
            style={{ width: `${plan.progressPct}%` }}
          />
        </div>

        {/* 词列表 */}
        {plan.words.length > 0 && (
          <div className="space-y-1.5">
            {plan.words.map(w => {
              const isCompleted = completedSet.has(w.id)
              return (
                <div key={w.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => handleMark(w.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-stone-300 dark:border-stone-600 hover:border-emerald-500'
                    }`}
                  >
                    {isCompleted ? '✓' : ''}
                  </button>
                  <Link to={`/words/${w.id}`} className="flex-1 truncate hover:underline">
                    {w.word}
                  </Link>
                  {w.level && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${levelColor(w.level)}`}>
                      {w.level}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {plan.isDone && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
            🎉 今日计划已全部完成!继续保持
          </p>
        )}
      </div>

      {/* 提示 */}
      <div className="text-xs text-stone-500 dark:text-stone-400 text-center py-2">
        💡 访问词详情时自动标记完成,也可手动点 ✓
      </div>
    </div>
  )
}
