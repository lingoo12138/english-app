// src/lib/prefetch.ts — W135 路由 + 资源预取
// 3 个策略:
//   1. hoverPrefetch: 用户 hover 链接 (>= 50ms) 时预取链接指向的 chunk
//   2. idlePrefetch: requestIdleCallback / setTimeout fallback 在浏览器空闲时预取关键页面
//   3. lastVisitPrefetch: sessionStorage 记录上次访问页面, 重启时优先预热
//
// 设计原则:
//   - 0 第三方依赖 (无 react-router 的预取 hook, 自己手写最小实现)
//   - 0 业务侵入: 业务可只调 usePrefetch() 一个 hook 或纯函数 prefetchRoute(path)
//   - 防抖 50ms: 避免 hover 即拉 (用户可能只是划过)
//   - 错误静默: 预取失败不阻塞, console.debug 即可
//   - 重复预取 dedup: 同一 path 在 30s 内只预取 1 次
//
// 触发:
//   - Layout 内的 NavLink 用 <PrefetchLink> 替代, 自动接 hover
//   - App 启动时调 scheduleIdlePrefetch(), 拉最热的 3-5 个页面
//   - 路径切换时调 recordVisit(path), sessionStorage 记下

/** 路由 → chunk 名 映射表 (与 src/App.tsx 的 lazy import 对应) */
const ROUTE_CHUNKS: Record<string, () => Promise<unknown>> = {}

/** 记录某路由已预取过的时间戳 (dedup) */
const _prefetched = new Map<string, number>()

/** dedup 窗口: 30s 内同一 path 只预取 1 次 */
const DEDUP_WINDOW_MS = 30 * 1000

/**
 * 注册路由 chunk (业务在 App 启动时调一次, 传入 lazy import 函数)
 *
 * 例子:
 *   registerPrefetchRoute('/words', () => import('../pages/WordList'))
 */
export function registerPrefetchRoute(
  path: string,
  importer: () => Promise<unknown>
): void {
  ROUTE_CHUNKS[path] = importer
}

/**
 * 预取某路由 (返回 Promise, 失败静默)
 *
 * 例子:
 *   await prefetchRoute('/words')
 */
export async function prefetchRoute(path: string): Promise<boolean> {
  // 0. 已在 dedup 窗口内: 跳过
  const last = _prefetched.get(path)
  if (last && Date.now() - last < DEDUP_WINDOW_MS) {
    return true
  }
  // 1. 没注册: 不能预取, 静默返回
  const importer = ROUTE_CHUNKS[path]
  if (!importer) {
    if (import.meta.env?.DEV) {
      console.debug('[prefetch] no chunk for', path)
    }
    return false
  }
  // 2. 标记并执行
  _prefetched.set(path, Date.now())
  try {
    await importer()
    if (import.meta.env?.DEV) {
      console.debug('[prefetch] warm', path)
    }
    return true
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.debug('[prefetch] failed', path, err)
    }
    return false
  }
}

/**
 * 清除 dedup 缓存 (测试用)
 */
export function _resetPrefetchDedupForTest(): void {
  _prefetched.clear()
}

/**
 * 触发 hover 预取 (>= delay 才拉, 避免划过)
 *
 * 例子:
 *   <Link onMouseEnter={() => scheduleHoverPrefetch('/words')} onFocus={...}>
 */
export function scheduleHoverPrefetch(path: string, delay = 50): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const trigger = () => {
    timer && clearTimeout(timer)
    timer = setTimeout(() => {
      prefetchRoute(path)
    }, delay)
  }
  // 立即调, 内部 setTimeout 延迟执行
  trigger()
}

/**
 * requestIdleCallback 包装 (带 setTimeout fallback)
 *
 * 例子:
 *   whenIdle(() => prefetchRoute('/words'))
 */
export function whenIdle(cb: () => void, timeout = 2000): void {
  if (typeof (globalThis as any).requestIdleCallback === 'function') {
    ;(globalThis as any).requestIdleCallback(cb, { timeout })
    return
  }
  // Fallback: setTimeout 100ms
  setTimeout(cb, 100)
}

/**
 * 在浏览器 idle 时批量预取关键页面
 *
 * 业务: App 启动后调一次, 把最热的几个页面 chunk 提前拉好
 * 例子:
 *   scheduleIdlePrefetch(['/words', '/chat', '/scenes'])
 */
export function scheduleIdlePrefetch(paths: string[], timeout = 2000): void {
  whenIdle(() => {
    paths.forEach((p) => prefetchRoute(p))
  }, timeout)
}

// === 上次访问预热 (W135) ===

const LAST_VISIT_KEY = '__last-visit__'
const MAX_VISIT_HISTORY = 5

/**
 * 记录用户访问了某路径 (持久化 sessionStorage, 跨刷新)
 */
export function recordVisit(path: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const raw = sessionStorage.getItem(LAST_VISIT_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    // 移到队首, 去重
    const next = [path, ...arr.filter((p) => p !== path)].slice(0, MAX_VISIT_HISTORY)
    sessionStorage.setItem(LAST_VISIT_KEY, JSON.stringify(next))
  } catch {
    // sessionStorage 满了 / 禁用: 静默
  }
}

/**
 * 读取上次访问的 N 个路径 (默认 3)
 */
export function getRecentVisits(limit = 3): string[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(LAST_VISIT_KEY)
    if (!raw) return []
    const arr: string[] = JSON.parse(raw)
    return arr.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * 预热上次访问的页面 (App 启动时调)
 */
export function warmRecentVisits(): void {
  const visits = getRecentVisits(3)
  if (visits.length === 0) return
  whenIdle(() => {
    visits.forEach((p) => prefetchRoute(p))
  })
}

// === React hook 集成 ===

/**
 * usePrefetch — 鼠标 hover/focus 链接时预取目标路由
 *
 * 例子:
 *   const prefetch = usePrefetch()
 *   <Link to="/words" onMouseEnter={() => prefetch('/words')}>
 */
export function usePrefetch() {
  return (path: string) => scheduleHoverPrefetch(path)
}

// === 当前预取状态 (供测试) ===

/** 测试用: 拿当前 prefetched map 快照 */
export function _getPrefetchedForTest(): Record<string, number> {
  return Object.fromEntries(_prefetched.entries())
}
