// src/pages/TranslationFavsPage.tsx - v1.97 W89-C 释义收藏增强 (统计/时间/词性/导出 JSON)
// v1.94 W88-B: 按 word 分组, 搜索 + 删除
// v1.97 W89-C: 加 时间分组 + 词性过滤 + 统计 + JSON 导出
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllTranslationFavs, removeTranslationFav, type TranslationFav } from '../lib/db'
import { loadWords } from '../lib/words'
import type { Word } from '../types'
import { toast } from '../components/Toast'
import {
  groupByTime,
  groupByPos,
  filterFavs as filterFavsLib,
  computeFavStats,
  exportFavsAsJson,
  type FavWithWord,
  type TimeGroup,
} from '../lib/translationFavFilter'
import { searchAllWords, type CrossWordSearchOutput } from '../lib/translationFavSearch'

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
  // v1.97 W89-C: 时间分组 + 词性过滤
  const [timeFilters, setTimeFilters] = useState<TimeGroup[]>([])
  const [posFilters, setPosFilters] = useState<string[]>([])
  // 视图模式: 'word' (按 word 分组) | 'time' (按时间分组)
  const [viewMode, setViewMode] = useState<'word' | 'time'>('word')
  // v2.0.7 W98: 跨词 搜索 模式 (全词库 vs 仅收藏)
  const [crossWordMode, setCrossWordMode] = useState(false)
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

  // v1.97 W89-C: 用 FavWithWord 重算 (多维度过滤)
  const favsWithWord: FavWithWord[] = useMemo(() => {
    return favs.map(f => ({ fav: f, word: wordMap.get(f.wordId) || null }))
  }, [favs, wordMap])

  // 搜索 + 时间 + 词性 多维度过滤
  const filteredFavs = useMemo(() => {
    return filterFavsLib(favsWithWord, {
      search,
      timeGroups: timeFilters.length > 0 ? timeFilters : undefined,
      posKeys: posFilters.length > 0 ? posFilters : undefined,
    })
  }, [favsWithWord, search, timeFilters, posFilters])

  // v2.0.7 W98: 跨词 搜索 结果 (P1-1 单遍 输出)
  const allWords = useMemo(() => Array.from(wordMap.values()), [wordMap])  // P2-11
  const crossWordOutput: CrossWordSearchOutput = useMemo(() => {
    if (!crossWordMode || !search.trim()) return { results: [], totalMatches: 0, truncated: false }
    return searchAllWords(allWords, favs, search, 50)
  }, [crossWordMode, search, allWords, favs])

  // 按 wordId 分组 (用于 word 视图)
  const grouped: GroupedFav[] = useMemo(() => {
    const map = new Map<string, TranslationFav[]>()
    for (const fw of filteredFavs) {
      const f = fw.fav
      if (!map.has(f.wordId)) map.set(f.wordId, [])
      map.get(f.wordId)!.push(f)
    }
    const groups: GroupedFav[] = []
    for (const [wordId, list] of map) {
      list.sort((a, b) => a.index - b.index)
      groups.push({ wordId, word: wordMap.get(wordId) || null, favs: list })
    }
    return groups
  }, [filteredFavs, wordMap])

  // 按时间分组 (用于 time 视图)
  const timeGroups = useMemo(() => groupByTime(filteredFavs), [filteredFavs])

  // 统计
  const stats = useMemo(() => computeFavStats(favsWithWord), [favsWithWord])

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
        <h1 className="text-2xl font-bold">
          {crossWordMode && search.trim() ? '🔍 跨词搜索' : `⭐ 释义收藏`} ({crossWordMode && search.trim() ? crossWordOutput.totalMatches : favs.length})
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const json = exportFavsAsJson(favsWithWord)
              const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `translation-favs-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
              toast.success(`导出 ${favs.length} 条收藏`)
            }}
            className="text-stone-500 hover:text-stone-700 text-sm"
            title="导出 JSON"
          >
            📥 JSON
          </button>
          <button onClick={() => navigate(-1)} className="text-stone-500 hover:text-stone-700">
            ← 返回
          </button>
        </div>
      </div>

      {/* v1.97 W89-C: 统计 */}
      <div className="card text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-brand-500">{stats.total}</div>
            <div className="text-xs text-stone-500">总数</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-500">{stats.uniqueWords}</div>
            <div className="text-xs text-stone-500">单词数</div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-500">{stats.thisWeek}</div>
            <div className="text-xs text-stone-500">本周</div>
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500">{stats.today}</div>
            <div className="text-xs text-stone-500">今日</div>
          </div>
        </div>
        {stats.mostFaved && stats.mostFaved.count > 1 && (
          <div className="text-xs text-stone-500 mt-2 text-center">
            ⭐ 最常收藏: <span className="font-bold">{stats.mostFaved.word}</span> ({stats.mostFaved.count} 条)
          </div>
        )}
      </div>

      {/* 搜索 */}
      <div className="card">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索词名/词根/释义/例句/短语..."
          className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 mb-2"
        />
        {/* v2.0.7 W98: 跨词 搜索 模式 */}
        <label className="flex items-center gap-2 text-xs mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={crossWordMode}
            onChange={e => setCrossWordMode(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-stone-700 dark:text-stone-300">
            🔍 全词库搜索 (搜词名/词根/释义/例句/短语)
            {crossWordMode && search.trim() && (
              <span className="ml-1 text-brand-500">
              · 命中 {crossWordOutput.totalMatches} 词
              {crossWordOutput.truncated && <span className="text-amber-500"> (仅显示前 50)</span>}
            </span>
            )}
          </span>
        </label>
        {/* v1.97 W89-C: 时间 + 词性过滤 */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-stone-500">时间:</span>
          {(['today', 'thisWeek', 'thisMonth', 'earlier'] as TimeGroup[]).map(g => (
            <button
              key={g}
              onClick={() => setTimeFilters(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
              className={`px-2 py-0.5 rounded ${
                timeFilters.includes(g) ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {g === 'today' ? '今天' : g === 'thisWeek' ? '本周' : g === 'thisMonth' ? '本月' : '更早'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs mt-1">
          <span className="text-stone-500">词性:</span>
          {['noun', 'verb', 'adj', 'adv'].map(p => (
            <button
              key={p}
              onClick={() => setPosFilters(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
              className={`px-2 py-0.5 rounded ${
                posFilters.includes(p) ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {p === 'noun' ? '名词' : p === 'verb' ? '动词' : p === 'adj' ? '形容词' : '副词'}
            </button>
          ))}
        </div>
        {/* v1.97 W89-C: 视图切换 */}
        <div className="flex gap-2 text-xs mt-2">
          <span className="text-stone-500">视图:</span>
          <button
            onClick={() => setViewMode('word')}
            className={`px-2 py-0.5 rounded ${viewMode === 'word' ? 'bg-stone-700 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
          >
            按单词
          </button>
          <button
            onClick={() => setViewMode('time')}
            className={`px-2 py-0.5 rounded ${viewMode === 'time' ? 'bg-stone-700 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
          >
            按时间
          </button>
        </div>
      </div>

      {/* 列表 - 按视图模式 */}
      {crossWordMode && search.trim() ? (
        /* v2.0.7 W98: 跨词 搜索 模式 */
        <div className="space-y-2">
          {crossWordOutput.truncated && (
            <div className="text-xs text-amber-600 dark:text-amber-400 text-center">
              ⚠️ 命中 {crossWordOutput.totalMatches} 词, 仅显示前 50; 缩小查询以查看更多
            </div>
          )}
          {crossWordOutput.results.length === 0 ? (
            <div className="card text-center py-6 text-stone-500 text-sm">
              全词库中无匹配 "{search}"
            </div>
          ) : (
            crossWordOutput.results.map(r => (
              <div key={r.word.id} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/words/${r.word.id}`} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                    {r.word.word}
                  </Link>
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600">
                      {r.matchedField === 'word' ? '词名' : r.matchedField === 'root' ? '词根' : r.matchedField === 'translation' ? '释义' : r.matchedField === 'example' ? '例句' : '短语'}
                    </span>
                    {r.favCount > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        ⭐ {r.favCount}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">未收藏</span>
                    )}
                  </div>
                </div>
                {r.word.roots && r.word.roots.length > 0 && (
                  <div className="text-xs text-stone-500 mb-1">
                    词根: {r.word.roots.map(rt => `${rt.root}(${rt.meaning})`).join(', ')}
                  </div>
                )}
                {r.matchedFavs.length > 0 ? (
                  <div className="space-y-1">
                    {r.matchedFavs.map(f => (
                      <div key={`${f.wordId}-${f.index}`} className="text-sm flex items-center gap-2">
                        <span className="text-amber-500">★</span>
                        <span>{f.text}</span>
                        <button
                          onClick={() => handleRemove(f)}
                          className="text-xs text-stone-400 hover:text-red-500 ml-auto"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-stone-500">
                    释义: {(r.word.translations || []).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : filteredFavs.length === 0 ? (
        <div className="card text-center py-6 text-stone-500 text-sm">
          没有匹配的收藏
        </div>
      ) : viewMode === 'time' ? (
        /* 按时间视图 */
        (['today', 'thisWeek', 'thisMonth', 'earlier'] as const).map(tg => {
          const list = timeGroups[tg]
          if (list.length === 0) return null
          const label = tg === 'today' ? '🕐 今天' : tg === 'thisWeek' ? '📅 本周' : tg === 'thisMonth' ? '📆 本月' : '📦 更早'
          return (
            <div key={tg} className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                {label} ({list.length})
              </h3>
              {list.map(fw => (
                <div key={`${fw.fav.wordId}-${fw.fav.index}`} className="card p-3 flex items-center gap-2">
                  {fw.word ? (
                    <Link to={`/words/${fw.word.id}`} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      {fw.word.word}
                    </Link>
                  ) : (
                    <span className="text-stone-400 text-sm">[未知]</span>
                  )}
                  <span className="text-sm text-stone-600 dark:text-stone-400 flex-1">{fw.fav.text}</span>
                  <span className="text-xs text-stone-400">
                    {new Date(fw.fav.addedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleRemove(fw.fav)}
                    className="text-stone-400 hover:text-rose-500 text-sm px-2"
                    title="取消收藏"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        })
      ) : (
        /* 按单词视图 */
        grouped.map(g => (
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
