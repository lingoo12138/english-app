// useMediaQuery.ts - W148 桌面布局 hook
// 业务: Tailwind 的 lg:/xl: utility 是 CSS class, 但部分业务需要 JS 决策
//   (例: VirtualList.cols = 2 时 滚动 math 跟 cols = 1 不一样)
//   这时用 matchMedia API 拿运行时视口宽度
//
// 设计要点:
//   - SSR 兼容: 默认 false, mount 后再设 true (避免 hydration mismatch)
//   - 监听 resize: 跨断点变化时即时更新
//   - 老浏览器兼容: matchMedia 不存在时回退 false
import { useEffect, useState } from 'react'

/**
 * 响应式 media query hook
 * @param query - 例 '(min-width: 1280px)' 或 '(min-width: 1024px)'
 * @returns 匹配时为 true
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(query)
    // 初始立即同步一次 (避免 default false 闪屏)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    // mql.addEventListener 是新 API; 老 Safari 用 addListener
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mql.addListener(handler)
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mql.removeListener(handler)
      }
    }
  }, [query])

  return matches
}

/** 桌面 1280px+ 断点 (xl) — 跟 Tailwind xl 保持一致 */
export function useIsDesktopXL(): boolean {
  return useMediaQuery('(min-width: 1280px)')
}

/** 桌面 1024px+ 断点 (lg) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
