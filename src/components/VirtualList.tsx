// src/components/VirtualList.tsx - W135 轻量虚拟列表
// 业务: 5,423 词 + 长收藏列表 — 渲染视口内条目, 减少 DOM 节点
// 关键: a11y (键盘 + 屏幕阅读器) + 滚动锚点兼容 + 动态行高 (用 ResizeObserver)
// 设计: 不用 react-window 第三方库, 0 依赖
//   - 用 IntersectionObserver 检测容器可见
//   - 用 transform: translateY 偏移
//   - 维护 roving tabindex
//   - 固定 estimatedItemHeight, 真正高度可变时由外层 CSS 控制

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
  /** 容器 className */
  className?: string
  /** 容器内层 className (默认 'space-y-2') */
  innerClassName?: string
  /** a11y 标签 */
  ariaLabel?: string
  role?: string
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
  className = '',
  innerClassName = 'space-y-2',
  ariaLabel,
  role = 'list',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(800)

  // 当 items 数量过少, 直接全量渲染 (避免过度优化)
  const useVirtual = items.length >= threshold

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
  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    if (!useVirtual) {
      return { startIndex: 0, endIndex: items.length, offsetY: 0, totalHeight: items.length * estimatedItemHeight }
    }
    const itemsPerView = Math.ceil(viewportH / estimatedItemHeight)
    const start = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan)
    const end = Math.min(items.length, start + itemsPerView + overscan * 2)
    const offset = start * estimatedItemHeight
    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
      totalHeight: items.length * estimatedItemHeight,
    }
  }, [useVirtual, scrollTop, viewportH, estimatedItemHeight, overscan, items.length])

  // 触顶 / 触底
  useEffect(() => {
    if (!useVirtual) return
    if (onReachStart && startIndex <= overscan) onReachStart()
    if (onReachEnd && endIndex >= items.length - overscan) onReachEnd()
  }, [useVirtual, startIndex, endIndex, items.length, overscan, onReachStart, onReachEnd])

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

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
              return (
                <div
                  key={getKey ? getKey(item, realIndex) : realIndex}
                  style={{ minHeight: estimatedItemHeight }}
                  data-virtual-index={realIndex}
                >
                  {renderItem(item, realIndex)}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={innerClassName}>
          {items.map((item, i) => (
            <div
              key={getKey ? getKey(item, i) : i}
              style={{ minHeight: estimatedItemHeight }}
            >
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
