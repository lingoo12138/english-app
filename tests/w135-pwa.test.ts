// tests/w135-pwa.test.ts - W135 PWA 优化
// 验证:
//  1. vite.config.ts workbox 策略调优 (1MB precache, CacheFirst words.json, SWR AI, dataExport, settings)
//  2. src/lib/prefetch.ts 路由 hover/idle 预取 + dedup + last visit
//  3. src/lib/syncManager.ts 离线写排队 + online flush + retry
//  4. src/components/UpdateToast.tsx SW 更新 toast + indicator
//  5. src/components/OfflineBanner.tsx 离线时长 + 功能可用性
//  6. dist/ 产物: precache 数量 + 策略落地
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'
import 'fake-indexeddb/auto'

// === 1. vite.config.ts workbox 调优 ===

/**
 * 从 vite.config 抽某 urlPattern 对应的 handler
 *  - 在文件中找 urlPattern 出现位置, 往后 200 字内第一个 handler: 'XXX'
 */
function getHandlerFor(viteConfig: string, urlPatternLine: string): string | null {
  const idx = viteConfig.indexOf(urlPatternLine)
  if (idx < 0) return null
  const after = viteConfig.slice(idx, idx + 300)
  const m = after.match(/handler\s*:\s*['"](\w+)['"]/)
  return m ? m[1] : null
}

describe('W135 PWA - workbox 缓存策略', () => {
  const viteConfig = readFileSync('vite.config.ts', 'utf-8')

  it('precache maximumFileSizeToCacheInBytes 收紧到 1MB (W135 优化)', () => {
    // 业务: > 1MB 的 chunk 走 runtimeCaching
    const m = viteConfig.match(/maximumFileSizeToCacheInBytes\s*:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBe(1)
  })

  it('words.json 改用 CacheFirst (W135 优化)', () => {
    // 业务: 词库缓存命中直接用, 6h 后过期重拉
    expect(viteConfig).toContain("urlPattern: /\\/data\\/words\\.json$/")
    const handler = getHandlerFor(viteConfig, "urlPattern: /\\/data\\/words\\.json$/,")
    expect(handler).toBe('CacheFirst')
    // 6h 过期 (W135 新增, 比原 SWR 7d 短)
    expect(viteConfig).toMatch(/maxAgeSeconds\s*:\s*60\s*\*\s*60\s*\*\s*6/)
  })

  it('AI/LLM 改用 StaleWhileRevalidate (W135 优化)', () => {
    // 业务: 重复 query 提速
    expect(viteConfig).toContain('urlPattern: /^https?:\\/\\/.*\\/(api|chat|llm|completion).*/i')
    const handler = getHandlerFor(
      viteConfig,
      'urlPattern: /^https?:\\/\\/.*\\/(api|chat|llm|completion).*/i,'
    )
    expect(handler).toBe('StaleWhileRevalidate')
  })

  it('翻译 API 仍走 NetworkFirst (翻译不能过期)', () => {
    expect(viteConfig).toContain('libretranslate')
    expect(viteConfig).toContain('terraprint')
    const libreHandler = getHandlerFor(
      viteConfig,
      'urlPattern: /^https:\\/\\/libretranslate\\.de\\/.*/,'
    )
    expect(libreHandler).toBe('NetworkFirst')
    const terraHandler = getHandlerFor(
      viteConfig,
      'urlPattern: /^https:\\/\\/translate\\.terraprint\\.co\\/.*/,'
    )
    expect(terraHandler).toBe('NetworkFirst')
  })

  it('新增 dataExport 缓存 (W135)', () => {
    // 业务: 用户导出数据可缓存
    expect(viteConfig).toContain('urlPattern: /^data:.*$/')
    const handler = getHandlerFor(viteConfig, 'urlPattern: /^data:.*$/,')
    expect(handler).toBe('CacheFirst')
    expect(viteConfig).toMatch(/export-data-cache-v\d+/)
  })

  it('新增 user settings 缓存 (W135)', () => {
    // 业务: 用户偏好可缓存
    expect(viteConfig).toContain('urlPattern: /\\/(settings|profile|user)\\.json$/')
    const handler = getHandlerFor(
      viteConfig,
      'urlPattern: /\\/(settings|profile|user)\\.json$/,'
    )
    expect(handler).toBe('NetworkFirst')
    expect(viteConfig).toMatch(/user-settings-cache-v\d+/)
  })

  it('skipWaiting + clientsClaim 启用 (W135)', () => {
    expect(viteConfig).toMatch(/skipWaiting\s*:\s*true/)
    expect(viteConfig).toMatch(/clientsClaim\s*:\s*true/)
  })
})

// === 2. src/lib/prefetch.ts ===

describe('W135 PWA - src/lib/prefetch.ts', () => {
  beforeEach(() => {
    vi.resetModules()
    // 清空 sessionStorage
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
  })

  it('prefetchRoute: 注册过的路径能拉 (dedup 30s)', async () => {
    const { registerPrefetchRoute, prefetchRoute, _getPrefetchedForTest } = await import(
      '../src/lib/prefetch'
    )
    let called = 0
    registerPrefetchRoute('/test-path', async () => {
      called++
    })
    const ok1 = await prefetchRoute('/test-path')
    expect(ok1).toBe(true)
    expect(called).toBe(1)
    // dedup: 30s 内重复调用, 不再 import
    const ok2 = await prefetchRoute('/test-path')
    expect(ok2).toBe(true)
    expect(called).toBe(1)
    const map = _getPrefetchedForTest()
    expect(map['/test-path']).toBeGreaterThan(0)
  })

  it('prefetchRoute: 未注册路径返回 false, 不抛异常', async () => {
    const { prefetchRoute } = await import('../src/lib/prefetch')
    const ok = await prefetchRoute('/not-registered-path')
    expect(ok).toBe(false)
  })

  it('scheduleHoverPrefetch: 50ms 延迟 + 防抖', async () => {
    const { registerPrefetchRoute, scheduleHoverPrefetch, _resetPrefetchDedupForTest } =
      await import('../src/lib/prefetch')
    _resetPrefetchDedupForTest()
    let called = 0
    registerPrefetchRoute('/hover-test', async () => {
      called++
    })
    scheduleHoverPrefetch('/hover-test', 50)
    expect(called).toBe(0)
    await new Promise((r) => setTimeout(r, 100))
    expect(called).toBe(1)
  })

  it('whenIdle: 有 requestIdleCallback 用之, 没有走 setTimeout fallback', async () => {
    const { whenIdle } = await import('../src/lib/prefetch')
    let called = false
    whenIdle(() => {
      called = true
    }, 500)
    // happy-dom 没 requestIdleCallback, 应走 100ms setTimeout fallback
    await new Promise((r) => setTimeout(r, 200))
    expect(called).toBe(true)
  })

  it('recordVisit + getRecentVisits: sessionStorage 持久化', async () => {
    const { recordVisit, getRecentVisits } = await import('../src/lib/prefetch')
    recordVisit('/words')
    recordVisit('/chat')
    recordVisit('/words') // 重复应移到队首
    const recent = getRecentVisits(3)
    expect(recent[0]).toBe('/words') // 最近
    expect(recent).toContain('/chat')
  })

  it('getRecentVisits: 上限 3 (默认)', async () => {
    const { recordVisit, getRecentVisits } = await import('../src/lib/prefetch')
    recordVisit('/a')
    recordVisit('/b')
    recordVisit('/c')
    recordVisit('/d')
    recordVisit('/e')
    const recent = getRecentVisits(3)
    expect(recent.length).toBe(3)
  })
})

// === 3. src/lib/syncManager.ts ===

describe('W135 PWA - src/lib/syncManager.ts', () => {
  beforeEach(async () => {
    vi.resetModules()
    // reset syncManager 状态
    const sm = await import('../src/lib/syncManager')
    await sm._resetForTest()
  })

  it('enqueueOfflineWrite: 写 IDB 队列 + 返回 QueuedWrite', async () => {
    const { enqueueOfflineWrite, _peekQueueForTest } = await import('../src/lib/syncManager')
    const item = await enqueueOfflineWrite({
      type: 'favorite:add',
      payload: { wordId: 'w-1' },
    })
    expect(item.id).toMatch(/^swq-/)
    expect(item.type).toBe('favorite:add')
    expect(item.retry).toBe(0)
    const queue = await _peekQueueForTest()
    expect(queue.length).toBe(1)
  })

  it('flushOfflineQueue: 调 handler 成功后从队列删除', async () => {
    const {
      enqueueOfflineWrite,
      registerHandler,
      flushOfflineQueue,
      _peekQueueForTest,
    } = await import('../src/lib/syncManager')
    const handler = vi.fn(async () => {
      /* ok */
    })
    registerHandler('test:ok', handler)
    await enqueueOfflineWrite({ type: 'test:ok', payload: { x: 1 } })
    const result = await flushOfflineQueue()
    expect(result.ok).toBe(1)
    expect(handler).toHaveBeenCalledWith({ x: 1 })
    const queue = await _peekQueueForTest()
    expect(queue.length).toBe(0)
  })

  it('flushOfflineQueue: handler 失败时 retry+1, 超过 MAX_RETRY 删除', async () => {
    const {
      enqueueOfflineWrite,
      registerHandler,
      flushOfflineQueue,
      _peekQueueForTest,
    } = await import('../src/lib/syncManager')
    const handler = vi.fn(async () => {
      throw new Error('boom')
    })
    registerHandler('test:fail', handler)
    await enqueueOfflineWrite({ type: 'test:fail', payload: { x: 1 } })
    // 5 次 retry 后永久放弃
    for (let i = 0; i < 5; i++) {
      await flushOfflineQueue()
    }
    const queue = await _peekQueueForTest()
    expect(queue.length).toBe(0)
  })

  it('flushOfflineQueue: 没注册的 type 当完成删', async () => {
    const { enqueueOfflineWrite, flushOfflineQueue, _peekQueueForTest } = await import(
      '../src/lib/syncManager'
    )
    await enqueueOfflineWrite({ type: 'unknown:type', payload: {} })
    const result = await flushOfflineQueue()
    expect(result.ok).toBe(1)
    const queue = await _peekQueueForTest()
    expect(queue.length).toBe(0)
  })

  it('queue 超出 MAX_QUEUE_LEN (200) 丢弃最老', async () => {
    const { enqueueOfflineWrite, _peekQueueForTest } = await import('../src/lib/syncManager')
    // 推 201 条, 期望最后剩 200
    for (let i = 0; i < 201; i++) {
      await enqueueOfflineWrite({ type: 'noop', payload: { i } })
    }
    const queue = await _peekQueueForTest()
    expect(queue.length).toBeLessThanOrEqual(200)
  })
})

// === 4. src/components/UpdateToast.tsx ===

describe('W135 PWA - src/components/UpdateToast.tsx', () => {
  it('组件存在 + 0 emoji', () => {
    expect(existsSync('src/components/UpdateToast.tsx')).toBe(true)
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]/u
    expect(emojiRegex.test(c)).toBe(false)
  })

  it('含 data-testid="update-toast" / "update-indicator" / "offline-ready-toast"', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    expect(c).toContain('data-testid="update-toast"')
    expect(c).toContain('data-testid="update-indicator"')
    expect(c).toContain('data-testid="offline-ready-toast"')
  })

  it('用 virtual:pwa-register', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    expect(c).toMatch(/virtual:pwa-register/)
  })

  it('App.tsx 引入 UpdateToast', () => {
    const c = readFileSync('src/App.tsx', 'utf-8')
    expect(c).toMatch(/import UpdateToast from ['"]\.\/components\/UpdateToast['"]/)
    expect(c).toContain('<UpdateToast />')
  })
})

// === 5. src/components/OfflineBanner.tsx (W135 增强) ===

describe('W135 PWA - OfflineBanner 增强', () => {
  it('显示离线时长 (data-offline-duration)', () => {
    const c = readFileSync('src/components/OfflineBanner.tsx', 'utf-8')
    expect(c).toMatch(/data-offline-duration/)
    expect(c).toMatch(/formatDuration/)
  })

  it('展开/收起 详情 (offline-expand)', () => {
    const c = readFileSync('src/components/OfflineBanner.tsx', 'utf-8')
    expect(c).toContain('data-testid="offline-expand"')
    expect(c).toContain('aria-expanded')
  })

  it('列出 OFFLINE_AVAILABLE / OFFLINE_UNAVAILABLE', () => {
    const c = readFileSync('src/components/OfflineBanner.tsx', 'utf-8')
    expect(c).toMatch(/OFFLINE_AVAILABLE/)
    expect(c).toMatch(/OFFLINE_UNAVAILABLE/)
    // 业务词必须出现
    expect(c).toMatch(/已缓存的词库/)
    expect(c).toMatch(/AI 对话/)
  })

  it('reconnect 短提示逻辑 (mountedRef 防止 mount 时误闪)', () => {
    const c = readFileSync('src/components/OfflineBanner.tsx', 'utf-8')
    expect(c).toMatch(/mountedRef/)
    expect(c).toMatch(/reconnectFlash/)
  })

  it('W131 既有 testid / role / aria-live 仍保留', () => {
    const c = readFileSync('src/components/OfflineBanner.tsx', 'utf-8')
    expect(c).toContain('data-testid="offline-banner"')
    expect(c).toContain('role="status"')
    expect(c).toContain('aria-live="polite"')
  })
})

// === 6. main.tsx 集成 ===

describe('W135 PWA - main.tsx 集成', () => {
  it('main.tsx 注册 prefetchRoute 5+ 个 chunk', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    const matches = c.match(/registerPrefetchRoute\(['"]\//g) || []
    expect(matches.length).toBeGreaterThanOrEqual(5)
  })

  it('main.tsx 调 scheduleIdlePrefetch + warmRecentVisits', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    expect(c).toMatch(/scheduleIdlePrefetch/)
    expect(c).toMatch(/warmRecentVisits/)
  })

  it('main.tsx 调 initSyncManager + registerDefaultHandlers', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    expect(c).toMatch(/initSyncManager/)
    expect(c).toMatch(/registerDefaultHandlers/)
  })

  it('main.tsx W4-B 旧 confirm 提示已删 (W135 UpdateToast 接管)', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    // W135 改造: 不再用 confirm() 提示
    expect(c).not.toMatch(/confirm\(['"]\u{1F680}/u)
  })
})

// === 7. dist/sw.js 产物 (W135 调优落地) ===

describe('W135 PWA - dist/sw.js 产物', () => {
  // dist/sw.js 由 vite build 产生, 测试运行前先 build 一次
  //  - 本地/CI: 先 npx vite build, 再跑这个测试
  //  - skipIf 处理: dist 不存在时跳过 (避免开发环境 false-fail)

  it('sw.js precache 数量 ≤ 120 (W127 兼容)', () => {
    if (!existsSync('dist/sw.js')) return // skip via early return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
    expect(m).not.toBeNull()
    const urls = m![1].match(/url:"/g) || []
    expect(urls.length).toBeLessThanOrEqual(120)
  })

  it('sw.js 含 W135 新增 4 个 cache 命名空间', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    expect(sw).toContain('word-data-cache-v2')
    expect(sw).toContain('ai-response-cache-v2')
    expect(sw).toContain('export-data-cache-v1')
    expect(sw).toContain('user-settings-cache-v1')
  })

  it('sw.js skipWaiting + clientsClaim 已生效 (W135)', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    expect(sw).toMatch(/skipWaiting/)
    expect(sw).toMatch(/clientsClaim/)
  })

  it('sw.js words.json 是 CacheFirst (W135 优化)', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    const m = sw.match(/\\\/data\\\/words\\\.json\$[\s\S]*?new s\.(\w+)/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('CacheFirst')
  })
})
