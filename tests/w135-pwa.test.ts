// tests/w135-pwa.test.ts - W135/W136 PWA 优化
// 验证:
//  1. vite.config.ts workbox 策略调优 (1MB precache, words.json SWR 7d, AI SWR, 翻译 NF)
//  2. src/lib/prefetch.ts 路由 hover/idle 预取 + dedup + last visit
//  3. src/components/UpdateToast.tsx SW 更新 toast + indicator + 24h 免打扰 (W136 P1-7)
//  4. src/components/OfflineBanner.tsx 离线时长 + 功能可用性
//  5. dist/ 产物: precache 数量 + 策略落地
//  6. main.tsx 集成 (无 syncManager / 唯一 registerSW 入口)
//
// W136 重大变化:
//  - 删 src/lib/syncManager.ts 整个 (P0-1, 业务侧 0 调用)
//  - 删 data: URL 规则 (P0-2, workbox 不接 data:/blob:)
//  - 删 settings/profile.json 规则 (P2-3, 0 业务命中)
//  - 词库 words.json: CacheFirst 6h → StaleWhileRevalidate 7d (P1-1, 离线 regression)
//  - UpdateToast: 24h 免打扰 (P1-7, 用户点"稍后"24h 内不弹)
//  - main.tsx: 删 registerSW 唯一入口交给 UpdateToast (P1-4, 修双 registerSW)
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

  it('words.json 改用 StaleWhileRevalidate 7d (W136 P1-1 修复)', () => {
    // 业务: 词库 6.2MB, 首次打开后缓存 7 天, 命中后秒开
    //  W135 CacheFirst 6h 在断网回归测试中暴露 (offline 重新打开时 6h 已过期)
    //  W136 改回 SWR 7d, 兼容离线 + 命中后后台静默更新
    expect(viteConfig).toContain("urlPattern: /\\/data\\/words\\.json$/")
    const handler = getHandlerFor(viteConfig, "urlPattern: /\\/data\\/words\\.json$/,")
    expect(handler).toBe('StaleWhileRevalidate')
    // 7 天 (W136 改回)
    expect(viteConfig).toMatch(/maxAgeSeconds\s*:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*7/)
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

  it('dataExport data: URL 规则已删 (W136 P0-2 修复)', () => {
    // 业务: 原 W135 注释 "dataExport 触发 data: URL 下载 CacheFirst 7d" 是 dead code
    //  - 实际业务用 URL.createObjectURL(blob) 生成 blob: URL
    //  - Workbox registerRoute 只接 HTTP/HTTPS fetch
    //  - W136 整条规则删除
    expect(viteConfig).not.toMatch(/urlPattern:\s*\/\^data:\.\*\$\//)
    expect(viteConfig).not.toMatch(/export-data-cache/)
  })

  it('settings/profile.json 规则已删 (W136 P2-3 修复)', () => {
    // 业务: 原 W135 规则 0 业务命中 (zustand persist 走 localStorage)
    //  W136 整条规则删除
    expect(viteConfig).not.toMatch(/urlPattern:\s*\/\/\\\/\(settings\|profile\|user\)\\\.json\$\//)
    expect(viteConfig).not.toMatch(/user-settings-cache/)
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

// === 3. src/components/UpdateToast.tsx (含 W136 24h 免打扰) ===

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

  it('用 virtual:pwa-register (W136 唯一入口)', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    expect(c).toMatch(/virtual:pwa-register/)
  })

  it('App.tsx 引入 UpdateToast', () => {
    const c = readFileSync('src/App.tsx', 'utf-8')
    expect(c).toMatch(/import UpdateToast from ['"]\.\/components\/UpdateToast['"]/)
    expect(c).toContain('<UpdateToast />')
  })

  // === W136 P1-7: 24h 免打扰 ===

  it('W136: 含 24h dismiss-until localStorage 逻辑 (P1-7)', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    expect(c).toMatch(/DISMISS_UNTIL_KEY\s*=\s*['"]w136-update-dismiss-until['"]/)
    expect(c).toMatch(/DISMISS_DURATION_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/)
    // 读 / 写 两个 helper 都在
    expect(c).toMatch(/function\s+readDismissUntil/)
    expect(c).toMatch(/function\s+setDismissUntil/)
  })

  it('W136: onNeedRefresh 检查 dismissed 状态, 24h 内不弹', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    // onNeedRefresh 内 readDismissUntil() > Date.now() → return
    expect(c).toMatch(/onNeedRefresh\(\)\s*{[\s\S]*?readDismissUntil\(\)\s*>\s*Date\.now\(\)/)
  })

  it('W136: dismiss 按钮调 setDismissUntil + setDismissed (P1-7)', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    // dismiss 按钮 onClick
    expect(c).toContain('data-testid="update-toast-dismiss"')
    expect(c).toMatch(/setDismissUntil\(\)/)
    expect(c).toMatch(/setDismissed\(true\)/)
  })

  it('W136: dismissed 状态时整个组件 return null (不显示 indicator)', () => {
    const c = readFileSync('src/components/UpdateToast.tsx', 'utf-8')
    // 组件主入口 dismissed 检查
    expect(c).toMatch(/if\s*\(\s*dismissed\s*\|\|\s*\(\s*!state\.needRefresh/)
  })
})

// === 4. src/components/OfflineBanner.tsx (W135 增强) ===

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

// === 5. main.tsx 集成 (W136 无 syncManager, 无双 registerSW) ===

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

  it('W136: main.tsx 不再 import syncManager (P0-1 修复)', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    expect(c).not.toMatch(/from\s+['"]\.\/lib\/syncManager['"]/)
    expect(c).not.toMatch(/initSyncManager/)
    expect(c).not.toMatch(/registerDefaultHandlers/)
    expect(c).not.toMatch(/enqueueOfflineWrite/)
  })

  it('W136: main.tsx 不再 import registerSW (P1-4 修复双 registerSW)', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    expect(c).not.toMatch(/from\s+['"]virtual:pwa-register['"]/)
    expect(c).not.toMatch(/registerSW\(/)
  })

  it('W136: syncManager.ts 文件已被删 (P0-1 修复)', () => {
    // 业务: P0-1 决策 = 删整个文件 (372 行)
    expect(existsSync('src/lib/syncManager.ts')).toBe(false)
  })

  it('main.tsx W4-B 旧 confirm 提示已删 (W135 UpdateToast 接管)', () => {
    const c = readFileSync('src/main.tsx', 'utf-8')
    // W135 改造: 不再用 confirm() 提示
    expect(c).not.toMatch(/confirm\(['"]\u{1F680}/u)
  })
})

// === 6. dist/sw.js 产物 (W135 调优落地) ===

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

  it('sw.js 含 W135 词库 / AI cache 命名空间 (W136 删 export/user-settings)', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    expect(sw).toContain('word-data-cache-v2')
    expect(sw).toContain('ai-response-cache-v2')
    // W136: 删 export-data-cache-v1 (P0-2) + user-settings-cache-v1 (P2-3)
    expect(sw).not.toContain('export-data-cache-v1')
    expect(sw).not.toContain('user-settings-cache-v1')
  })

  it('sw.js skipWaiting + clientsClaim 已生效 (W135)', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    expect(sw).toMatch(/skipWaiting/)
    expect(sw).toMatch(/clientsClaim/)
  })

  it('sw.js words.json 是 StaleWhileRevalidate 7d (W136 P1-1 改回)', () => {
    if (!existsSync('dist/sw.js')) return
    const sw = readFileSync('dist/sw.js', 'utf-8')
    // Workbox 编译后: StaleWhileRevalidate 类生成 s.StaleWhileRevalidate
    const m = sw.match(/\\\/data\\\/words\\\.json\$[\s\S]*?new s\.(\w+)/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('StaleWhileRevalidate')
  })
})
