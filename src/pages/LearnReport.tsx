// 学习报告页 - v0.21
// 展示用户 AI 对话中的词汇使用统计 + 难度分布
import { useState, useEffect } from 'react'
import { getAllChats } from '../lib/db'
import { generateLearnReport, exportReportJSON, levelLabel, levelColor, type LearnReport } from '../lib/learnReport'
import { useStore } from '../store/useStore'

export default function LearnReport() {
  const [report, setReport] = useState<LearnReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'top' | 'rare' | 'recent'>('overview')
  const scenario = useStore(s => s.chatScenario)
  const setScenario = useStore(s => s.setChatScenario)

  useEffect(() => {
    refresh()
  }, [])

  const refresh = async () => {
    setLoading(true)
    const chats = await getAllChats()
    const r = await generateLearnReport(chats)
    setReport(r)
    setLoading(false)
  }

  const handleExport = () => {
    if (!report) return
    const blob = new Blob([exportReportJSON(report)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `learn-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="card text-center py-8">加载报告中...</div>
  }

  if (!report || report.totalChats === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-stone-600 dark:text-stone-400 mb-4">还没有 AI 对话记录</p>
        <a href="/chat" className="btn-primary inline-block">开始 AI 对话</a>
      </div>
    )
  }

  const minutes = Math.round(report.totalStudyTime / 60)
  const matchedPct = report.totalVocab > 0
    ? Math.round(((report.totalVocab - (report.levelDistribution.unknown || 0)) / report.totalVocab) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">📊 AI 对话学习报告</h1>
          <button onClick={handleExport} className="btn-ghost text-sm">⬇️ 导出 JSON</button>
        </div>

        {/* 概览数字 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="对话数" value={report.totalChats} icon="💬" />
          <Stat label="去重词数" value={report.totalVocab} icon="📚" />
          <Stat label="总用词数" value={report.totalWordsUsed} icon="✍️" />
          <Stat label="约学习时长" value={`${minutes} 分钟`} icon="⏱️" />
        </div>

        <div className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
          <div>
            词库匹配率:{' '}
            <span className="font-semibold text-brand-600">
              {report.totalVocab - (report.levelDistribution.unknown || 0)}
            </span>
            {' / '}
            {report.totalVocab}
            {' = '}
            <span className="font-semibold text-brand-600">{matchedPct}%</span>
            <span className="text-xs ml-1">
              (未匹配 = 词库里没有的词,可能是专有名词/新词)
            </span>
          </div>
          <div className="text-xs">
            统计范围: {report.totalUserMessages} 条 user 消息 · 已过滤 100+ 停用词(虚词/数字/常见动词)
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 overflow-x-auto">
        {(['overview', 'top', 'rare', 'recent'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
              tab === t
                ? 'bg-brand-500 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {t === 'overview' ? '📈 概览' : t === 'top' ? '🔥 高频词' : t === 'rare' ? '💎 难词' : '🕐 最近'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview report={report} />}
      {tab === 'top' && <WordList title="🔥 高频词(前 30)" words={report.topWords} />}
      {tab === 'rare' && <WordList title="💎 难词(B2+)" words={report.rareWords} empty="还没有用过 B2 以上难词" />}
      {tab === 'recent' && <WordList title="🕐 最近用词" words={report.recentWords} />}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="text-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{value}</div>
      <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>
    </div>
  )
}

function Overview({ report }: { report: LearnReport }) {
  const sortedLevels = Object.entries(report.levelDistribution)
    .filter(([k]) => k !== 'unknown')
    .sort(([a], [b]) => a.localeCompare(b))

  const maxLevel = Math.max(...Object.values(report.levelDistribution), 1)
  const maxScenario = Math.max(...Object.values(report.scenarioDistribution), 1)

  return (
    <div className="space-y-4">
      {/* 难度分布 */}
      <div className="card">
        <h2 className="font-semibold mb-3">📊 词汇难度分布</h2>
        <div className="space-y-2">
          {sortedLevels.map(([lvl, count]) => (
            <div key={lvl} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${levelColor(lvl)}`}>{lvl}</span>
              <span className="text-xs text-stone-500 w-12">{levelLabel(lvl)}</span>
              <div className="flex-1 h-5 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${(count / maxLevel) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">{count}</span>
            </div>
          ))}
          {report.levelDistribution.unknown !== undefined && report.levelDistribution.unknown > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600">?</span>
              <span className="text-xs text-stone-500 w-12">未匹配</span>
              <div className="flex-1 h-5 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-stone-400"
                  style={{ width: `${(report.levelDistribution.unknown / maxLevel) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">{report.levelDistribution.unknown}</span>
            </div>
          )}
        </div>
      </div>

      {/* 场景分布 */}
      <div className="card">
        <h2 className="font-semibold mb-3">🎬 场景分布</h2>
        <div className="space-y-2">
          {Object.entries(report.scenarioDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([sc, count]) => (
              <div key={sc} className="flex items-center gap-2">
                <span className="text-sm w-24 truncate">{sc}</span>
                <div className="flex-1 h-5 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{ width: `${(count / maxScenario) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 学习日历(最近 14 天) */}
      <div className="card">
        <h2 className="font-semibold mb-3">📅 最近 14 天</h2>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (13 - i))
            const key = d.toISOString().slice(0, 10)
            const count = report.chatsByDay[key] || 0
            return (
              <div
                key={key}
                className={`aspect-square rounded text-[10px] flex items-center justify-center ${
                  count > 0
                    ? 'bg-brand-500 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                }`}
                title={`${key}: ${count} 个对话`}
              >
                {count > 0 ? count : ''}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WordList({ title, words, empty }: { title: string; words: any[]; empty?: string }) {
  if (words.length === 0) {
    return (
      <div className="card text-center py-6 text-stone-500 dark:text-stone-400">
        {empty || '没有数据'}
      </div>
    )
  }
  return (
    <div className="card">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-1">
        {words.map((u, i) => (
          <div key={u.word} className="flex items-center gap-2 p-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded">
            <span className="text-xs text-stone-400 w-6 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{u.word}</span>
                {u.level && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${levelColor(u.level)}`}>
                    {u.level}
                  </span>
                )}
                {u.matched?.phonetic && (
                  <span className="text-xs text-stone-500">/{u.matched.phonetic}/</span>
                )}
              </div>
              {u.matched?.translations?.[0] && (
                <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {u.matched.translations[0]}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium">{u.count}×</div>
              <div className="text-[10px] text-stone-400">
                {Object.keys(u.perScenario).length} 场景
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
