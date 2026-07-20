import { useState } from 'react'
import TTSButton from '../components/TTSButton'
import { getTodaySentence, getAllSentences } from '../lib/daily'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'
import { useEffect } from 'react'
import type { DailySentence } from '../types'

export default function DailyPage() {
  const [sentences] = useState<DailySentence[]>(getAllSentences())
  const [todayIdx, setTodayIdx] = useState(0)
  const [favSet, setFavSet] = useState<Set<number>>(new Set())
  const today = getTodaySentence()

  useEffect(() => {
    setTodayIdx(sentences.findIndex(s => s.id === today.id))
  }, [sentences, today.id])

  // 加载所有 30 句的收藏状态(修复:历史也加收藏)
  useEffect(() => {
    const loadFavs = async () => {
      const favs = new Set<number>()
      for (const s of sentences) {
        if (await isFavorite(`daily-${s.id}`)) favs.add(s.id)
      }
      setFavSet(favs)
    }
    loadFavs()
  }, [sentences])

  const handleToggleFav = async (s: DailySentence) => {
    const id = `daily-${s.id}`
    if (favSet.has(s.id)) {
      await removeFavorite(id)
      const next = new Set(favSet)
      next.delete(s.id)
      setFavSet(next)
    } else {
      await addFavorite(id)
      const next = new Set(favSet)
      next.add(s.id)
      setFavSet(next)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">每日一句</h1>
        <p className="text-stone-500 text-sm">每天一句,真实场景下能直接用</p>
      </div>

      {/* 今日推荐 */}
      {sentences[todayIdx] && (
        <div className="card bg-gradient-to-br from-brand-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">今日推荐</span>
            <span className="text-xs opacity-80">{sentences[todayIdx].scene}</span>
          </div>
          <p className="text-2xl font-medium mb-3 leading-relaxed">
            {sentences[todayIdx].en}
          </p>
          <p className="text-base opacity-90 mb-4">{sentences[todayIdx].zh}</p>
          <div className="flex items-center gap-3">
            <TTSButton text={sentences[todayIdx].en} variant="text" />
            <button
              onClick={() => handleToggleFav(sentences[todayIdx])}
              className="text-sm opacity-90 hover:opacity-100"
            >
              {favSet.has(sentences[todayIdx].id) ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
          </div>
        </div>
      )}

      {/* 历史每日一句 */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 mb-3 mt-6">历史精选</h2>
        <div className="space-y-3">
          {sentences.map((s, idx) => (
            <div
              key={s.id}
              className={`card ${idx === todayIdx ? 'ring-2 ring-brand-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-500">#{s.id} · {s.scene}</span>
                <button
                  onClick={() => handleToggleFav(s)}
                  className="text-sm text-stone-500 hover:text-amber-500"
                  aria-label={favSet.has(s.id) ? '取消收藏' : '收藏'}
                >
                  {favSet.has(s.id) ? '⭐' : '☆'}
                </button>
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-lg font-medium flex-1">{s.en}</p>
                <TTSButton text={s.en} size="sm" />
              </div>
              <p className="text-sm text-stone-500">{s.zh}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
