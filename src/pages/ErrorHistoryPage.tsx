// src/pages/ErrorHistoryPage.tsx - W126 改版稿 UI
// v1.99 W90 错题复习统计页 (修 v1: 接 session 真数据 + useMemo 缓存 + Layout nav 入口)
// W126: 0 emoji 操 作 + Icon SVG + W123d 3 圆 顶 部 + W113 v2 card + Skeleton
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
import { SkeletonPage } from '../components/Skeleton'
import {
  IconArrow, IconBarChart, IconTrophy, IconStar, IconClose, IconRefresh,
  IconEdit, IconChat, IconHeadphones, IconBook, IconSparkles,
} from '../components/Icon'

type SortKey = 'difficulty' | 'recent' | 'count'

// W126: source → Icon 映射 (替 source emoji)
const SOURCE_META: Record<string, { label: string; Icon: any }> = {
  write: { label: '写作', Icon: IconEdit },
  chat: { label: '对话', Icon: IconChat },
  chinese: { label: '中译英', Icon: IconChat },
  dictation: { label: '听写', Icon: IconHeadphones },
  spelling: { label: '拼写', Icon: IconEdit },
  'follow-read': { label: '跟读', Icon: IconHeadphones },
}

// W126: 大圆环 进度 (W124 Bento 风格) — 计算外圈弧度
function ProgressRing({ percent, size = 80, stroke = 6, color = '#10b981' }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * (Math.min(100, percent) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-stone-200 dark:text-stone-700" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        style={{ transition: 'stroke-dasharray var(--t-slow) var(--ease)' }}
      />
    </svg>
  )
}

