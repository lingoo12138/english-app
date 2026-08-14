import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { loadWords, LEVELS } from '../lib/words'
import type { Word } from '../types'
import WordCard from '../components/WordCard'
// W135: 虚 拟 列 表 — 5000 词 不 全 渲 染 DOM (省 80% 内存 + 滚 动 60fps)
// W136: 虚 拟 列 表 加 getLetterKey + onContainerRef — 字 母 索 引 在 virtual 模 式 也 生效
import { VirtualList } from '../components/VirtualList'
import { addFavorite, removeFavorite, getAllFavorites, getAllTranslationFavs } from '../lib/db'
import { useStore } from '../store/useStore'
import { useTranslate } from '../lib/useTranslate'
// W148: 桌面 1280px+ 2-3 列网格 (lg=2 / xl=3, lg 用单词列已有 sticky alpha-index 留位)
import { useIsDesktopXL } from '../lib/useMediaQuery'
// W148-A: 监听 w148-shortcut 事件 — j/k 移动选中, Enter 跳详情
import { SHORTCUT_EVENT, type ShortcutEventDetail } from '../lib/keyboardShortcuts'

const PAGE_SIZE = 50
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
// W135: 虚 拟 滚 动 阈 值 — 超 过 此 数 量 启 用 虚 拟 列 表
const VIRTUAL_THRESHOLD = 200
// W135: 词 卡 估 算 高 度 (px) — Letter 锚 点 ~24px + WordCard ~88px
const WORD_CARD_ESTIMATED_HEIGHT = 112

