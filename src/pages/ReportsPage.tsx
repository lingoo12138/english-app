// ReportsPage.tsx - v1.11.0-C 学习日报/周报
// 复用 ShareCard 模式 (无 html2canvas): 截图代替导出图片
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getDailyReport,
  getWeeklyReport,
  getWeekStart,
  type DailyReport,
  type WeeklyReport,
} from '../lib/learningReport'
import { toast } from '../components/Toast'

type Tab = 'daily' | 'weekly'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('daily')
  const [daily, setDaily] = useState<DailyReport | null>(null)
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      const [d, w] = await Promise.all([
        getDailyReport(new Date()),
        getWeeklyReport(getWeekStart(new Date())),
      ])
      setDaily(d)
      setWeekly(w)
    } catch (e: unknown) {
      // 守卫: e 可能是 null/non-Error
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('加载报告失败: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyText() {
    const text = buildShareText(tab, daily, weekly)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制分享文本,粘贴到朋友圈/小红书')
    } catch (e: unknown) {
      toast.error('复制失败,请手动复制')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Header onCopy={handleCopyText} />
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-stone-500 dark:text-stone-400">加载报告中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header onCopy={handleCopyText} />

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab('daily')}
          className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
            tab === 'daily'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
          }`}
        >
          📅 今日日报
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
            tab === 'weekly'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
          }`}
        >
          📆 本周周报
        </button>
      </div>

      {/* Share target — 截图容器 */}
      <div ref={shareRef} className="bg-white dark:bg-stone-900 rounded-2xl p-1">
        {tab === 'daily' && daily && <DailyCard daily={daily} />}
        {tab === 'weekly' && weekly && <WeeklyCard weekly={weekly} />}
      </div>

      {/* 返回首页 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">
        <Link to="/" className="text-brand-600 hover:underline">
          ← 回到首页
        </Link>
      </div>
    </div>
  )
}

function Header({ onCopy }: { onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">📊 学习报告</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">
          看看你今天/本周的成长足迹
        </p>
      </div>
      <button
        onClick={onCopy}
        className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm hover:shadow-md active:scale-95 transition"
      >
        📤 分享
      </button>
    </div>
  )
}

function DailyCard({ daily }: { daily: DailyReport }) {
  return (
    <div className="space-y-4 p-3">
      {/* 鼓励文案大字 */}
      <div className="card bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-800 text-center py-8">
        <div className="text-3xl mb-2">✨</div>
        <div className="text-lg font-bold text-green-700 dark:text-green-300 leading-relaxed px-4">
          {daily.encouragement}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400 mt-3">{daily.date}</div>
      </div>

      {/* 4-6 个数据卡片 (2x3 网格) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard emoji="📖" label="学词" value={daily.wordsLearned} unit="个" color="from-blue-400 to-indigo-500" />
        <StatCard emoji="🎤" label="跟读" value={daily.pronunciationCount} unit="次" color="from-purple-400 to-pink-500" />
        <StatCard emoji="✏️" label="错题" value={daily.errorCount} unit="个" color="from-rose-400 to-red-500" />
        <StatCard emoji="⭐" label="新增收藏" value={daily.favoritesAdded} unit="个" color="from-amber-400 to-orange-500" />
        <StatCard emoji="🔥" label="连续" value={daily.streak} unit="天" color="from-orange-400 to-red-500" />
        <StatCard emoji="🏆" label="累计" value={daily.totalWords} unit="词" color="from-emerald-400 to-teal-500" />
      </div>
    </div>
  )
}

function WeeklyCard({ weekly }: { weekly: WeeklyReport }) {
  const maxDay = Math.max(1, ...weekly.dailyReports.map(d => d.wordsLearned))
  return (
    <div className="space-y-4 p-3">
      {/* 鼓励 + 对比 */}
      <div className="card bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-2 border-cyan-200 dark:border-cyan-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl">{weekly.trend.emoji}</div>
          <div className={`text-sm font-bold ${weekly.comparison.emoji === '📈' ? 'text-green-600' : weekly.comparison.emoji === '📉' ? 'text-red-600' : 'text-stone-500'}`}>
            {weekly.comparison.summary}
          </div>
        </div>
        <div className="text-base font-bold text-cyan-700 dark:text-cyan-300 leading-relaxed">
          {weekly.encouragement}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400 mt-2">
          本周 ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} 词
        </div>
      </div>

      {/* 7 天柱状图 */}
      <div className="card">
        <div className="text-sm font-semibold mb-3">📊 7 天学词</div>
        <div className="space-y-2">
          {weekly.dailyReports.map((d, i) => {
            const ratio = d.wordsLearned / maxDay
            return (
              <div key={d.date} className="flex items-center gap-2 text-xs">
                <div className="w-10 text-stone-500 dark:text-stone-400 text-right">{WEEKDAY_LABELS[i]}</div>
                <div className="flex-1 h-6 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                    style={{ width: `${Math.max(ratio * 100, d.wordsLearned > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <div className="w-8 text-right font-semibold">{d.wordsLearned}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top 5 学词 */}
      {weekly.topWords.length > 0 && (
        <div className="card">
          <div className="text-sm font-semibold mb-3">📚 Top 5 学词</div>
          <div className="space-y-2">
            {weekly.topWords.map((t, i) => (
              <div key={t.word.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-center text-stone-400">{i + 1}</span>
                <span className="font-semibold">{t.word.word}</span>
                <span className="text-xs text-stone-500 flex-1 truncate">
                  {t.word.translations[0] || ''}
                </span>
                <span className="text-xs text-stone-400">×{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 错题 */}
      {weekly.topErrors.length > 0 && (
        <div className="card">
          <div className="text-sm font-semibold mb-3">✏️ Top 5 错题</div>
          <div className="space-y-2">
            {weekly.topErrors.map((e, i) => (
              <div key={i} className="text-xs">
                <div className="line-through text-red-600 dark:text-red-400">{e.original}</div>
                <div className="text-green-600 dark:text-green-400">{e.corrected}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 没数据 fallback */}
      {weekly.totalWordsLearned === 0 && weekly.topErrors.length === 0 && (
        <div className="card text-center py-8 text-stone-500 dark:text-stone-400">
          <div className="text-4xl mb-2">🌱</div>
          本周还没有学习数据,先学几个词再来看看?
        </div>
      )}
    </div>
  )
}

function StatCard({ emoji, label, value, unit, color }: { emoji: string; label: string; value: number; unit: string; color: string }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className={`text-2xl font-bold bg-gradient-to-br ${color} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label} · {unit}</div>
    </div>
  )
}

// === 分享文本生成 (用于复制 + 截图提示) ===
function buildShareText(tab: Tab, daily: DailyReport | null, weekly: WeeklyReport | null): string {
  if (tab === 'daily' && daily) {
    return [
      '📅 我的今日学习报告',
      '',
      `📖 学词: ${daily.wordsLearned} 个`,
      `🎤 跟读: ${daily.pronunciationCount} 次`,
      `✏️ 错题: ${daily.errorCount} 个`,
      `⭐ 新增收藏: ${daily.favoritesAdded} 个`,
      `🔥 连续: ${daily.streak} 天`,
      `🏆 累计: ${daily.totalWords} 词`,
      '',
      `💬 ${daily.encouragement}`,
      '',
      '让英语在你想用的时候就能用上',
      'https://lingoo12138.github.io/english-app/',
    ].join('\n')
  }
  if (tab === 'weekly' && weekly) {
    const lines = [
      '📆 我的本周学习报告',
      '',
      `📊 本周共学 ${weekly.totalWordsLearned} 词`,
      `📈 趋势: ${weekly.trend.emoji} ${weekly.trend.direction === 'up' ? '上升' : weekly.trend.direction === 'down' ? '下降' : '平稳'}`,
      `📊 对比: ${weekly.comparison.summary}`,
    ]
    if (weekly.topWords.length > 0) {
      lines.push('', '📚 Top 5 学词:')
      weekly.topWords.forEach((t, i) => {
        lines.push(`  ${i + 1}. ${t.word.word} (${t.word.translations[0] || ''}) ×${t.count}`)
      })
    }
    lines.push('', `💬 ${weekly.encouragement}`, '', '让英语在你想用的时候就能用上', 'https://lingoo12138.github.io/english-app/')
    return lines.join('\n')
  }
  return '暂无数据'
}
