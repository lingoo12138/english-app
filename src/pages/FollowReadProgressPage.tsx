// src/pages/FollowReadProgressPage.tsx - v1.94 W88-A 跟读评分趋势图
// SVG 折线图 + 统计 + 按课文过滤
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getFollowReadScores, aggregateScores, type FollowReadScore } from '../lib/followReadScore'
import { lessonStats, sentenceStats } from '../lib/followReadByLesson'
import { LESSONS } from '../data/textbook'

export default function FollowReadProgressPage() {
  const [scores, setScores] = useState<FollowReadScore[]>([])
  const [filterLesson, setFilterLesson] = useState<string>('all')
  // v1.98 W89-D: 视图模式
  const [viewMode, setViewMode] = useState<'time' | 'lesson' | 'sentence'>('time')
  const navigate = useNavigate()

  // 修 v1: lessonId → title 反查
  const lessonTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of LESSONS) map.set(l.id, l.title)
    return map
  }, [])

  useEffect(() => {
    setScores(getFollowReadScores())
  }, [])

  const filtered = useMemo(
    () => filterLesson === 'all' ? scores : scores.filter(s => s.lessonId === filterLesson),
    [scores, filterLesson],
  )

  const agg = useMemo(() => aggregateScores(filtered), [filtered])

  // SVG 折线图
  const chartW = 600
  const chartH = 200
  const padding = 20
  const sorted = [...filtered].sort((a, b) => a.ts - b.ts)
  const points = sorted.map((s, i) => {
    const x = sorted.length === 1
      ? chartW / 2
      : padding + (i / (sorted.length - 1)) * (chartW - padding * 2)
    const y = padding + (1 - s.score / 100) * (chartH - padding * 2)
    return { x, y, s }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 跟读趋势</h1>
        <button onClick={() => navigate('/textbook')} className="text-stone-500 hover:text-stone-700">
          ← 课文
        </button>
      </div>

      {scores.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎤</div>
          <p className="text-lg mb-1">还没有跟读记录</p>
          <p className="text-sm text-stone-500 mb-4">去课文页试试跟读模式, 系统会自动记录你的评分</p>
          <Link to="/textbook" className="btn-primary">📚 去课文</Link>
        </div>
      ) : (
        <>
          {/* 统计 */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-brand-500">{agg.avg}</div>
                <div className="text-xs text-stone-500 mt-1">平均分</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-500">{agg.best}</div>
                <div className="text-xs text-stone-500 mt-1">最高分</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-500">{agg.count}</div>
                <div className="text-xs text-stone-500 mt-1">跟读次数</div>
              </div>
            </div>
          </div>

          {/* 过滤 */}
          {agg.byLesson.length > 1 && (
            <div className="card">
              <label className="text-sm text-stone-500 mb-2 block">按课文过滤:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterLesson('all')}
                  className={`px-3 py-1 rounded text-sm ${
                    filterLesson === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
                  }`}
                >
                  全部 ({agg.count})
                </button>
                {agg.byLesson.map(b => (
                  <button
                    key={b.lessonId}
                    onClick={() => setFilterLesson(b.lessonId)}
                    className={`px-3 py-1 rounded text-sm ${
                      filterLesson === b.lessonId ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  >
                    {lessonTitleMap.get(b.lessonId) || b.lessonId} ({b.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 折线图 */}
          <div className="card">
            <h3 className="font-semibold mb-3">📈 趋势图 (按时间)</h3>
            {sorted.length === 0 ? (
              <p className="text-sm text-stone-500">此过滤下无数据</p>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  width={chartW}
                  height={chartH}
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full max-w-full"
                >
                  {/* 网格线 */}
                  {[0, 25, 50, 75, 100].map(v => {
                    const y = padding + (1 - v / 100) * (chartH - padding * 2)
                    return (
                      <g key={v}>
                        <line
                          x1={padding}
                          y1={y}
                          x2={chartW - padding}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity={0.1}
                          strokeDasharray="2,2"
                        />
                        <text
                          x={4}
                          y={y + 3}
                          fontSize="10"
                          fill="currentColor"
                          opacity={0.5}
                        >{v}</text>
                      </g>
                    )
                  })}
                  {/* 折线 */}
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* 点 */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="3" fill="rgb(16, 185, 129)" />
                      <title>{new Date(p.s.ts).toLocaleString('zh-CN')} - {p.s.score}分</title>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* v1.98 W89-D: 视图切换 */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-stone-500">视图:</span>
              {(['time', 'lesson', 'sentence'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === m ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
                  }`}
                >
                  {m === 'time' ? '📈 时间' : m === 'lesson' ? '📚 课文' : '📝 句子'}
                </button>
              ))}
            </div>

            {/* 时间视图: 折线图 + 最近 20 */}
            {viewMode === 'time' && (
              <>
                {agg.recent.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">📋 最近 20 条</h3>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {agg.recent.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-stone-100 dark:border-stone-800">
                          <span className="text-stone-500">
                            {new Date(s.ts).toLocaleString('zh-CN')}
                          </span>
                          <span className="text-stone-400 text-xs">{s.lessonId}</span>
                          <span className={`font-bold ${
                            s.score >= 70 ? 'text-emerald-500' :
                            s.score >= 40 ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {s.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 课文视图: 横向条形图 */}
            {viewMode === 'lesson' && (
              <LessonBarChart scores={filtered} lessonTitleMap={lessonTitleMap} />
            )}

            {/* 句子视图: 横向条形图 */}
            {viewMode === 'sentence' && (
              <SentenceBarChart scores={filtered} lessonTitleMap={lessonTitleMap} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** 课文横向条形图 */
function LessonBarChart({ scores, lessonTitleMap }: { scores: FollowReadScore[]; lessonTitleMap: Map<string, string> }) {
  const stats = lessonStats(scores)
  if (stats.length === 0) {
    return <p className="text-sm text-stone-500">此过滤下无数据</p>
  }
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">📚 按课文 ({stats.length})</h3>
      {stats.map(s => {
        const title = lessonTitleMap.get(s.lessonId) || s.lessonId
        const color = s.avg >= 70 ? 'bg-emerald-500' : s.avg >= 40 ? 'bg-amber-500' : 'bg-rose-500'
        return (
          <div key={s.lessonId} className="flex items-center gap-2 text-sm">
            <div className="w-32 truncate text-stone-700 dark:text-stone-300" title={title}>{title}</div>
            <div className="flex-1 h-6 bg-stone-200 dark:bg-stone-700 rounded relative">
              <div
                className={`h-full ${color} rounded transition-all`}
                style={{ width: `${s.avg}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-800 dark:text-stone-100">
                {s.avg} ({s.count}次, {s.sentenceCount}句)
              </div>
            </div>
            <span className="text-xs text-stone-500 w-16 text-right">
              best {s.best}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 句子横向条形图 */
function SentenceBarChart({ scores, lessonTitleMap }: { scores: FollowReadScore[]; lessonTitleMap: Map<string, string> }) {
  const stats = sentenceStats(scores)
  if (stats.length === 0) {
    return <p className="text-sm text-stone-500">此过滤下无数据</p>
  }
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">📝 按句子 ({stats.length})</h3>
      <div className="max-h-96 overflow-y-auto space-y-1">
        {stats.map(s => {
          const title = lessonTitleMap.get(s.lessonId) || s.lessonId
          const color = s.avg >= 70 ? 'bg-emerald-500' : s.avg >= 40 ? 'bg-amber-500' : 'bg-rose-500'
          return (
            <div key={`${s.lessonId}-${s.sentenceIndex}`} className="flex items-center gap-2 text-xs">
              <div className="w-24 truncate text-stone-600 dark:text-stone-400" title={title}>{title}</div>
              <div className="w-8 text-stone-400">#{s.sentenceIndex + 1}</div>
              <div className="flex-1 h-5 bg-stone-200 dark:bg-stone-700 rounded relative">
                <div
                  className={`h-full ${color} rounded transition-all`}
                  style={{ width: `${s.avg}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-stone-800 dark:text-stone-100">
                  {s.avg} ({s.count}次)
                </div>
              </div>
              <span className="text-stone-500 w-12 text-right">{s.best}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
