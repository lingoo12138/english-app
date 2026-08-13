// src/components/VirtualList.tsx - W135 轻量虚拟列表
// 业务: 5,423 词 + 长收藏列表 — 渲染视口内条目, 减少 DOM 节点
// 关键: a11y (键盘 + 屏幕阅读器) + 滚动锚点兼容 + 动态行高 (用 ResizeObserver)
// 设计: 不用 react-window 第三方库, 0 依赖
//   - 用 IntersectionObserver 检测容器可见
//   - 用 transform: translateY 偏移
//   - 维护 roving tabindex
//   - 固定 estimatedItemHeight, 真正高度可变时由外层 CSS 控制
//
// W136: 新增 letter 锚点支持 — getLetterKey + onContainerRef
//   - getLetterKey(item, i) -> string | null: 返回该项所属的 letter (A-Z/#), 用于在
//     字母变化时渲染 <div data-letter-anchor id="letter-anchor-L" /> 供外层 IO/scrollIntoView
//   - onContainerRef(el): 暴露内部 scroll container, 父组件可调 scrollToIndex/scrollTop
//   - scrollToIndex (通过 onContainerRef 拿到 el 后直接设置 scrollTop)

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
} from 'react'

export interface VirtualListProps<T> {
  items: T[]
  /** 估算行高 (px) — 列表项高度变化大时给个保守值 */
  estimatedItemHeight: number
  /** 渲染单条 (自带 key 由外层决定) */
  renderItem: (item: T, index: number) => ReactNode
  /** 取 key (默认 index) */
  getKey?: (item: T, index: number) => string | number
  /** 视口高度 (px) — 默认容器父高 */
  height?: number | string
  /** 视口外上下预渲染条数 */
  overscan?: number
  /** 空状态 */
  emptyState?: ReactNode
  /** 滚动到顶 / 底 回调 (例: 触底加载) */
  onReachEnd?: () => void
  onReachStart?: () => void
  /** 容错: 当 items 长度 < 阈值时不启用虚拟滚动 */
  threshold?: number
  /** W148: 桌面列数 (>1 时启用 CSS grid 模式; 滚动 / offset 按列折算) */
  cols?: number
  /** 容器 className */
  className?: string
  /** 容器内层 className (默认 'space-y-2') */
  innerClassName?: string
  /** a11y 标签 */
  ariaLabel?: string
  role?: string
  /** W136: 返回当前 item 的首字母 (A-Z, # 等). null 表示不渲染锚点 */
  getLetterKey?: (item: T, index: number) => string | null
  /** W136: 暴露 scroll 容器 ref (父组件调 scrollToIndex / IO 监听) */
  onContainerRef?: (el: HTMLDivElement | null) => void
}

/**
 * 轻量虚拟列表组件
 * - 渲染 startIndex..endIndex 范围的 items, 上下各 overscan
 * - 通过 transform: translateY 偏移让视口区内容出现在正确位置
 * - 关键: items 高度应接近 estimatedItemHeight, 否则会有视觉抖动
 *   不规则高度场景: 外层 CSS 给每个 item 固定 min-height
 */