export default function ErrorHistoryPage() {
  const [errors, setErrors] = useState<UnifiedError[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('difficulty')
  const [showMastered, setShowMastered] = useState(true)
  // W121 风 格: openGroups 折 叠 状 态 + localStorage 持 久 化
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('error-history-open-groups')
      return saved ? JSON.parse(saved) : { stats: true, sort: true, list: true }
    } catch {
      return { stats: true, sort: true, list: true }
    }
  })
  useEffect(() => {
    localStorage.setItem('error-history-open-groups', JSON.stringify(openGroups))
  }, [openGroups])
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
    return <SkeletonPage />
  }

  if (errors.length === 0) {
    return (
      <div className="space-y-4">
        {/* W123d 顶 部 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
            aria-label="返回上一页"
          >
            <span className="inline-block rotate-180"><IconArrow size={16} /></span>
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <IconBarChart size={20} className="text-brand-500" />
            错题统计
          </h1>
          <div className="w-9" /> {/* spacer */}
        </div>

        <div className="card card-interactive text-center py-10">
          <IconTrophy size={48} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          <p className="text-lg mb-1">暂无错题</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">先去写作 / 听写 / 拼写 / 跟读 攒点错题再来</p>
          <Link to="/errors" className="btn-primary inline-flex items-center gap-1.5">
            <IconBook size={14} />
            改错本
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* W123d 顶 部: 标 题 居 中 + 3 圆 按 钮 (返 回/清 除/改 错 本) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回上一页"
        >
          <span className="inline-block rotate-180"><IconArrow size={16} /></span>
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <IconBarChart size={20} className="text-brand-500" />
          错题统计 ({errors.length})
        </h1>
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
          className="w-9 h-9 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-stone-400 hover:text-rose-500 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="清除所有复习历史"
          title="清除复习历史"
        >
          <IconClose size={16} />
        </button>
      </div>

      {/* 统计卡片 - W124 Bento: 大圆环 + 4 列 4 状态色 */}
      <div className="card card-interactive">
        <button
          onClick={() => setOpenGroups(p => ({ ...p, stats: !p.stats }))}
          className="w-full flex items-center justify-between text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3 transition-colors duration-[var(--t-fast)]"
          aria-expanded={openGroups.stats ?? true}
          aria-label="统计"
        >
          <span className="flex items-center gap-2">
            <IconBarChart size={14} className="text-brand-500" />
            总览
          </span>
          <span
            className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
            style={{ transform: (openGroups.stats ?? true) ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <IconArrow size={14} strokeWidth={2.5} className="rotate-90" />
          </span>
        </button>
        {(openGroups.stats ?? true) && (
          <>
            <div className="flex items-center gap-4 mb-4">
              {/* 大圆环 (W124 Bento 风格) */}
              <div className="relative flex-shrink-0">
                <ProgressRing
                  percent={stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}
                  size={80}
                  stroke={6}
                  color="var(--state-success)"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">{stats.mastered}</div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider">已掌握</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-stone-500 mb-1">总进度</div>
                <div className="text-2xl font-bold text-stone-700 dark:text-stone-200 font-mono tabular-nums">
                  {stats.total}
                  <span className="text-sm font-normal text-stone-400 ml-1">张卡</span>
                </div>
                <div className="text-xs text-stone-500 mt-1">复习 {stats.totalReviews} 次</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">{stats.mastered}</div>
                <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">已掌握</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <div className="text-xl font-bold text-rose-500 font-mono tabular-nums">{stats.hard}</div>
                <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">难词</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="text-xl font-bold text-amber-500 font-mono tabular-nums">{stats.withSomeCorrect}</div>
                <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">有答对过</div>
              </div>
            </div>

            {/* 按 source 分组 - W124 圆角徽章 */}
            <div className="flex flex-wrap gap-2 text-xs justify-center mt-3">
              {Object.entries(stats.bySource).filter(([_, n]) => (n as number) > 0).map(([src, n]) => {
                const meta = SOURCE_META[src]
                if (!meta) return null
                const Icon = meta.Icon
                return (
                  <span
                    key={src}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200"
                  >
                    <Icon size={12} />
                    {meta.label} {n as number}
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 排序 + 过滤 - W121 折 叠 + W113 状态色 */}
      <div className="card">
        <button
          onClick={() => setOpenGroups(p => ({ ...p, sort: !p.sort }))}
          className="w-full flex items-center justify-between text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3 transition-colors duration-[var(--t-fast)]"
          aria-expanded={openGroups.sort ?? true}
          aria-label="排序与过滤"
        >
          <span className="flex items-center gap-2">
            <IconRefresh size={14} className="text-brand-500" />
            排序与过滤
          </span>
          <span
            className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
            style={{ transform: (openGroups.sort ?? true) ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <IconArrow size={14} strokeWidth={2.5} className="rotate-90" />
          </span>
        </button>
        {(openGroups.sort ?? true) && (
          <div className="flex flex-wrap gap-2 text-sm items-center">
            <span className="text-stone-500">排序:</span>
            {(['difficulty', 'recent', 'count'] as const).map(k => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-2 py-0.5 rounded-full border transition-colors duration-[var(--t-fast)] ${
                  sortKey === k
                    ? 'bg-brand-500 text-white border-brand-500 shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                {k === 'difficulty' ? '按难度' : k === 'recent' ? '按时间' : '按次数'}
              </button>
            ))}
            <button
              onClick={() => setShowMastered(s => !s)}
              className={`px-2 py-0.5 rounded-full border ml-auto transition-colors duration-[var(--t-fast)] ${
                showMastered
                  ? 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  : 'bg-stone-700 text-white border-stone-700'
              }`}
              aria-pressed={!showMastered}
            >
              {showMastered ? '隐藏已掌握' : '显示已掌握'}
            </button>
          </div>
        )}
      </div>

      {/* 列表 - 横向条形图 (按卡) */}
      <div className="space-y-2">
        {sorted.map(e => {
          const a = analyzedMap.get(e.cardId)!
          const style = difficultyStyle(a.difficulty)
          // 进度条颜色 (W113 3 状态色)
          const barColor = a.avgScore >= 70 ? 'bg-emerald-500' :
            a.avgScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
          const barColorCSS = a.avgScore >= 70 ? 'var(--state-success)' :
            a.avgScore >= 40 ? 'var(--state-warning)' : 'var(--state-error)'
          const sourceMeta = SOURCE_META[e.source] || { label: e.source, Icon: IconBook }
          const SourceIcon = sourceMeta.Icon
          return (
            <div key={e.cardId} className="card card-interactive p-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    a.difficulty === 'mastered' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' :
                    a.difficulty === 'hard' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700' :
                    a.difficulty === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' :
                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
                  }`}
                  title={style.label}
                >
                  {a.difficulty === 'mastered' ? <IconStar size={12} /> : a.difficulty === 'hard' ? '!' : a.difficulty === 'medium' ? '·' : '+'}
                </span>
                <span className="text-xs text-stone-500 flex-1 inline-flex items-center gap-1">
                  <SourceIcon size={12} className="text-stone-400" />
                  {sourceMeta.label} · {style.label}
                </span>
                <span className="text-xs text-stone-400 font-mono tabular-nums">
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
              {/* 进度条 - W124 Bento 风格 (3 状态色 token) */}
              {a.attempts > 0 ? (
                <div className="space-y-1">
                  <div className="h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-[var(--t-slow)] ease-[var(--ease)]"
                      style={{ width: `${a.avgScore}%`, backgroundColor: barColorCSS }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500 font-mono tabular-nums">
                    <span>avg <b className={a.avgScore >= 70 ? 'text-emerald-600' : a.avgScore >= 40 ? 'text-amber-600' : 'text-rose-600'}>{a.avgScore}</b></span>
                    <span>{a.attempts}次 {a.trend === 'up' ? '↑' : a.trend === 'down' ? '↓' : '→'}</span>
                    <span>best <b className="text-emerald-600">{a.bestScore}</b></span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400 inline-flex items-center gap-1">
                  <IconSparkles size={10} />
                  未开始复习
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部 - 改错本入口 */}
      <div className="card card-interactive flex items-center justify-between p-3">
        <span className="text-sm text-stone-600 dark:text-stone-300 inline-flex items-center gap-1.5">
          <IconBook size={14} className="text-stone-500" />
          想答对所有错题?
        </span>
        <Link
          to="/errors"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          进入改错本
          <IconArrow size={12} />
        </Link>
      </div>
    </div>
  )
}
