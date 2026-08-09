// src/pages/LessonScorePage.tsx - 课文评分 页面 (W97+W124 改版稿 UI)
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeLessonScores, getCrossLessonTotal, type LessonScore } from '../lib/lessonScore'
import { IconBarChart, IconTrophy, IconSparkles, IconBookOpen, IconArrow, IconRefresh } from '../components/Icon'

const LEVEL_LABEL: Record<string, string> = {
  primary: '小学', junior: '初中', senior: '高中', gaozhong: '高中',
  cet4: 'CET-4', cet6: 'CET-6', kaoyan: '考研', daily: '日常',
}

const STATUS_CONFIG = {
  mastered: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: '已掌握' },
  in_progress: { color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800', label: '学习中' },
  not_started: { color: 'text-stone-500', bg: 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700', label: '未开始' },
} as const

export default function LessonScorePage() {
  const navigate = useNavigate()
  const [scores, setScores] = useState<LessonScore[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  type FilterType = 'all' | 'mastered' | 'in_progress' | 'not_started'
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    computeLessonScores()
      .then(s => { setScores(s); setLoading(false) })
      .catch(e => { setLoadError(e?.message || '加载失败'); setLoading(false) })
  }, [])

  const stats = useMemo(() => {
    const mastered = scores.filter(s => s.status === 'mastered').length
    const inProgress = scores.filter(s => s.status === 'in_progress').length
    const notStarted = scores.filter(s => s.status === 'not_started').length
    const totalVocab = scores.reduce((a, s) => a + s.totalVocab, 0)
    const totalMastered = scores.reduce((a, s) => a + s.masteredCount, 0)
    return {
      total: scores.length,
      mastered, inProgress, notStarted,
      totalVocab, totalMastered,
      overallRate: totalVocab > 0 ? Math.round(totalMastered / totalVocab * 100) : 0,
    }
  }, [scores])

  const filtered = useMemo(() => {
    if (filter === 'all') return scores
    return scores.filter(s => s.status === filter)
  }, [scores, filter])

  const crossLessonTotal = useMemo(() => getCrossLessonTotal(), [])

  if (loadError) {
    return <div className="text-center py-20">
      <div className="text-red-500 mb-2">加载失败: {loadError}</div>
      <button onClick={() => window.location.reload()} className="text-sm px-3 py-1 bg-brand-500 text-white rounded flex items-center gap-1 mx-auto">
        <IconRefresh size={14} />重试
      </button>
    </div>
  }
  if (loading) {
    return <div className="text-center py-20 text-stone-500">加载中...</div>
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* W124 顶 部 简 化 — 标 题 + Icon 居 中 + 返 回 圆 形 按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/textbook')}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回课文"
        >
          <span className="inline-block rotate-180"><IconArrow size={16} /></span>
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <IconBarChart size={20} className="text-brand-500" />
          课文评分
        </h1>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* W124 Bento 总 览 — 4 卡 (md:2x2 + 大 圆 环 占 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="card card-interactive p-3 text-center">
          <div className="text-2xl font-bold text-stone-700 dark:text-stone-200 font-mono tabular-nums">{stats.total}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">课文</div>
        </div>
        <div className="card card-interactive p-3 text-center">
          <div className="text-2xl font-bold text-amber-500 font-mono tabular-nums">{stats.mastered}</div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-center gap-0.5">
            <IconTrophy size={10} />已掌握
          </div>
        </div>
        <div className="card card-interactive p-3 text-center">
          <div className="text-2xl font-bold text-brand-500 font-mono tabular-nums">{stats.inProgress}</div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-center gap-0.5">
            <IconSparkles size={10} />学习中
          </div>
        </div>
        <div className="card card-interactive p-3 text-center">
          <div className="text-2xl font-bold text-stone-400 font-mono tabular-nums">{stats.notStarted}</div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-center gap-0.5">
            <IconBookOpen size={10} />未开始
          </div>
        </div>
      </div>

      {/* W124 总 词 汇 掌 握 度 — 大 圆 环 + 数 字 + 跨 课 提 示 */}
      <div className="card p-4 flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-200 dark:text-stone-700" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeDasharray={`${stats.overallRate}, 100`}
              strokeLinecap="round"
              className="text-brand-500 transition-all duration-[var(--t-slow)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg font-bold text-brand-500 font-mono tabular-nums">{stats.overallRate}%</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">总词汇掌握度</div>
          <div className="text-xs text-stone-500 mt-0.5 font-mono tabular-nums">
            {stats.totalMastered} / {stats.totalVocab} 词
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            跨课复用词 <span className="font-mono">{crossLessonTotal}</span> 个 (在 ≥2 篇课文出现)
          </div>
        </div>
      </div>

      {/* W124 filter — 4 圆 角 按 钮 (无 emoji) */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `全部 ${stats.total}` },
          { key: 'mastered', label: `已掌握 ${stats.mastered}` },
          { key: 'in_progress', label: `学习中 ${stats.inProgress}` },
          { key: 'not_started', label: `未开始 ${stats.notStarted}` },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key as FilterType)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-[var(--t-base)] ease-[var(--ease-spring)] ${
              filter === opt.key
                ? 'bg-brand-500 text-white shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* W124 课 文 列 表 — card-interactive + 进 度 条 + 状 态 标 签 */}
      <div className="space-y-2">
        {filtered.map(s => {
          const cfg = STATUS_CONFIG[s.status]
          return (
            <div
              key={s.lessonId}
              onClick={() => navigate(`/textbook/${s.lessonId}`)}
              className="card card-interactive p-3 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden="true">{s.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="text-xs text-stone-500">
                      {LEVEL_LABEL[s.level] || s.level} · <span className="font-mono">{s.totalVocab}</span> 词
                      {s.crossLessonVocab.length > 0 && (
                        <span className="ml-1">· 跨课词 <span className="font-mono">{s.crossLessonVocab.length}</span></span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xl font-bold text-brand-500 font-mono tabular-nums">{s.masteryRate}%</div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">{s.masteredCount} / {s.totalVocab}</div>
                </div>
              </div>
              {/* 进 度 条 */}
              <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-[var(--t-base)] ease-[var(--ease-spring)] ${
                    s.status === 'mastered' ? 'bg-amber-500' :
                    s.status === 'in_progress' ? 'bg-brand-500' : 'bg-stone-300 dark:bg-stone-600'
                  }`}
                  style={{ width: `${s.masteryRate}%` }}
                />
              </div>
              <div className="mt-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} font-medium`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-stone-500 py-12">
            暂无此状态的课文
          </div>
        )}
      </div>
    </div>
  )
}
