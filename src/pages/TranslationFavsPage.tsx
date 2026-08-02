// src/pages/TranslationFavsPage.tsx - v1.94 W88-B 释义收藏列表页
// 按 word 分组, 搜索 + 删除
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllTranslationFavs, removeTranslationFav, type TranslationFav } from '../lib/db'
import { loadWords } from '../lib/words'
import type { Word } from '../types'
import { toast } from '../components/Toast'

interface GroupedFav {
  wordId: string
  word: Word | null  // 可能查不到
  favs: TranslationFav[]
}

export default function TranslationFavsPage() {
  const [favs, setFavs] = useState<TranslationFav[]>([])
  const [wordMap, setWordMap] = useState<Map<string, Word>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [allFavs, words] = await Promise.all([
        getAllTranslationFavs(),
        loadWords(),
      ])
      const map = new Map<string, Word>()
      for (const w of words) map.set(w.id, w)
      setFavs(allFavs)
      setWordMap(map)
      setLoading(false)
    } catch (e) {
      console.error('[TranslationFavs] load:', e)
      toast.error('加载收藏失败')
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 按 wordId 分组
  const grouped: GroupedFav[] = useMemo(() => {
    const map = new Map<string, TranslationFav[]>()
    for (const f of favs) {
      if (!map.has(f.wordId)) map.set(f.wordId, [])
      map.get(f.wordId)!.push(f)
    }
    const groups: GroupedFav[] = []
    for (const [wordId, list] of map) {
      // 按 index 升序
      list.sort((a, b) => a.index - b.index)
      groups.push({ wordId, word: wordMap.get(wordId) || null, favs: list })
    }
    return groups
  }, [favs, wordMap])

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    return grouped.filter(g => {
      if (g.word && g.word.word.toLowerCase().includes(q)) return true
      // 搜释义文本
      return g.favs.some(f => f.text.toLowerCase().includes(q))
    })
  }, [grouped, search])

  const handleRemove = useCallback(async (fav: TranslationFav) => {
    try {
      await removeTranslationFav(fav.wordId, fav.index)
      setFavs(prev => prev.filter(f => !(f.wordId === fav.wordId && f.index === fav.index)))
      toast.success('已取消收藏')
    } catch (e) {
      console.error('[TranslationFavs] remove:', e)
      toast.error('删除失败')
    }
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-stone-500">加载收藏中...</div>
  }

  if (favs.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">⭐ 释义收藏</h1>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-lg mb-1">还没收藏释义</p>
          <p className="text-sm text-stone-500 mb-4">去单词详情页, 点 ⭐ 收藏喜欢的释义</p>
          <div className="flex justify-center gap-2">
            <Link to="/words" className="btn-primary">📖 去词库</Link>
            <button onClick={() => navigate('/')} className="btn-ghost">🏠 回首页</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⭐ 释义收藏 ({favs.length})</h1>
        <button onClick={() => navigate(-1)} className="text-stone-500 hover:text-stone-700">
          ← 返回
        </button>
      </div>

      {/* 搜索 */}
      <div className="card">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索单词或释义..."
          className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900"
        />
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="card text-center py-6 text-stone-500 text-sm">
          没有匹配的收藏
        </div>
      ) : (
        filtered.map(g => (
          <div key={g.wordId} className="card">
            <div className="flex items-center justify-between mb-3">
              {g.word ? (
                <Link
                  to={`/words/${g.word.id}`}
                  className="text-lg font-bold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {g.word.word}
                </Link>
              ) : (
                <span className="text-stone-400 text-sm">[未知词 {g.wordId}]</span>
              )}
              <span className="text-xs text-stone-400">
                {g.favs.length} 条收藏
              </span>
            </div>
            <div className="space-y-2">
              {g.favs.map(fav => (
                <div
                  key={`${fav.wordId}-${fav.index}`}
                  className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded"
                >
                  <div className="flex-1">
                    <div className="text-xs text-stone-500 mb-0.5">释义 {fav.index + 1}</div>
                    <div className="text-sm">{fav.text}</div>
                    <div className="text-xs text-stone-400 mt-1">
                      {new Date(fav.addedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(fav)}
                    className="text-stone-400 hover:text-rose-500 text-sm px-2"
                    title="取消收藏"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
