// src/pages/ErrorHistoryPage.tsx - v1.99 W90 错题复习统计页
// 显示全部错题 + 难度分布 + 横向条形图 (按卡)
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllWritingErrors, getAllDictationErrors, type WritingError, type DictationError } from '../lib/db'
import {
  toUnifiedErrors,
  computeErrorStats,
  sortByDifficulty,
  analyzeUnifiedError,
  type UnifiedError,
} from '../lib/errorHistory'
import { difficultyStyle } from '../lib/errorDifficulty'
import { toast } from '../components/Toast'

type SortKey = 'difficulty' | 'recent' | 'count'

export default function ErrorHistoryPage() {
  const [errors, setErrors] = useState<UnifiedError[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('difficulty')
  const [showMastered, setShowMastered] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [w, d] = await Promise.all([getAllWritingErrors(), getAllDictationErrors()])
      // 错题本身没有 scores (从 IDB), 需要从 localStorage 读
      // W89-B 错题复习 session 不持久化 scores, 所以现在用 IDB ts 排序, scores=空
      // 简化: 暂不读 session history, 全部 scores=[]
      // 后期可加: 跟读评分历史 / 听写错误记录 已经存 IDB, 可读
      const unified = toUnifiedErrors(w, d, {})
      setErrors(unified)
      setLoading(false)
    } catch (e) {
      console.error('[ErrorHistory] load:', e)
      toast.error('加载错题失败')
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => computeErrorStats(errors), [errors])

  const sorted = useMemo(() => {
    let list = errors
    if (!showMastered) {
      list = list.filter(e => analyzeUnifiedError(e).difficulty !== 'mastered')
    }
    if (sortKey === 'difficulty') {
      return sortByDifficulty(list)
    } else if (sortKey === 'recent') {
      return [...list].sort((a, b) => b.addedAt - a.addedAt)
    } else {
      // count: 历次评分多 → 难 → 排前
      return [...list].sort((a, b) => b.scores.length - a.scores.length)
    }
  }, [errors, sortKey, showMastered])

  if (loading) {
    return <div className="text-center py-20 text-stone-500">加载错题中...</div>
  }

  if (errors.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">📊 错题统计</h1>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-lg mb-1">暂无错题</p>
          <p className="text-sm text-stone-500 mb-4">先去写作 / 听写 / 拼写 / 跟读 攒点错题再来</p>
          <Link to="/errors" className="btn-primary">📋 改错本</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 错题统计 ({errors.length})</h1>
        <button onClick={() => navigate('/errors')} className="text-stone-500 hover:text-stone-700">
          ← 改错本
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="card text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
          <div>
            <div className="text-xl font-bold text-brand-500">{stats.total}</div>
            <div className="text-xs text-stone-500">总数</div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-500">{stats.mastered}</div>
            <div className="text-xs text-stone-500">🌟 已掌握</div>
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500">{stats.hard}</div>
            <div className="text-xs text-stone-500">🔴 难词</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-500">{stats.withSomeCorrect}</div>
            <div className="text-xs text-stone-500">有答对过</div>
          </div>
        </div>
        {/* 按 source 分组 */}
        <div className="flex flex-wrap gap-2 text-xs justify-center">
          {Object.entries(stats.bySource).filter(([_, n]) => n > 0).map(([src, n]) => (
            <span key={src} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
              {src === 'write' ? '✍️ 写作' :
                src === 'chat' ? '💬 对话' :
                src === 'chinese' ? '🇨🇳 中译英' :
                src === 'dictation' ? '🎧 听写' :
                src === 'spelling' ? '🔤 拼写' :
                '🎤 跟读'} {n}
            </span>
          ))}
        </div>
      </div>

      {/* 排序 + 过滤 */}
      <div className="card">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-stone-500">排序:</span>
          {(['difficulty', 'recent', 'count'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2 py-0.5 rounded ${
                sortKey === k ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {k === 'difficulty' ? '按难度' : k === 'recent' ? '按时间' : '按次数'}
            </button>
          ))}
          <button
            onClick={() => setShowMastered(s => !s)}
            className={`px-2 py-0.5 rounded ml-auto ${
              showMastered ? 'bg-stone-100 dark:bg-stone-800' : 'bg-stone-700 text-white'
            }`}
          >
            {showMastered ? '隐藏已掌握' : '显示已掌握'}
          </button>
        </div>
      </div>

      {/* 列表 - 横向条形图 (按卡) */}
      <div className="space-y-2">
        {sorted.map(e => {
          const a = analyzeUnifiedError(e)
          const style = difficultyStyle(a.difficulty)
          // 进度条颜色
          const barColor = a.avgScore >= 70 ? 'bg-emerald-500' :
            a.avgScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
          return (
            <div key={e.cardId} className="card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-base font-bold ${style.color}`}>
                  {style.emoji}
                </span>
                <span className="text-xs text-stone-500 flex-1">
                  {e.source === 'write' ? '✍️' :
                    e.source === 'chat' ? '💬' :
                    e.source === 'chinese' ? '🇨🇳' :
                    e.source === 'dictation' ? '🎧' :
                    e.source === 'spelling' ? '🔤' :
                    '🎤'} {style.label}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(e.addedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="text-sm text-stone-700 dark:text-stone-300 mb-2">
                <div className="line-through text-stone-400">{e.original.slice(0, 50)}</div>
                <div className="text-emerald-600 dark:text-emerald-400">{e.corrected.slice(0, 50)}</div>
              </div>
              {/* 进度条 */}
              {a.attempts > 0 ? (
                <div className="h-5 bg-stone-200 dark:bg-stone-700 rounded relative">
                  <div
                    className={`h-full ${barColor} rounded transition-all`}
                    style={{ width: `${a.avgScore}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-100">
                    <span>avg {a.avgScore}</span>
                    <span>{a.attempts}次 {a.trend !== 'flat' ? (a.trend === 'up' ? '↑' : '↓') : '→'}</span>
                    <span>best {a.bestScore}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400">未开始复习</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
