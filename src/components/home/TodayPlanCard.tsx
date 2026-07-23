// W4-B: Home 拆组件 - 今日学习计划
import { Link } from 'react-router-dom'
import type { TodayPlan } from '../../lib/plan'

interface Props {
  plan: TodayPlan
  onMarkWord: (wordId: string) => void
}

export default function TodayPlanCard({ plan, onMarkWord }: Props) {
  return (
    <div className="card bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">📅 今日学习计划</h2>
        <span className="text-xs text-stone-500 dark:text-stone-400">{plan.date}</span>
      </div>

      {/* 进度 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-brand-600">{plan.completed}</span>
            <span className="text-stone-500 dark:text-stone-400">/ {plan.total}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">
              ({plan.progressPct}%)
            </span>
          </div>
          <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
              style={{ width: `${plan.progressPct}%` }}
            />
          </div>
        </div>
        {plan.isDone ? (
          <div className="text-3xl">🎉</div>
        ) : (
          <div className="flex flex-col gap-1">
            <Link to="/words" className="btn-primary text-sm whitespace-nowrap">
              开始学习 →
            </Link>
            <Link to="/plan" className="text-[10px] text-stone-500 dark:text-stone-400 text-center">
              看完整 →
            </Link>
          </div>
        )}
      </div>

      {/* 词列表 + 一键标记 */}
      {!plan.isDone && plan.words.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
          {plan.words.map(w => {
            const isCompleted = (() => {
              try {
                const raw = localStorage.getItem('plan-progress-' + plan.date)
                if (!raw) return false
                const parsed = JSON.parse(raw)
                // v0.22.6: 兼容 string[] 与 {completed, goal} 两种结构
                if (Array.isArray(parsed)) return parsed.includes(w.id)
                return Array.isArray(parsed?.completed) && parsed.completed.includes(w.id)
              } catch { return false }
            })()
            return (
              <div key={w.id} className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => onMarkWord(w.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-stone-300 dark:border-stone-600 hover:border-emerald-500'
                  }`}
                  aria-label={isCompleted ? '已完成' : '标记完成'}
                >
                  {isCompleted ? '✓' : ''}
                </button>
                <Link to={`/words/${w.id}`} className="flex-1 truncate hover:underline">
                  {w.word}
                </Link>
                <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">
                  {w.level}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 来源 */}
      <div className="flex gap-2 text-xs mt-2">
        {plan.bySource.review > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
            🔄 复习 {plan.bySource.review}
          </span>
        )}
        {plan.bySource.favorite > 0 && (
          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
            ⭐ 收藏 {plan.bySource.favorite}
          </span>
        )}
        {plan.bySource.new > 0 && (
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
            ✨ 新词 {plan.bySource.new}
          </span>
        )}
      </div>

      {/* 完成态 */}
      {plan.isDone && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
          ✨ 今日计划已全部完成!给自己鼓个掌
        </p>
      )}
    </div>
  )
}
