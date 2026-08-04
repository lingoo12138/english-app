// src/pages/LessonScorePage.tsx - 课文评分 页面 (W97)
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeLessonScores, getCrossLessonTotal, type LessonScore } from '../lib/lessonScore'

const LEVEL_LABEL: Record<string, string> = {
  primary: '小学', junior: '初中', senior: '高中', gaozhong: '高中',
  cet4: 'CET-4', cet6: 'CET-6', kaoyan: '考研', daily: '日常',
}

const STATUS_COLOR = {
  mastered: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  in_progress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  not_started: 'bg-stone-100 dark:bg-stone-700 text-stone-500',
} as const

const STATUS_LABEL = {
  mastered: '🌟 已掌握',
  in_progress: '💪 学习中',
  not_started: '📚 未开始',
} as const

export default function LessonScorePage() {
  const navigate = useNavigate()
  const [scores, setScores] = useState<LessonScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mastered' | 'in_progress' | 'not_started'>('all')

  useEffect(() => {
    computeLessonScores().then(s => {
      setScores(s)
      setLoading(false)
    })
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

  const crossLessonTotal = getCrossLessonTotal()

  if (loading) {
    return <div className="text-center py-20 text-stone-500">加载中...</div>
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 课文评分</h1>
        <button onClick={() => navigate('/textbook')} className="text-stone-500 hover:text-stone-700 text-sm">
          ← 返回课文
        </button>
      </div>

      {/* 总体统计 */}
      <div className="card text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
          <div>
            <div className="text-2xl font-bold text-brand-500">{stats.total}</div>
            <div className="text-xs text-stone-500">课文</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">{stats.mastered}</div>
            <div className="text-xs text-stone-500">已掌握</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{stats.inProgress}</div>
            <div className="text-xs text-stone-500">学习中</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-400">{stats.notStarted}</div>
            <div className="text-xs text-stone-500">未开始</div>
          </div>
        </div>
        <div className="text-center text-sm">
          <div className="text-2xl font-bold text-brand-500">{stats.overallRate}%</div>
          <div className="text-xs text-stone-500">总词汇掌握度 ({stats.totalMastered} / {stats.totalVocab})</div>
        </div>
        <div className="text-center text-xs text-stone-500 mt-2">
          跨课复用词 {crossLessonTotal} 个 (在 ≥2 篇课文出现)
        </div>
      </div>

      {/* filter 按钮 */}
      <div className="flex gap-2 text-xs flex-wrap">
        {[
          { key: 'all', label: `全部 ${stats.total}` },
          { key: 'mastered', label: `🌟 ${stats.mastered}` },
          { key: 'in_progress', label: `💪 ${stats.inProgress}` },
          { key: 'not_started', label: `📚 ${stats.notStarted}` },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key as any)}
            className={`px-3 py-1 rounded ${filter === opt.key ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-700'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 课文 列表 */}
      <div className="space-y-2">
        {filtered.map(s => (
          <div
            key={s.lessonId}
            onClick={() => navigate(`/textbook/${s.lessonId}`)}
            className="card hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-stone-500">
                    {LEVEL_LABEL[s.level] || s.level} · {s.totalVocab} 词
                    {s.crossLessonVocab.length > 0 && (
                      <span className="ml-1">· 跨课词 {s.crossLessonVocab.length}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-brand-500">{s.masteryRate}%</div>
                <div className="text-xs text-stone-500">{s.masteredCount} / {s.totalVocab}</div>
              </div>
            </div>
            {/* 进度条 */}
            <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  s.status === 'mastered' ? 'bg-emerald-500' :
                  s.status === 'in_progress' ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                style={{ width: `${s.masteryRate}%` }}
              />
            </div>
            <div className="mt-2">
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
