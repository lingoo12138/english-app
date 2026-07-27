// 计划页 - v0.22.5
// 7 天完成曲线 + 当日统计 + 总结
import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { generateTodayPlan, markWordCompleted, type TodayPlan } from '../lib/plan'
// v1.37.0 W35-4: AI 定制多日计划
import { generateAIPlan, type AIPlan } from '../lib/aiPlanGenerator'
import { Link } from 'react-router-dom'
import { levelColor, levelLabel } from '../lib/learnReport'
import { BUILTIN_LLM_PROVIDERS } from '../lib/providers/llm'
import { toast } from '../components/Toast'
import { getXPState, type XPCurrentState } from '../lib/xpSystem'

interface DayProgress {
  date: string  // YYYY-MM-DD
  count: number  // 完成数
  goal: number   // 当日目标
  pct: number
}

export default function PlanPage() {
  const dailyGoal = useStore(s => s.dailyGoal)
  // v1.37.0 W35-4: AI 计划 modal
  const [showAIPlan, setShowAIPlan] = useState(false)
  const [aiPlan, setAIPlan] = useState<AIPlan | null>(null)
  const [aiPlanLoading, setAIPlanLoading] = useState(false)
  const targetLevel = useStore(s => s.targetLevel)
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  // v1.46.0 W45: XP 状态 (复用 lib/xpSystem)
  const [xpState, setXpState] = useState<XPCurrentState>(() => getXPState())
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
  }

  // v1.37.0 W35-4: AI 计划生成 handler
  const handleGenerateAIPlan = async () => {
    setAIPlanLoading(true)
    try {
      const llmProviderId = useStore.getState().llmProviderId
      const llmApiKeys = useStore.getState().llmApiKeys
      const llmModels = useStore.getState().llmModels
      const provider = BUILTIN_LLM_PROVIDERS.find(p => p.id === llmProviderId)
      if (!provider) {
        toast.error('未选择 LLM 渠道')
        return
      }
      const plan = await generateAIPlan(
        {
          currentLevel: 'A2',
          targetLevel: targetLevel === 'all' ? 'B2' : (targetLevel as string),
          goal: 'work',
          dailyMinutes: dailyGoal * 2,
          totalDays: 7,
          knownWordCount: 0,
        },
        provider,
        llmApiKeys[llmProviderId] || '',
        llmModels[llmProviderId] || provider.defaultModel || '',
      )
      setAIPlan(plan)
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message)
    } finally {
      setAIPlanLoading(false)
    }
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
        {/* v1.43.0 W43-A: 推荐难度 (CEFR) */}
        {plan.difficulty && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs">
            🎯 推荐难度: <strong>{plan.difficulty}</strong>
          </div>
        )}
        {/* v1.46.0 W45: XP 进度条 (复用 lib/xpSystem) */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold">
            Lv.{xpState.level} {xpState.levelTitle}
          </span>
          <div className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, xpState.progress * 100))}%` }}
            />
          </div>
          <span className="text-stone-500 dark:text-stone-400">{xpState.totalXP} XP</span>
        </div>
        {/* v1.37.0 W35-4: AI 定制计划 */}
        <button
          onClick={() => setShowAIPlan(true)}
          className="text-xs mt-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
        >🤖 AI 定制多日计划</button>
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

      {/* v1.37.0 W35-4: AI 计划 modal */}
      {showAIPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAIPlan(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">🤖 AI 定制多日计划</h3>
              <button onClick={() => setShowAIPlan(false)} className="text-stone-500">✕</button>
            </div>
            {!aiPlan ? (
              <div className="text-center py-8">
                <button
                  onClick={handleGenerateAIPlan}
                  disabled={aiPlanLoading}
                  className="btn-primary"
                >
                  {aiPlanLoading ? '⏳ 生成中...' : '✨ 生成 7 天计划'}
                </button>
                <p className="text-xs text-stone-500 mt-2">使用当前 LLM 渠道, 消耗 1 次 explain 额度</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded text-sm">
                  <div className="font-semibold mb-1">📌 策略</div>
                  {aiPlan.strategy}
                </div>
                <div className="text-xs text-stone-500">预计学 {aiPlan.estimatedWords} 词</div>
                {aiPlan.tasks.map(t => (
                  <div key={t.day} className="p-3 border border-stone-200 dark:border-stone-700 rounded">
                    <div className="font-semibold text-sm">第 {t.day} 天 · {t.theme}</div>
                    <div className="text-xs text-stone-500 mt-1">
                      新词 {t.newWords} · 复习 {t.reviewWords} · {t.focusSkills.join(' + ')}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">💡 {t.tip}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
