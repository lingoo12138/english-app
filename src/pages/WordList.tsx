import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import { loadWords, LEVELS } from '../lib/words'
import type { Word } from '../types'
import WordCard from '../components/WordCard'
import { addFavorite, removeFavorite, getAllFavorites } from '../lib/db'
import { useStore } from '../store/useStore'

const PAGE_SIZE = 50
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function getFirstLetter(word: string): string {
  const c = word.charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

export default function WordList() {
  const [allWords, setAllWords] = useState<Word[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')  // 修复: 搜索 debounce 300ms
  const [level, setLevel] = useState<string>('all')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const favSetRef = useRef(favSet)
  favSetRef.current = favSet
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string>('')
  const targetLevel = useStore(s => s.targetLevel)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // 修复: 搜索 debounce 300ms,避免 5000 词全表过滤
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // 切换学段或搜索时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
    setActiveLetter('')
  }, [level, debouncedQuery])

  // 修复 P0-2: 进度条用只用 level 过滤的集合, 不受 search 污染
  const levelOnlyFiltered = useMemo(() => {
    if (level === 'all') return allWords
    return allWords.filter(w => w.level === level)
  }, [allWords, level])

  const filtered = useMemo(() => {
    let result = allWords
    if (level !== 'all') {
      result = result.filter(w => w.level === level)
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.translations.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [allWords, level, debouncedQuery])

  // 词库中存在的首字母(包含 #,避免未来加中文拼音词时幽灵轴点)
  const availableLetters = useMemo(() => {
    const set = new Set<string>()
    filtered.forEach(w => set.add(getFirstLetter(w.word)))
    return set
  }, [filtered])

  // 完整字母表 + # 号位
  const allLetters = useMemo(() => [...ALPHABET, '#'], [])

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

  // 监听当前可见的首字母
  // 修复: 依赖 availableLetters.size (不是 visible.length) - 避免每次分页重建
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        // 找最靠近顶部的可见锚点
        const visibleEntries = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visibleEntries.length > 0) {
          const letter = visibleEntries[0].target.getAttribute('data-letter-anchor')
          if (letter) setActiveLetter(letter)
        }
      },
      // 修复: top 0(不缩小)配合 scroll-margin-top: 60px
      // 头部 sticky bar 高 60px,scrollIntoView 会把锚点滚到 viewport 60px 处
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )

    const anchors = containerRef.current.querySelectorAll('[data-letter-anchor]')
    anchors.forEach(a => observer.observe(a))
    return () => observer.disconnect()
    // 修复: 加上 visible.length,让分页加载后出现的字母锚点重新被 observe
  }, [availableLetters.size, level, debouncedQuery, visible.length])

  // 滚动到指定字母
  // 修复: 不立即 setActiveLetter(避免与 IO race),滚动完成后由 IO 决定
  const scrollToLetter = useCallback((letter: string) => {
    if (!containerRef.current) return
    const el = containerRef.current.querySelector(`[data-letter-anchor="${letter}"]`)
    if (el) {
      // 用 scrollIntoView 的 scroll-margin 避免被 sticky 拦裁
      ;(el as HTMLElement).style.scrollMarginTop = '60px'
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // 乐观设置 activeLetter,但 IO 会在滚动后覆盖
      setActiveLetter(letter)
    }
  }, [])

  const handleToggleFav = useCallback(async (word: Word) => {
    // 用 ref 读取最新值,避免 callback 重建
    if (favSetRef.current.has(word.id)) {
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
  }, [])  // 不依赖 favSet,避免每次收藏重建 callback

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">词库</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          {loading ? '加载中...' : `共 ${allWords.length} 个词 · 已显示 ${visible.length} · 收藏 ${favSet.size}`}
        </p>
        {/* v0.14 学段进度条 - 修复 P0-2: 用 levelOnlyFiltered 不受 search 污染 */}
        {!loading && allWords.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
              <span>{level === 'all' ? '全部' : (LEVELS.find(l => l.value === level)?.label || level)}</span>
              <span>{levelOnlyFiltered.length} 个{query.trim() && filtered.length !== levelOnlyFiltered.length ? ` (${filtered.length} 搜索后)` : ''}</span>
            </div>
            <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-[width] duration-300"
                style={{ width: `${Math.min(100, (levelOnlyFiltered.length / allWords.length) * 100)}%` }}
              />
            </div>
          </div>
        )}
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

      {/* 字母索引条 */}
      {!query.trim() && availableLetters.size > 0 && (
        <div className="sticky top-14 md:top-0 z-10 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur py-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-stone-200 dark:border-stone-800">
          <div className="flex gap-1 overflow-x-auto">
            {allLetters.map(letter => {
              const has = availableLetters.has(letter)
              const isActive = activeLetter === letter
              return (
                <button
                  key={letter}
                  onClick={() => has && scrollToLetter(letter)}
                  disabled={!has}
                  className={`w-7 h-7 flex-shrink-0 rounded text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : has
                        ? 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                        : 'text-stone-300 dark:text-stone-600 dark:text-stone-300'
                  }`}
                  aria-label={`跳转到 ${letter}`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 词条列表 */}
      <div ref={containerRef}>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-500 dark:text-stone-400">
            {loading ? '加载中...' : '没有匹配的词'}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visible.map((word, i) => {
                const firstLetter = getFirstLetter(word.word)
                const prevLetter = i > 0 ? getFirstLetter(visible[i - 1].word) : null
                const showAnchor = firstLetter !== prevLetter
                return (
                  <Fragment key={word.id}>
                    {showAnchor && !query.trim() && (
                      <div
                        data-letter-anchor={firstLetter}
                        className="pt-2 pb-1 px-1 first:pt-0"
                      >
                        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                          {firstLetter}
                        </div>
                      </div>
                    )}
                    <WordCard
                      word={word}
                      isFavorite={favSet.has(word.id)}
                      onToggleFavorite={() => handleToggleFav(word)}
                    />
                  </Fragment>
                )
              })}
            </div>
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
              <div className="text-center text-xs text-stone-400 dark:text-stone-300 py-4">
                已显示全部 {filtered.length} 个词
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