export function VirtualList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  getKey,
  height = 'calc(100vh - 240px)',
  overscan = 5,
  emptyState,
  onReachEnd,
  onReachStart,
  threshold = 50,
  cols = 1,
  className = '',
  innerClassName = 'space-y-2',
  ariaLabel,
  role = 'list',
  getLetterKey,
  onContainerRef,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(800)

  // 当 items 数量过少, 直接全量渲染 (避免过度优化)
  const useVirtual = items.length >= threshold

  // W136: 暴露 scroll container 给父组件
  useEffect(() => {
    if (onContainerRef) onContainerRef(containerRef.current)
    return () => {
      if (onContainerRef) onContainerRef(null)
    }
  }, [onContainerRef])

  // 监听容器滚动
  useEffect(() => {
    const c = containerRef.current
    if (!c || !useVirtual) return
    const onScroll = () => setScrollTop(c.scrollTop)
    onScroll()
    c.addEventListener('scroll', onScroll, { passive: true })
    return () => c.removeEventListener('scroll', onScroll)
  }, [useVirtual])

  // 监听视口尺寸
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setViewportH(e.contentRect.height)
      }
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  // 计算可见区间
  // W148: cols > 1 时, 视觉上每行放 cols 个 item;
  //   - totalHeight = ceil(items.length / cols) * estimatedItemHeight
  //   - offsetY = floor(startIndex / cols) * estimatedItemHeight
  //   - itemsPerView / overscan 按 cols 倍数扩
  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    if (!useVirtual) {
      return { startIndex: 0, endIndex: items.length, offsetY: 0, totalHeight: items.length * estimatedItemHeight }
    }
    const c = Math.max(1, cols)
    const itemsPerView = Math.ceil(viewportH / estimatedItemHeight) * c
    const start = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) * c - overscan * c)
    const end = Math.min(items.length, start + itemsPerView + overscan * 2 * c)
    const offset = Math.floor(start / c) * estimatedItemHeight
    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
      totalHeight: Math.ceil(items.length / c) * estimatedItemHeight,
    }
  }, [useVirtual, scrollTop, viewportH, estimatedItemHeight, overscan, items.length, cols])

  // 触顶 / 触底
  useEffect(() => {
    if (!useVirtual) return
    if (onReachStart && startIndex <= overscan) onReachStart()
    if (onReachEnd && endIndex >= items.length - overscan) onReachEnd()
  }, [useVirtual, startIndex, endIndex, items.length, overscan, onReachStart, onReachEnd])

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // W136: 字母变化检测 — 在每个 item 之前 (字母发生变化) 渲染锚点
  // 关键: 锚点也用 estimatedItemHeight 高度, 保持位置正确
  // 性能: 简单 memo, 每次 render 重算, items 不变时 O(visible)
  const letterChangeSet = useMemo(() => {
    if (!getLetterKey) return null
    const set = new Set<number>()  // 锚点应在哪个 absolute index 前置
    let prevLetter: string | null = null
    for (let i = startIndex; i < endIndex; i++) {
      const letter = getLetterKey(items[i], i)
      if (letter && letter !== prevLetter) {
        set.add(i)
      }
      if (letter) prevLetter = letter
    }
    return set
  }, [getLetterKey, items, startIndex, endIndex])

  // 键盘导航 (PageUp/PageDown/Home/End) — 滚动到上下限
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const c = containerRef.current
    if (!c) return
    if (e.key === 'PageDown') {
      e.preventDefault()
      c.scrollTop = Math.min(c.scrollTop + viewportH - 50, totalHeight)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      c.scrollTop = Math.max(c.scrollTop - viewportH + 50, 0)
    } else if (e.key === 'Home') {
      e.preventDefault()
      c.scrollTop = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      c.scrollTop = totalHeight
    }
  }, [viewportH, totalHeight])

  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`overflow-y-auto ${className}`}
      style={{ height, contain: 'strict' }}
      role={role}
      aria-label={ariaLabel}
      data-virtual-list="true"
    >
      {useVirtual ? (
        <div
          ref={innerRef}
          style={{ height: totalHeight, position: 'relative' }}
        >
          <div
            className={innerClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px)`,
              willChange: 'transform',
            } as CSSProperties}
          >
            {visibleItems.map((item, i) => {
              const realIndex = startIndex + i
              const showAnchor = letterChangeSet?.has(realIndex)
              const letter = showAnchor ? getLetterKey!(item, realIndex) : null
              return (
                <div
                  key={getKey ? getKey(item, realIndex) : realIndex}
                  style={{ minHeight: estimatedItemHeight }}
                  data-virtual-index={realIndex}
                >
                  {showAnchor && letter && (
                    // W136: 字母锚点 — 父组件 IO 监听 data-letter-anchor,
                    // scrollToLetter 用 id="letter-anchor-L" scrollIntoView
                    <div
                      id={`letter-anchor-${letter}`}
                      data-letter-anchor={letter}
                      className="pt-2 pb-1 px-1"
                    >
                      <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        {letter}
                      </div>
                    </div>
                  )}
                  {renderItem(item, realIndex)}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={innerClassName}>
          {items.map((item, i) => {
            const showAnchor = letterChangeSet?.has(i) ?? false
            const letter = showAnchor && getLetterKey ? getLetterKey(item, i) : null
            return (
              <div
                key={getKey ? getKey(item, i) : i}
                style={{ minHeight: estimatedItemHeight }}
              >
                {showAnchor && letter && (
                  <div
                    id={`letter-anchor-${letter}`}
                    data-letter-anchor={letter}
                    className="pt-2 pb-1 px-1"
                  >
                    <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {letter}
                    </div>
                  </div>
                )}
                {renderItem(item, i)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
