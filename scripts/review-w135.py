#!/usr/bin/env python3
"""scripts/review-w135.py — W135 静态审查 (P0/P1/P2 分类)
   验证 W135 PWA 调优: 缓存策略 + 预取 + Background Sync + SW 更新 + 离线体验
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

def read(p): return Path(ROOT, p).read_text(encoding='utf-8')
def exists(p): return (ROOT / p).exists()

issues = {'P0': [], 'P1': [], 'P2': []}

def P0(file, line, desc, fix):
    issues['P0'].append(f'P0 | {file}:{line} | {desc} | fix: {fix}')
def P1(file, line, desc, fix):
    issues['P1'].append('P1 | ' + file + ':' + str(line) + ' | ' + desc + ' | fix: ' + fix)
def P2(file, line, desc, fix):
    issues['P2'].append('P2 | ' + file + ':' + str(line) + ' | ' + desc + ' | fix: ' + fix)

# ============= 1. vite.config.ts workbox 调优 =============

# P0: maximumFileSizeToCacheInBytes 必须 ≤ 1MB
vc = read('vite.config.ts')
m = re.search(r'maximumFileSizeToCacheInBytes\s*:\s*(\d+)\s*\*\s*1024\s*\*\s*1024', vc)
if not m:
    P0('vite.config.ts', 0, 'maximumFileSizeToCacheInBytes 缺失', '加 maximumFileSizeToCacheInBytes: 1 * 1024 * 1024')
elif int(m.group(1)) > 1:
    P0('vite.config.ts', 0, f'precache 上限 {m.group(1)}MB > 1MB (W135 收紧)', '改 1 * 1024 * 1024')

# P0: words.json 必须是 CacheFirst (W135 优化)
if 'urlPattern: /\\/data\\/words\\.json$/' not in vc:
    P0('vite.config.ts', 0, 'words.json urlPattern 缺失', '加 urlPattern: /\\/data\\/words\\.json$/')
else:
    # 找 words.json 段, 验证 handler 是 CacheFirst
    idx = vc.index('urlPattern: /\\/data\\/words\\.json$/')
    after = vc[idx:idx+300]
    if "handler: 'CacheFirst'" not in after:
        P0('vite.config.ts', 0, 'words.json 应改 CacheFirst (W135 优化)', '改 handler: CacheFirst')

# P0: AI/LLM 应是 StaleWhileRevalidate
if 'urlPattern: /^https?:\\/\\/.*\\/(api|chat|llm|completion).*/i' in vc:
    idx = vc.index('urlPattern: /^https?:\\/\\/.*\\/(api|chat|llm|completion).*/i')
    after = vc[idx:idx+300]
    if "handler: 'StaleWhileRevalidate'" not in after:
        P0('vite.config.ts', 0, 'AI/LLM 应改 StaleWhileRevalidate (W135 优化)', '改 handler: StaleWhileRevalidate')

# P1: 翻译仍走 NetworkFirst (不能过期)
if "urlPattern: /^https:\\/\\/libretranslate\\.de\\/.*/" in vc:
    idx = vc.index("urlPattern: /^https:\\/\\/libretranslate\\.de\\/.*/")
    after = vc[idx:idx+300]
    if "handler: 'NetworkFirst'" not in after:
        P1('vite.config.ts', 0, '翻译不能过期, 应保持 NetworkFirst', 'handler: NetworkFirst')

# P1: skipWaiting + clientsClaim 启用
if 'skipWaiting: true' not in vc:
    P1('vite.config.ts', 0, 'skipWaiting 应启用 (W135)', '加 skipWaiting: true')
if 'clientsClaim: true' not in vc:
    P1('vite.config.ts', 0, 'clientsClaim 应启用 (W135)', '加 clientsClaim: true')

# P2: dataExport 缓存
if 'export-data-cache-v' not in vc:
    P2('vite.config.ts', 0, 'dataExport 缓存 (W135 新) 缺失', '加 export-data-cache 规则')

# P2: user settings 缓存
if 'user-settings-cache-v' not in vc:
    P2('vite.config.ts', 0, 'user settings 缓存 (W135 新) 缺失', '加 user-settings-cache 规则')


# ============= 2. src/lib/prefetch.ts =============

if not exists('src/lib/prefetch.ts'):
    P0('src/lib/prefetch.ts', 0, 'prefetch.ts 不存在 (W135 必做)', '创建 prefetch.ts')
else:
    pf = read('src/lib/prefetch.ts')
    # P0: 必导出 registerPrefetchRoute / prefetchRoute / scheduleIdlePrefetch
    for sym in ['registerPrefetchRoute', 'prefetchRoute', 'scheduleIdlePrefetch']:
        if f'export {sym}' not in pf and f'export async function {sym}' not in pf and f'export function {sym}' not in pf:
            P0('src/lib/prefetch.ts', 0, f'{sym} 缺失', f'加 export function {sym}')
    # P1: dedup 30s
    if 'DEDUP_WINDOW_MS' not in pf:
        P1('src/lib/prefetch.ts', 0, 'dedup 30s (W135) 缺失', '加 DEDUP_WINDOW_MS 常量')
    # P1: requestIdleCallback fallback
    if 'requestIdleCallback' not in pf:
        P1('src/lib/prefetch.ts', 0, 'requestIdleCallback fallback 缺失', '加 whenIdle() 函数')
    # P2: 上次访问预热
    if 'recordVisit' not in pf or 'getRecentVisits' not in pf:
        P2('src/lib/prefetch.ts', 0, 'last visit 预热 (W135) 缺失', '加 recordVisit + getRecentVisits')


# ============= 3. src/lib/syncManager.ts =============

if not exists('src/lib/syncManager.ts'):
    P0('src/lib/syncManager.ts', 0, 'syncManager.ts 不存在 (W135 必做)', '创建 syncManager.ts')
else:
    sm = read('src/lib/syncManager.ts')
    # P0: 必导出 enqueueOfflineWrite / flushOfflineQueue / initSyncManager
    for sym in ['enqueueOfflineWrite', 'flushOfflineQueue', 'initSyncManager']:
        if f'export {sym}' not in sm and f'export async function {sym}' not in sm and f'export function {sym}' not in sm:
            P0('src/lib/syncManager.ts', 0, f'{sym} 缺失', f'加 export function {sym}')
    # P1: 错误重试 + 指数退避
    if 'MAX_RETRY' not in sm:
        P1('src/lib/syncManager.ts', 0, '重试次数 (W135) 缺失', '加 MAX_RETRY')
    # P1: online 事件监听
    if "addEventListener('online'" not in sm:
        P1('src/lib/syncManager.ts', 0, 'online 事件监听 (W135) 缺失', '加 online 事件监听')
    # P2: 周期轮询兜底
    if 'setInterval' not in sm:
        P2('src/lib/syncManager.ts', 0, '周期轮询兜底 (W135) 缺失', '加 setInterval 轮询')
    # P2: 默认 handler 注册
    if 'registerDefaultHandlers' not in sm:
        P2('src/lib/syncManager.ts', 0, '默认 handler 注册 (W135) 缺失', '加 registerDefaultHandlers')


# ============= 4. src/components/UpdateToast.tsx =============

if not exists('src/components/UpdateToast.tsx'):
    P0('src/components/UpdateToast.tsx', 0, 'UpdateToast.tsx 不存在 (W135 必做)', '创建 UpdateToast.tsx')
else:
    ut = read('src/components/UpdateToast.tsx')
    # P0: 必含 data-testid
    if 'data-testid="update-toast"' not in ut:
        P0('src/components/UpdateToast.tsx', 0, 'update-toast testid 缺失', '加 data-testid="update-toast"')
    # P0: 用 virtual:pwa-register
    if 'virtual:pwa-register' not in ut:
        P0('src/components/UpdateToast.tsx', 0, 'virtual:pwa-register 缺失', 'import { registerSW } from virtual:pwa-register')
    # P1: 顶 indicator
    if 'data-testid="update-indicator"' not in ut:
        P1('src/components/UpdateToast.tsx', 0, 'update-indicator (W135) 缺失', '加 data-testid="update-indicator"')
    # P1: 0 emoji
    emoji_regex = re.compile(r'[\U0001F300-\U0001F9FF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\U0001F000-\U0001F02F]')
    if emoji_regex.search(ut):
        P1('src/components/UpdateToast.tsx', 0, '含 emoji 装饰', '移除所有 emoji')

# App.tsx 引入
app_tsx = read('src/App.tsx')
if 'import UpdateToast' not in app_tsx:
    P0('src/App.tsx', 0, 'App.tsx 未引入 UpdateToast', 'import UpdateToast from "./components/UpdateToast"')
if '<UpdateToast />' not in app_tsx:
    P0('src/App.tsx', 0, 'App.tsx 未渲染 <UpdateToast />', '在 InAppBanner 后加 <UpdateToast />')


# ============= 5. src/components/OfflineBanner.tsx (W135 增强) =============

if not exists('src/components/OfflineBanner.tsx'):
    P0('src/components/OfflineBanner.tsx', 0, 'OfflineBanner.tsx 不存在 (W131 必做)', '创建 OfflineBanner.tsx')
else:
    ob = read('src/components/OfflineBanner.tsx')
    # P0: 仍含 W131 既有 testid (向后兼容)
    if 'data-testid="offline-banner"' not in ob:
        P0('src/components/OfflineBanner.tsx', 0, 'offline-banner testid 丢失 (W131 兼容破坏)', '加回 data-testid="offline-banner"')
    if 'role="status"' not in ob:
        P0('src/components/OfflineBanner.tsx', 0, 'role=status 丢失 (W131 兼容破坏)', '加回 role="status"')
    if 'aria-live="polite"' not in ob:
        P0('src/components/OfflineBanner.tsx', 0, 'aria-live=polite 丢失 (W131 兼容破坏)', '加回 aria-live="polite"')
    # P1: W135 增强: 离线时长
    if 'data-offline-duration' not in ob:
        P1('src/components/OfflineBanner.tsx', 0, '离线时长 (W135) 缺失', '加 data-offline-duration 属性')
    # P1: 展开/收起 详情
    if 'OFFLINE_AVAILABLE' not in ob or 'OFFLINE_UNAVAILABLE' not in ob:
        P1('src/components/OfflineBanner.tsx', 0, '可用/不可用功能列表 (W135) 缺失', '加 OFFLINE_AVAILABLE + OFFLINE_UNAVAILABLE')
    # P2: 重连 toast
    if 'reconnectFlash' not in ob:
        P2('src/components/OfflineBanner.tsx', 0, '重连 toast (W135) 缺失', '加 reconnectFlash state')


# ============= 6. main.tsx 集成 =============

mt = read('src/main.tsx')
# P0: registerPrefetchRoute 注册 5+ 个
matches = re.findall(r"registerPrefetchRoute\(['\"]/", mt)
if len(matches) < 5:
    P0('src/main.tsx', 0, f'registerPrefetchRoute 注册数 {len(matches)} < 5 (W135)', '注册 5+ 路由')

# P0: initSyncManager + registerDefaultHandlers
if 'initSyncManager' not in mt:
    P0('src/main.tsx', 0, 'initSyncManager 缺失 (W135)', 'import 并调 initSyncManager')
if 'registerDefaultHandlers' not in mt:
    P0('src/main.tsx', 0, 'registerDefaultHandlers 缺失 (W135)', 'import 并调 registerDefaultHandlers')

# P0: scheduleIdlePrefetch
if 'scheduleIdlePrefetch' not in mt:
    P0('src/main.tsx', 0, 'scheduleIdlePrefetch 缺失 (W135)', 'import 并调 scheduleIdlePrefetch')

# P1: W4-B 旧 confirm 提示已删
if re.search(r"confirm\(['\"]\xf0\x9f\x9a\x80", mt):
    P1('src/main.tsx', 0, 'W4-B 旧 confirm 提示未删 (W135 接管)', '移除 confirm(...)')

# P2: warmRecentVisits
if 'warmRecentVisits' not in mt:
    P2('src/main.tsx', 0, 'warmRecentVisits (W135) 缺失', 'import 并调 warmRecentVisits')


# ============= 7. 测试 + 文档 =============

# P0: tests/w135-pwa.test.ts 必存在且含 6+ it()
if not exists('tests/w135-pwa.test.ts'):
    P0('tests/w135-pwa.test.ts', 0, 'w135 单元测试文件缺失', '创建 tests/w135-pwa.test.ts')
else:
    t135 = read('tests/w135-pwa.test.ts')
    it_count = len(re.findall(r'^\s+it\(', t135, re.MULTILINE))
    if it_count < 6:
        P0('tests/w135-pwa.test.ts', 0, f'w135 测试数 {it_count} < 6 (W135 要求)', f'加到 6+ it')

# P0: e2e/w135-pwa-update.spec.ts 必存在且含 3+ test()
if not exists('e2e/w135-pwa-update.spec.ts'):
    P0('e2e/w135-pwa-update.spec.ts', 0, 'w135 e2e 文件缺失', '创建 e2e/w135-pwa-update.spec.ts')
else:
    e135 = read('e2e/w135-pwa-update.spec.ts')
    test_count = len(re.findall(r'^\s*test\(', e135, re.MULTILINE))
    if test_count < 3:
        P0('e2e/w135-pwa-update.spec.ts', 0, f'w135 e2e test 数 {test_count} < 3 (W135 要求)', f'加到 3+ test')

# P1: e2e/REPORT.md 含 W135 段
if exists('e2e/REPORT.md'):
    r = read('e2e/REPORT.md')
    if 'W135' not in r:
        P1('e2e/REPORT.md', 0, 'REPORT.md 缺 W135 段', '追加 W135 PWA 缓存命中率表')

# P2: dist/sw.js 验证 (跳过, dist 在 CI build 后才有)
# 注: dist/sw.js 实测在 build 后由 vite-plugin-pwa 生成, 静态审查不能 100% 覆盖产物


# ============= 8. 北极星: 触发可业 + 内容能用 + 学得会 =============

# P0: W4-B 升级体验 (新版本可刷) 由 UpdateToast 接管
# 已在 §4 验证

# P0: 离线体验 (banner + 时长 + 可用功能)
# 已在 §5 验证

# P0: 资源预取 (prefetch.ts 存在 + 注册 5+)
# 已在 §2 + §6 验证

# P0: Background Sync (syncManager.ts 存在 + 默认 handler)
# 已在 §3 + §6 验证


# ============= 输出 =============

total_p0 = len(issues['P0'])
total_p1 = len(issues['P1'])
total_p2 = len(issues['P2'])

print('=' * 70)
print(f'W135 静态审查: P0={total_p0} P1={total_p1} P2={total_p2}')
print('=' * 70)
for sev in ['P0', 'P1', 'P2']:
    if issues[sev]:
        print(f'\n[{sev}]')
        for i in issues[sev]:
            print(f'  {i}')

if total_p0 > 0:
    print(f'\nFAIL: {total_p0} P0 issues')
    sys.exit(1)
else:
    print(f'\nPASS: 0 P0 issues')
    sys.exit(0)
