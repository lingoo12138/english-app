// src/lib/virtualScroll.ts - W135 轻量虚拟滚动 hook
// 业务: 5,423 词 + 课程/收藏 长列表 — 用 IntersectionObserver 代替完整 virtual scroll lib
// 关键: 维持键盘焦点 + 屏幕阅读器 a11y + 字母锚点 (W116)

import { useEffect, useRef, useState, type RefObject } from 'react'

export interface VirtualScrollOptions {
  /** 总条数 */
  total: number
  /** 每条估算高度 (px) */
  estimatedItemHeight: number
  /** 视口高度 (px) — 默认 window.innerHeight */
  viewportHeight?: number
  /** 上下预渲染条数 (避免快速滚动白屏) */
  overscan?: number
  /** 滚动容器 ref (默认 window) */
  scrollContainerRef?: RefObject<HTMLElement>
}

/** 简易虚拟滚动 — 计算应渲染的 startIndex/endIndex */
export function useVirtualScroll({
  total,
  estimatedItemHeight,
  viewportHeight,
  overscan = 5,
  scrollContainerRef,
}: VirtualScrollOptions) {
  const fallbackViewport = typeof window !== 'undefined' ? window.innerHeight : 800
  const vh = viewportHeight ?? fallbackViewport
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const target = (scrollContainerRef?.current ?? window) as HTMLElement | Window
    const onScroll = () => {
      if (target === window) {
        setScrollTop(window.scrollY)
      } else {
        setScrollTop((target as HTMLElement).scrollTop)
      }
    }
    onScroll()
    target.addEventListener('scroll' as any, onScroll, { passive: true })
    return () => target.removeEventListener('scroll' as any, onScroll)
  }, [scrollContainerRef])

  // 估算 start/end
  const itemsPerViewport = Math.ceil(vh / estimatedItemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan)
  const endIndex = Math.min(total, startIndex + itemsPerViewport + overscan * 2)
  const offsetTop = startIndex * estimatedItemHeight
  const totalHeight = total * estimatedItemHeight

  return { startIndex, endIndex, offsetTop, totalHeight }
}
