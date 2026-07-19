import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { loadWords, LEVELS } from '../lib/words'
import type { Word } from '../types'
import WordCard from '../components/WordCard'
import { addFavorite, removeFavorite, getAllFavorites } from '../lib/db'
import { useStore } from '../store/useStore'

const PAGE_SIZE = 50

export default function WordList() {
  const [allWords, setAllWords] = useState<Word[]>([])
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<string>('all')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const targetLevel = useStore(s => s.targetLevel)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    loadWords().then((words) => {
      setAllWords(words)
      setLoading(false)
    })
    getAllFavorites().then(favs => {
      setFavSet(new Set(favs.map(f => f.wordId)))
    })
  }, [])

  useEffect(() => {
    if (level === 'all' && targetLevel !== 'all') {
      setLevel(targetLevel)
    }
  }, [targetLevel, level])

  // 切换学段或搜索时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
  }, [level, query])

  const filtered = useMemo(() => {
    let result = allWords
    if (level !== 'all') {
      result = result.filter(w => w.level === level)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.translations.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [allWords, level, query])

  const visible = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // 无限滚动
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(c => Math.min(c + PAGE_SIZE, filtered.length))
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, filtered.length])

  const handleToggleFav = useCallback(async (word: Word) => {
    if (favSet.has(word.id)) {
      await removeFavorite(word.id)
      setFavSet(prev => {
        const next = new Set(prev)
        next.delete(word.id)
        return next
      })
    } else {
      await addFavorite(word.id)
      setFavSet(prev => new Set(prev).add(word.id))
    }
  }, [favSet])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">词库</h1>
        <p className="text-stone-500 text-sm">
          {loading ? '加载中...' : `共 ${allWords.length} 个词 · 已显示 ${visible.length}`}
        </p>
      </div>

      {/* 搜索 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索单词或中文..."
        className="input"
      />

      {/* 学段筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              level === l.value
                ? 'bg-brand-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* 词条列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          {loading ? '加载中...' : '没有匹配的词'}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map(word => (
              <WordCard
                key={word.id}
                word={word}
                isFavorite={favSet.has(word.id)}
                onToggleFavorite={() => handleToggleFav(word)}
              />
            ))}
          </div>
          {/* 哨兵元素:用于触发加载更多 */}
          {hasMore && (
            <>
              <div ref={sentinelRef} className="h-4" />
              <div className="text-center py-4">
                <button
                  onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
                  className="btn-ghost text-sm"
                >
                  加载更多 ↓
                </button>
              </div>
            </>
          )}
          {!hasMore && filtered.length > 0 && (
            <div className="text-center text-xs text-stone-400 py-4">
              已显示全部 {filtered.length} 个词
            </div>
          )}
        </>
      )}
    </div>
  )
}
