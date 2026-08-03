// src/pages/ErrorHistoryPage.tsx - v1.99 W90 错题复习统计页 (修 v1: 接 session 真数据 + useMemo 缓存 + Layout nav 入口)
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllWritingErrors, getAllDictationErrors, getAllErrorReviewScores, clearErrorReviewScores, type WritingError, type DictationError } from '../lib/db'
import {
  toUnifiedErrors,
  computeErrorStats,
  sortByDifficulty,
  analyzeUnifiedError,
  type UnifiedError,
  type ErrorCardAnalysis,
} from '../lib/errorHistory'
import { difficultyStyle } from '../lib/errorDifficulty'
import { loadSession } from '../lib/errorReviewSession'
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
      const [w, d, reviews] = await Promise.all([
        getAllWritingErrors(),
        getAllDictationErrors(),
        getAllErrorReviewScores(),  // v2.0 W91: 永久 IDB 持久化
      ])
      // 修 v1: IDB 是 source of truth, 不再 fallback session (避免双倍计数 P0)
      const idbHistoryMap: Record<string, number[]> = {}
      for (const r of reviews) {
        if (!idbHistoryMap[r.cardId]) idbHistoryMap[r.cardId] = []
        idbHistoryMap[r.cardId].push(r.score)
      }
      const unified = toUnifiedErrors(w, d, idbHistoryMap)
      setErrors(unified)
      setLoading(false)
    } catch (e) {
      console.error('[ErrorHistory] load:', e)
      toast.error('加载错题失败')
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 修 v1: useMemo 缓存分析 (避免 N×logN 次重复)
  const analyzedMap = useMemo(() => {
    const m = new Map<string, ErrorCardAnalysis>()
    for (const e of errors) m.set(e.cardId, analyzeUnifiedError(e))
    return m
  }, [errors])

  const stats = useMemo(() => {
    // 修 v1: 从 analyzedMap 算 stats, 不再调 analyzeUnifiedError
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0, mastered: 0 }
    const bySource: Record<string, number> = {
      write: 0, chat: 0, chinese: 0,
      dictation: 0, spelling: 0, 'follow-read': 0,
    }
    let withSomeCorrect = 0
    let totalReviews = 0
    for (const e of errors) {
      const a = analyzedMap.get(e.cardId)!
      byDifficulty[a.difficulty]++
      totalReviews += a.attempts  // 修 v1 (P1-6): 复习次数 = 所有 attempts 累加
      bySource[e.source]++
      if (a.correctCount > 0) withSomeCorrect++
    }
    return {
      total: errors.length,
      totalReviews,  // 修 v1 (P1-6)
      byDifficulty: byDifficulty as any,
      bySource: bySource as any,
      withSomeCorrect,
      hard: byDifficulty.hard,
      mastered: byDifficulty.mastered,
    }
  }, [errors, analyzedMap])

  const sorted = useMemo(() => {
    let list = errors
    if (!showMastered) {
      list = list.filter(e => analyzedMap.get(e.cardId)!.difficulty !== 'mastered')
    }
    if (sortKey === 'difficulty') {
      return sortByDifficulty(list)
    } else if (sortKey === 'recent') {
      return [...list].sort((a, b) => b.addedAt - a.addedAt)
    } else {
      // count: 历次评分多 → 难 → 排前
      return [...list].sort((a, b) => b.scores.length - a.scores.length)
    }
  }, [errors, analyzedMap, sortKey, showMastered])

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
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!window.confirm('确定清除所有错题复习历史? 此操作不可撤销。')) return
              try {
                await clearErrorReviewScores()
                toast.success('已清除复习历史')
                await load()
              } catch (e) {
                toast.error('清除失败')
              }
            }}
            className="text-stone-400 hover:text-rose-500 text-sm"
            title="清除所有复习历史"
          >
            🗑️ 清除历史
          </button>
          <button onClick={() => navigate('/errors')} className="text-stone-500 hover:text-stone-700">
            ← 改错本
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="card text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
          <div>
            {/* 修 v1 (P1-6): 拆错题卡数 (stats.total) + 复习次数 (errors 聚合 scores.length) */}
            <div className="text-xl font-bold text-brand-500">{stats.total}</div>
            <div className="text-xs text-stone-500">错题卡数</div>
            <div className="text-xs text-stone-400">复习 {stats.totalReviews} 次</div>
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
          {Object.entries(stats.bySource).filter(([_, n]) => (n as number) > 0).map(([src, n]) => (
            <span key={src} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
              {src === 'write' ? '✍️ 写作' :
                src === 'chat' ? '💬 对话' :
                src === 'chinese' ? '🇨🇳 中译英' :
                src === 'dictation' ? '🎧 听写' :
                src === 'spelling' ? '🔤 拼写' :
                '🎤 跟读'} {(n as number)}
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
          const a = analyzedMap.get(e.cardId)!
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
                <div className="line-through text-stone-400">
                  {e.original.length > 50 ? e.original.slice(0, 50) + '…' : e.original}
                </div>
                <div className="text-emerald-600 dark:text-emerald-400">
                  {e.corrected.length > 50 ? e.corrected.slice(0, 50) + '…' : e.corrected}
                </div>
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