function getFirstLetter(word: string): string {
  const c = word.charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

export default function WordList() {
  // v1.49.0 W46: i18n
  const { t } = useTranslate()
  const [allWords, setAllWords] = useState<Word[]>([])
  // v1.86: 从 URL ?q= 读初始 query (触类旁通跳转用)
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState('')  // 修复: 搜索 debounce 300ms
  const [level, setLevel] = useState<string>('all')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  // W102: 收藏 数量 map (per word)
  const [favCountMap, setFavCountMap] = useState<Record<string, number>>({})
  const favSetRef = useRef(favSet)
  favSetRef.current = favSet
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  // W102: 跳 释义收藏 跨词 模式
  const handleClickFavs = useCallback((w: Word) => {
    navigate(`/translation-favs?word=${encodeURIComponent(w.word)}`)
  }, [navigate])
  const [activeLetter, setActiveLetter] = useState<string>('')
  const targetLevel = useStore(s => s.targetLevel)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // W136: VirtualList 内部 scroll container — virtual 模式下字母索引 IO / 滚动都用这个
  const virtualScrollRef = useRef<HTMLDivElement | null>(null)
  // W116: 移 动 端 字 母 索 引 横 滚 容 器
  const mobileAlphaRef = useRef<HTMLDivElement>(null)
  // W148: 桌面 1280px+ 检测 — 决定 virtual 列表 cols (1 → 2)
  const isDesktopXL = useIsDesktopXL()
  // W148-A: j/k 选中词索引 (在 visible 数组里, 非整 filtered), -1 = 无选中
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  useEffect(() => {
    setLoading(true)
    loadWords()
      .then((words) => setAllWords(words))
      .catch(e => console.error('[WordList] loadWords failed:', e))
      .finally(() => setLoading(false))
    getAllFavorites()
      .then(favs => setFavSet(new Set(favs.map(f => f.wordId))))
      .catch(e => console.error('[WordList] getAllFavorites failed:', e))
  }, [])

  // W102 修 v1 (P2-1 修): mount 时 拉 一 次, 避 免 冗 余 fetch
  useEffect(() => {
    getAllTranslationFavs()
      .then(favs => {
        const m: Record<string, number> = {}
        for (const f of favs) m[f.wordId] = (m[f.wordId] || 0) + 1
        setFavCountMap(m)
      })
      .catch(e => console.error('[WordList] getAllTranslationFavs failed:', e))
  }, [])  // mount only - 跨 路由 跳 后 remount 自 动 重 拉

  useEffect(() => {
    if (level === 'all' && targetLevel !== 'all') {
      setLevel(targetLevel)
    }
  }, [targetLevel, level])

  // W148-A: 监听 w148-shortcut 事件, j/k 移动选中, Enter 跳详情
  // 业务: 全词库 5423 词, 虚拟列表 j/k 移动只在 visible 范围内 (UI 上滚动到可见)
  // 注: useEffect 必须放在 filtered useMemo 之后 (filtered 引用)
  // 此处先声明 setSelectedIndex, 实际 listener 移到 filtered 之后

  // W148-A: 切换学段 / 搜索时, 重置选中
  useEffect(() => {
    setSelectedIndex(-1)
  }, [level, debouncedQuery])

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

  // W148-A: 监听 w148-shortcut 事件 — j/k 移动选中, Enter 跳详情
  // 放在 filtered 之后 (filtered 引用), TS 友好
  useEffect(() => {
    const onShortcut = (e: Event) => {
      const detail = (e as CustomEvent<ShortcutEventDetail>).detail
      if (!detail) return
      if (detail.action === 'list-down') {
        setSelectedIndex((prev) => {
          const max = filtered.length - 1
          if (max < 0) return -1
          if (prev < 0) return 0
          return Math.min(prev + 1, max)
        })
      } else if (detail.action === 'list-up') {
        setSelectedIndex((prev) => {
          if (prev <= 0) return prev < 0 ? -1 : 0
          return prev - 1
        })
      } else if (detail.action === 'list-open') {
        // 拿当前选中, 跳到 /words/:id
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          const w = filtered[selectedIndex]
          if (w) navigate(`/words/${encodeURIComponent(w.id)}`)
        }
      }
    }
    window.addEventListener(SHORTCUT_EVENT, onShortcut as EventListener)
    return () => window.removeEventListener(SHORTCUT_EVENT, onShortcut as EventListener)
  }, [filtered, selectedIndex, navigate])

  // 完整字母表 + # 号位
  const allLetters = useMemo(() => [...ALPHABET, '#'], [])

  // W136: 字母 -> 首个 item index 映射 (virtual 模式用, scrollToLetter 计算 scrollTop)
  //   - 搜索时不计算 (有 query 时字母索引隐藏, scrollToLetter 不会被调)
  //   - 性能: 5000 词 + 26 字母 = O(N) 一次
  const letterIndexMap = useMemo(() => {
    if (query.trim()) return null
    const m: Record<string, number> = {}
    for (let i = 0; i < filtered.length; i++) {
      const l = getFirstLetter(filtered[i].word)
      if (!(l in m)) m[l] = i
    }
    return m
  }, [filtered, query])

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
  // W136: virtual 模式下锚点在 VirtualList 内部 scroll container, 用 virtualScrollRef; 非 virtual 模式用 containerRef
  useEffect(() => {
    const isVirtual = filtered.length >= VIRTUAL_THRESHOLD
    // 选正确的 scroll 容器: virtual → VirtualList 内部; 非 virtual → 外面 containerRef
    const scrollEl = isVirtual ? virtualScrollRef.current : containerRef.current
    if (!scrollEl) return
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

    const anchors = scrollEl.querySelectorAll('[data-letter-anchor]')
    anchors.forEach(a => observer.observe(a))
    return () => observer.disconnect()
  }, [availableLetters.size, level, debouncedQuery, visible.length, filtered.length])

  // W116: 移 动 端 字 母 索 引 横 滚 自 动 跟 激 活 字 母 (scrollIntoView center)
  useEffect(() => {
    if (!mobileAlphaRef.current || !activeLetter) return
    const activeBtn = mobileAlphaRef.current.querySelector(`[data-letter="${activeLetter}"]`) as HTMLElement | null
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeLetter])

  // 滚动到指定字母
  // 修复: 不立即 setActiveLetter(避免与 IO race),滚动完成后由 IO 决定
  // W136: virtual 模式直接用 scrollTop (字 母 -> index 映射), 非 virtual 用 scrollIntoView
  // W148: 桌面 2-3 列时, item 视觉行 = Math.floor(idx / cols), scrollTop 按行算
  const scrollToLetter = useCallback((letter: string) => {
    if (filtered.length >= VIRTUAL_THRESHOLD) {
      // Virtual 模式: 直接设 scroll container scrollTop
      const scroller = virtualScrollRef.current
      if (!scroller || !letterIndexMap) return
      const idx = letterIndexMap[letter]
      if (idx === undefined) return
      // sticky top 头高 60px 偏移
      const STICKY_OFFSET = 60
      // W148: cols>1 时, 视觉行 = floor(idx / cols), scrollTop 按行
      const visualCols = isDesktopXL ? 2 : 1
      const visualRow = Math.floor(idx / visualCols)
      scroller.scrollTo({ top: Math.max(0, visualRow * WORD_CARD_ESTIMATED_HEIGHT - STICKY_OFFSET), behavior: 'smooth' })
      setActiveLetter(letter)
      return
    }
    // 非 virtual 模式: 原 scrollIntoView 路径
    if (!containerRef.current) return
    const el = containerRef.current.querySelector(`[data-letter-anchor="${letter}"]`)
    if (el) {
      // 用 scrollIntoView 的 scroll-margin 避免被 sticky 拦裁
      ;(el as HTMLElement).style.scrollMarginTop = '60px'
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // 乐观设置 activeLetter,但 IO 会在滚动后覆盖
      setActiveLetter(letter)
    }
  }, [filtered.length, letterIndexMap, isDesktopXL])

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
        <h1 className="text-2xl font-bold mb-1">{t('wordlist.title')}</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          {loading ? t('common.loading') : t('wordlist.count_summary').replace('N', String(allWords.length)).replace('M', String(visible.length)).replace('K', String(favSet.size))}
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
        placeholder={t('wordlist.search_placeholder')}
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

      {/* W116 字 母 索 引 动 效 (spring 弹入 + scale-110 + ease-spring) */}
      {!query.trim() && availableLetters.size > 0 && (
        <>
          {/* 移动端: 横 滚 sticky top-14 */}
          <div className="md:hidden sticky top-14 z-10 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur py-2 -mx-4 px-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide" ref={mobileAlphaRef}>
              {allLetters.map(letter => {
                const has = availableLetters.has(letter)
                const isActive = activeLetter === letter
                return (
                  <button
                    key={letter}
                    data-letter={letter}
                    onClick={() => has && scrollToLetter(letter)}
                    disabled={!has}
                    className={`w-7 h-7 flex-shrink-0 rounded text-xs font-bold transition-all duration-[var(--t-base)] ease-[var(--ease-spring)] ${
                      isActive
                        ? 'bg-brand-600 text-white scale-110 shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                        : has
                          ? 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:scale-105'
                          : 'text-stone-300 dark:text-stone-600'
                    }`}
                    aria-label={`跳转到 ${letter}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
          {/* 桌面端: 右 侧 竖 排 sticky */}
          <div className="hidden md:flex md:flex-col md:fixed md:right-3 md:top-1/2 md:-translate-y-1/2 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur rounded-full p-1 shadow-[var(--shadow-soft)] border border-stone-200 dark:border-stone-800 max-h-[80vh] overflow-y-auto scrollbar-hide">
            {allLetters.map(letter => {
              const has = availableLetters.has(letter)
              const isActive = activeLetter === letter
              return (
                <button
                  key={letter}
                  data-letter={letter}
                  onClick={() => has && scrollToLetter(letter)}
                  disabled={!has}
                  className={`w-6 h-6 flex-shrink-0 rounded-full text-[10px] font-bold transition-all duration-[var(--t-base)] ease-[var(--ease-spring)] ${
                    isActive
                      ? 'bg-brand-600 text-white scale-110 shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                      : has
                        ? 'text-stone-700 dark:text-stone-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:scale-110'
                        : 'text-stone-300 dark:text-stone-600'
                  }`}
                  aria-label={`跳转到 ${letter}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* 词条列表 — W135: 5000+ 词 走 虚 拟 滚 动 (省 DOM), < 200 词 保留 原 有 pagination + 字母锚点
       * W148: 桌面 1280px+ 改 2-3 列 (xl:2, 0-1279px 保持单列)
       *   - virtual 模式: innerClassName = 'grid grid-cols-2 gap-3' + cols=2 prop (VirtualList 滚动 math 按列折算)
       *   - 非 virtual 模式 (< 200 词): grid-cols-2 layout
       *   - 0-1279px 保持单列 (space-y-2)
      */}
      <div ref={containerRef}>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-500 dark:text-stone-400">
            {loading ? t('common.loading') : t('wordlist.empty')}
          </div>
        ) : filtered.length >= VIRTUAL_THRESHOLD ? (
          // W135: 虚 拟 滚 动 模 式 (>= 200 条)
          // 业务: 全词库 5423 词, 渲染所有 5423 个 WordCard 会卡 200ms+, 虚拟滚动只渲染视口内 ~12 个
          // W136: 字母锚点由 VirtualList 内部渲染 (getLetterKey); scroll container 通过 onContainerRef 暴露
          // W148: 桌面 cols=2, 移动 cols=1, innerClassName 同步 grid
          <VirtualList
            items={filtered}
            estimatedItemHeight={WORD_CARD_ESTIMATED_HEIGHT}
            height="calc(100vh - 280px)"
            overscan={8}
            threshold={VIRTUAL_THRESHOLD}
            cols={isDesktopXL ? 2 : 1}
            innerClassName={isDesktopXL ? 'grid grid-cols-2 gap-3' : 'space-y-2'}
            ariaLabel="词条列表 (虚拟滚动)"
            getKey={(w) => w.id}
            getLetterKey={(w) => query.trim() ? null : getFirstLetter(w.word)}
            onContainerRef={(el) => { virtualScrollRef.current = el }}
            renderItem={(word) => {
              const i = filtered.indexOf(word)
              return (
                <WordCard
                  word={word}
                  isFavorite={favSet.has(word.id)}
                  onToggleFavorite={() => handleToggleFav(word)}
                  favCount={favCountMap[word.id]}
                  onClickFavs={() => handleClickFavs(word)}
                  isSelected={i === selectedIndex}
                  dataTestId={i === selectedIndex ? 'word-list-selected' : undefined}
                />
              )
            }}
            emptyState={<div className="text-center py-12 text-stone-500 dark:text-stone-400">无匹配词</div>}
          />
        ) : (
          <>
            {/* W148: < 200 词 (非 virtual), 桌面 2 列 */}
            <div className={isDesktopXL ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
              {visible.map((word, i) => {
                const firstLetter = getFirstLetter(word.word)
                const prevLetter = i > 0 ? getFirstLetter(visible[i - 1].word) : null
                const showAnchor = firstLetter !== prevLetter
                // W148-A: 找到 word 在 filtered 里的全局 index, 用于 selectedIndex 比较
                const globalIndex = filtered.indexOf(word)
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
                      favCount={favCountMap[word.id]}
                      onClickFavs={() => handleClickFavs(word)}
                      isSelected={globalIndex === selectedIndex}
                      dataTestId={globalIndex === selectedIndex ? 'word-list-selected' : undefined}
                      // W149 反馈 3: 分页模式 stagger fade-in (virtual 模式不加, 会跟 scroll 冲突)
                      className="stagger-item"
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
                    {t('wordlist.load_more')}
                  </button>
                </div>
              </>
            )}
            {!hasMore && filtered.length > 0 && (
              <div className="text-center text-xs text-stone-400 dark:text-stone-300 py-4">
                {t('wordlist.all_loaded').replace('N', String(filtered.length))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
