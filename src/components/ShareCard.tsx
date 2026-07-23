// ShareCard.tsx - v1.1-F1 学习海报分享卡
// 设计: 渐变 + 大数字 + 成就感, 让用户想晒
import { useEffect, useState } from 'react'
import { getStreak, getTotalDays } from '../lib/streak'
import { getAllFavorites, getTotalLearned, getAllWritingErrors } from '../lib/db'
import { getWord } from '../lib/words'


export type ShareCardStyle = 'simple' | 'gradient' | 'retro'

export interface ShareCardData {
  streak: number           // 连续天数
  totalDays: number        // 累计学习天数
  totalLearned: number     // 累计词数
  favoriteCount: number    // 收藏数
  errorCount: number       // 错题数
  topFavorites: Array<{ word: string; translation: string }>  // Top 3 收藏
}

/**
 * 聚合学习数据 (用于分享)
 */
export async function loadShareCardData(): Promise<ShareCardData> {
  const [streak, totalDays, totalLearned, favorites, errors] = await Promise.all([
    getStreak(),
    getTotalDays(),
    getTotalLearned(),
    getAllFavorites(),
    getAllWritingErrors(),
  ])

  // Top 3 收藏
  const topFavorites: Array<{ word: string; translation: string }> = []
  for (const f of favorites.slice(0, 3)) {
    const w = await getWord(f.wordId)
    if (w) {
      topFavorites.push({ word: w.word, translation: w.translations[0] || w.word })
    }
  }

  return {
    streak,
    totalDays,
    totalLearned,
    favoriteCount: favorites.length,
    errorCount: errors.length,
    topFavorites,
  }
}

interface Props {
  data: ShareCardData
  style: ShareCardStyle
}

/**
 * 3 套风格背景
 */
const STYLE_BG: Record<ShareCardStyle, string> = {
  simple: 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100',
  gradient: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 text-white',
  retro: 'bg-gradient-to-br from-amber-100 via-orange-200 to-pink-200 text-amber-900',
}

const STYLE_ACCENT: Record<ShareCardStyle, string> = {
  simple: 'text-green-600',
  gradient: 'text-white drop-shadow-md',
  retro: 'text-orange-700',
}

export function ShareCard({ data, style }: Props) {
  const bg = STYLE_BG[style]
  const accent = STYLE_ACCENT[style]

  return (
    <div
      className={`w-full max-w-md aspect-[4/5] rounded-2xl shadow-2xl p-8 flex flex-col ${bg}`}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* 头部 */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📚</div>
        <h1 className="text-2xl font-bold">句刻 · 我的英语学习</h1>
        <p className="text-sm opacity-70 mt-1">让英语在你想用的时候就能用上</p>
      </div>

      {/* 4 大数据 (2x2 网格) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Stat label="🔥 连续学习" value={data.streak} unit="天" accent={accent} />
        <Stat label="📅 累计天数" value={data.totalDays} unit="天" accent={accent} />
        <Stat label="📖 学过词数" value={data.totalLearned} unit="词" accent={accent} />
        <Stat label="⭐ 收藏" value={data.favoriteCount} unit="个" accent={accent} />
      </div>

      {/* 错题 */}
      {data.errorCount > 0 && (
        <div className={`text-center text-sm mb-6 opacity-80`}>
          已改 <span className="font-bold text-lg">{data.errorCount}</span> 个错题
        </div>
      )}

      {/* Top 3 收藏 */}
      {data.topFavorites.length > 0 && (
        <div className="mt-auto">
          <div className="text-xs opacity-70 mb-2">最近收藏</div>
          <div className="space-y-1.5">
            {data.topFavorites.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-lg">{f.word}</span>
                <span className="opacity-80">{f.translation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部引导 */}
      {data.topFavorites.length === 0 && (
        <div className="mt-auto text-center text-sm opacity-70">
          开始你的学习旅程 →
        </div>
      )}

      {/* 水印 */}
      <div className="mt-4 text-center text-xs opacity-50">
        扫码加入句刻 · lingoo12138/english-app
      </div>
    </div>
  )
}

function Stat({ label, value, unit, accent }: { label: string; value: number; unit: string; accent: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-black/5 dark:bg-white/5">
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs opacity-70 mt-1">{label} · {unit}</div>
    </div>
  )
}

/**
 * ShareCard hook: 自动加载数据
 */
export function useShareCardData() {
  const [data, setData] = useState<ShareCardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadShareCardData()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
