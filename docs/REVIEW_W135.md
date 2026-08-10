# W135 抗审查 完整汇总 (Runtime + PWA + Bundle)

**Commit:** f0f40c8 (v2.1.15)
**审查时间:** 2026-08-10 17:27 UTC
**审查模式:** 3 reviewer 独立对抗 + 主人补 Bundle
**审查范围:** W135 全部 9 个落地 (Worker + VirtualList + LCP + ErrorBoundary + 词库 SW + AI SWR + 翻译 NF + syncManager + prefetch + UpdateToast + vite chunks 拆分)

---

## 总览

| 维度 | 启动方式 | P0 | P1 | P2 | 状态 |
|---|---|---|---|---|---|
| **Runtime** | sub-agent verifier | 3 | 5 | 8 | ✅ done |
| **PWA** | sub-agent verifier | 4 | 7 | 6 | ✅ done |
| **Bundle** | sub-agent 超时, **主人手做** | 0 | 3 | 3 | ✅ done |
| **合计** | - | **7** | **15** | **17** | 7 P0 必须修 |

**关键判断:** W135 性能/打包/缓存的设计和实现**主体正确**, 但 7 P0 中有 5 个是真问题 (W116 字母索引回归 / LCP preload 占位 / 测试只测 fallback / syncManager 死代码 / data: URL dead code / 跨 tab 无锁 / SW sync handler 缺失). 修复后才能发版.

---

## 7 P0 详细 (必须修, 按修复顺序)

### Runtime P0-1: W116 字母索引在虚拟滚动模式 (>200 词) 完全失效
- **文件:** `src/pages/WordList.tsx:313-391`
- **现象:** 5,423 词主用例走 `<VirtualList />` 分支, `data-letter-anchor` 元素**只在非 virtual 分支**渲染. 字母按钮点击 → `querySelector` 永远 null → 静默无反馈. `IntersectionObserver` 观察 0 个 anchor → activeLetter 永不更新
- **影响:** 5,423 词主用例字母索引全哑火, 桌面端 + 移动端全部
- **修法:** 在 `VirtualList` 的 `renderItem` 检测首字母变化, 渲染 `<span data-letter-anchor={L} id="letter-anchor-L" />`; 字母按钮 `onClick` 调 `document.getElementById('letter-anchor-L')?.scrollIntoView({ block: 'start' })` (VirtualList 已知 scroll container)
- **回退方案:** 拆 `letterAnchors: Record<letter, number>` 映射, 用 `useVirtualScroll` 计算 offsetTop 时注入 anchor
- **测试:** 加 e2e `w135-letter-index-virtual.spec.ts` — 加载 5,423 词, 点击字母 L, 断言 scrollTop 跳到 ~L 字母位置

### Runtime P0-2: LCP preload 是占位, 字体 preload 缺失
- **文件:** `index.html:38-43`
- **现象:** 注释写 "LCP 是文字, 字体阻塞渲染", 但代码 preload 的是 favicon (不在首屏 viewport). 字体 woff2 真正在 LCP 渲染路径, **没有任何 `<link rel="preload" as="font">`**
- **影响:** LCP 优化名义完成, 实际 0 改善. 文字 LCP 等字体, 字体等 @fontsource CSS @import, 首屏 FOUT
- **修法:**
  ```html
  <link rel="preload" href="/assets/outfit-latin-400-normal-*.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/outfit-latin-500-normal-*.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/jetbrains-mono-400-normal-*.woff2" as="font" type="font/woff2" crossorigin>
  ```
  (具体路径 build 后从 `dist/assets/` 取, 4 个 woff2 共 ~80KB)
- **删:** pwa-192.png / manifest.webmanifest preload (冗余, 浏览器自动 fetch)
- **删:** `crossorigin="anonymous"` on manifest (同源浪费)
- **测试:** 加 Lighthouse CI 脚本 `lhci autorun --collect.staticDistDir=dist --collect.settings.preset=desktop` 断言 LCP < 2.5s

### Runtime P0-3: 测试只测 fallback, 不测 worker
- **文件:** `tests/w135-runtime.test.ts` (33 个 case)
- **现象:** 测试 100% 走 `isWorkerAvailable() === false` 路径调纯函数, **未通过 postMessage 走 worker**. 静态审查用 `readFileSync` 看 `self.onmessage` 字符串, 不验证运行时
- **影响:** "33/33 过" 安全感是假的. Worker 行为零运行时覆盖
- **修法:**
  1. 加 `MockWorker` shim (in-memory 同步 echo 调对应纯函数), 测 `pending` map 增删 / `onerror` 路径
  2. 加 e2e `w135-worker-roundtrip.spec.ts` — Playwright 启动 dev, 注入 `__test_hook__` mock Worker, 断言 `postMessage` 至少被调一次
  3. 性能 benchmark 加对比: 同一函数 worker 异步 vs 主线程同步, 报告 main thread blocked time (用 `performance.now()` 前后)
- **简化:** `ensureWorker` export `_lastWorkerInstanceForTest`, 写测试 `expect(_lastWorkerInstanceForTest).toBeInstanceOf(Worker)`

### PWA P0-1: `enqueueOfflineWrite` 整条死代码
- **文件:** `src/lib/syncManager.ts:93` (定义) + 业务侧 (`AIChat.tsx`, `DictationPage.tsx`, `ErrorReviewPage.tsx`)
- **现象:** 业务侧直接调 `addFavorite()` / `saveDictationError()` / `addErrorReviewScore()`, **没有** `navigator.onLine` 检查, 也没有 `enqueueOfflineWrite`. `_handlers` 注册了, `flushOfflineQueue` 永远处理空队列
- **影响:** "离线时排队 + 在线 flush" 是文档装饰. 真实场景下写 IDB 同步, 在线时根本不需要 sync
- **修法 (决策):** **删除整个 syncManager 抽象**, 业务侧保持当前直写 IDB. 理由: Dexie 本地 IDB 写不需要网络, 真正的同步语义不存在. 离线时写入 0 损失, 不需要额外 queue
  - 删 `src/lib/syncManager.ts` 372 行
  - 删 `main.tsx:initSyncManager` 调用
  - 删 `tests/w135-pwa.test.ts:222-269` syncManager 相关 case
  - 删 `e2e/w135-pwa-update.spec.ts:offline-queue` case
  - 删 `docs/SUMMARY_v2.1.15.md` 提到的 syncManager
- **回退方案:** 真要做离线队列, 抽 `useOfflineWrite` hook, 业务侧感知 "写" 和 "同步" 两种状态 — 但需要后续 W137+ 单独 sprint

### PWA P0-2: `data:.*$` 缓存规则 dead code
- **文件:** `vite.config.ts:165-177` + 编译 `dist/sw.js` 中 `registerRoute(/^data:.*$/, ...)`
- **现象:** `grep "data:" src/lib/dataExport.ts` 0 业务使用. `downloadFile` 用 `URL.createObjectURL(blob)` 生成 `blob:` URL, **不是 `data:`**. Workbox `registerRoute` 只接 HTTP/HTTPS fetch, `data:` / `blob:` / `file:` URL 根本不到 SW
- **影响:** "新增 data: URL 缓存 (用户导出数据 7d)" 在 commit + SUMMARY 都写了, 实际 0 业务受益. 文档/CHANGELOG 误导
- **修法:**
  1. 删 `vite.config.ts:165-177` (data: URL 规则 + 注释)
  2. 删 `dist/sw.js` 中对应 registerRoute (build 后自动)
  3. 改 `docs/SUMMARY_v2.1.15.md` "用户导出数据 7d" 描述 → 删
  4. 改 `docs/CHANGELOG.md` v2.1.15 段对应行 → 删

### PWA P0-3: 跨 tab 写无锁, 双 tab flush 双倍 XP
- **文件:** `src/lib/syncManager.ts:204-246` (P0-1 删整个文件后此 P0 自动消失)
- **现象:** `flushOfflineQueue` 用 `await _peekQueue()` 一次性拿队列, 中间无任何锁. 2 tab 同时 flush → 都拿到相同 items → 都调 handler → 业务写双倍
- **影响 (P0-1 修好前提下):** `addFavorite` → `addXP` 用户多拿 XP (不幂等). `saveDictationError` / `addErrorReviewScore` 用 `.add()` 错题/评分记录重复
- **修法:** P0-1 删整个 syncManager 后此 P0 自动消失 (没有 queue → 没有 flush → 没有并发)

### PWA P0-4: SW 没 `sync` event handler
- **文件:** `src/lib/syncManager.ts:333-346` (`_tryRegisterSync`) + 编译 `dist/sw.js`
- **现象:** `_tryRegisterSync` 调 `reg.sync.register(SW_SYNC_TAG)`, tag 是 `'english-app-offline-sync'`. vite-plugin-pwa 生成的 `dist/sw.js` 是 workbox 模板, **没有** `self.addEventListener('sync', ...)` 处理这个 tag
- **影响:** `sync.register` 成功 → 浏览器 schedule → SW 收到 `sync` 事件 → **没人处理** → 啥也没发生. 配合 P0-1, 整条 Background Sync 链路从头到尾 broken
- **修法:** P0-1 删整个 syncManager 后此 P0 自动消失 (没有 sync.register 调用 → 没有 broken handler)

---

## 15 P1 详细 (重要, 修复建议)

### Runtime P1
- **P1-1**: Worker 单例 + `pending` map 跨测试不重置 → tests/setup.ts 加 beforeEach 调 `_reset*WorkerForTest`
- **P1-2**: `onerror` reject pending 后未清 worker → 加 `workerInstance.terminate(); workerInstance = null`
- **P1-3**: LessonCard memo 被 inline onClick 打破 → LessonCard 内部 `useNavigate`, 父组件不传 onClick
- **P1-4**: `crossorigin="anonymous"` 在同源 manifest 浪费 CORS preflight → 删 crossorigin
- **P1-5**: duplicate icon (根 + icons/) 13KB 浪费 → 删 `public/pwa-192.png` `public/pwa-512.png`

### PWA P1
- **P1-1**: 词库 CacheFirst 6h 离线 regression → 改回 `StaleWhileRevalidate 7d` 或 `CacheFirst 7d`
- **P1-2**: `addFavorite` 调 `addXP` 不幂等 → handler 加 idempotency key (P0-1 删后此条消解)
- **P1-3**: `usePrefetch` / `scheduleHoverPrefetch` 死代码 (Layout 没接) → 在 Layout.tsx 包装 NavLink 注入 onMouseEnter
- **P1-4**: 双 `registerSW` (main.tsx + UpdateToast) → main.tsx 删 registerSW, 完全交给 UpdateToast
- **P1-5**: e2e 不真测 SW update 流程 (6 个 test 全 mock) → 加真断网 / 真 SW update
- **P1-6**: AI/LLM SWR 1d 用户拿到 stale (业务可接受) → 加 query 失效机制, cacheKey 加 modelVersion
- **P1-7**: UpdateToast 每天弹 N 次 → 加 `dismiss-until: localStorage`, 24h 内不弹

### Bundle P1 (主人补)
- **B-P1-1**: llm-vendor 名义不符 (56KB 含 xpSystem/idbSync) → 重新拆或者改文档
- **B-P1-2**: 重复图标 precache (`/pwa-192.png` + `/icons/pwa-192.png`) → 同 Runtime P1-5
- **B-P1-3**: maxEntries: 3 / 共享 cache (词库 + 其他 data) → 拆 `word-data-cache` + `data-misc-cache`

---

## 17 P2 详细 (优化, 可后续修)

### Runtime P2 (8)
- P2-1: `useVirtualScroll` hook 死代码 (WordList 用组件不是 hook)
- P2-2: VirtualList threshold=200 边界 case, 建议 500
- P2-3: preconnect 缺失 (offline API 场景)
- P2-4: ErrorBoundary emoji `😵` / `🔄` / `🔃` 跟 0 emoji 政策冲突
- P2-5: WordList `containerRef` 在 virtual 模式不滚动, IO 静默失效
- P2-6: VirtualList keyboard nav 缺 ArrowUp/ArrowDown
- P2-7: `recordVisit` 调 `import('./lib/prefetch')` 每次路由切换 microtask 开销
- P2-8: `_prefetched` dedup 30s 容错差, 失败也标"已预取"

### PWA P2 (6)
- P2-1: 词库 / data JSON 共享 `word-data-cache-v2` + maxEntries: 3 限 3 URL
- P2-2: 50ms hover 延迟太激进 (行业 200ms)
- P2-3: `/\/(settings|profile|user)\.json$/` 规则 0 命中 (zustand 走 localStorage)
- P2-4: 旧 SW (v2.1.13) 升级 v1 cache 残留
- P2-5: `scheduleHoverPrefetch` 多次调用多个独立 timer 闭包
- P2-6: 翻译 NetworkFirst 缺 `cacheableResponse` 显式声明

### Bundle P2 (3) (主人补)
- B-P2-1: Workbox 双 registerSW (同 PWA P1-4)
- B-P2-2: cleanupOutdatedCaches 只清 precache 不清 runtimeCaching
- B-P2-3: index 159KB raw 含 IDB schema 检查 + syncManager 初始化, 优化空间

---

## Bundle 主人审计 详细 (Runtime + PWA 抗审查外的第三方)

### ✅ 真拆分确认
- 110 precache URL (跟先前 SUMMARY 一致)
- 12 个字体 woff2 都进 precache
- 4 个独立 vendor chunk: react-vendor (164KB/53KB gzip) / db-vendor (96KB/32KB) / md-vendor / llm-vendor (56KB/21KB)
- pdfjs 异步 (468KB/141KB gzip, 不在首屏)
- 19 个 page chunks, 4-40KB 不等, 都 < 800KB warning limit

### ⚠️ 隐藏问题
1. **llm-vendor 实际内容**: 包含 `xpSystem` (XP 等级) + `idbSync` (跨 tab 广播) + `providers/llm` 等. 因为 rollup 共享依赖图把 db 库拽进来. 56KB 偏大但可接受 (用户访问 2 个 LLM page 后就收益)
2. **precache 重复图标**: 同样 hash 的 pwa-192/512 在根 + /icons/ 都进 precache, 13KB 浪费
3. **maxEntries: 3 共享 cache 限**: 词库 + 5+ data JSON 共用 word-data-cache-v2, Workbox ExpirationPlugin 一个 cache 一个 plugin 实例, 以先注册为准 → 整个 cache 限 3 条

---

## 修复计划 (W136 建议)

**Phase 1: P0 必修 (估计 4-6 小时)**
1. Runtime P0-1: W116 字母索引 + virtual list 集成 (1.5h)
2. Runtime P0-2: LCP 字体 preload (30min)
3. Runtime P0-3: MockWorker + 真测 worker (1.5h)
4. PWA P0-1/3/4: 删 syncManager.ts 整个 (1h)
5. PWA P0-2: 删 data: URL 规则 (10min)
6. Runtime P1-2: onerror 后续清理 (30min)
7. Runtime P1-3: LessonCard memo 修 (15min)
8. Runtime P1-5 + Bundle B-P1-2: 删重复图标 (5min)
9. PWA P1-1: 词库 SWR 7d (15min)
10. PWA P1-4: 删 main.tsx registerSW (10min)
11. PWA P1-7: UpdateToast dismiss-until 24h (30min)
12. 单元测试 + e2e 修 (1h)

**Phase 2: P1 强烈建议 (估计 3-4 小时)**
- PWA P1-3: hover prefetch 接入 Layout
- PWA P1-5: e2e 真测 SW update
- PWA P1-6: AI SWR modelVersion 失效
- Runtime P1-1: tests/setup.ts beforeEach reset worker
- Runtime P1-4: crossorigin 删
- Bundle B-P1-1: 改 llm-vendor 文档
- Bundle B-P1-3: 拆 word-data-cache + data-misc-cache

**Phase 3: P2 优化 (估计 2-3 小时, 单独 sprint)**
- Runtime P2: 6 项 (useVirtualScroll 删 / threshold 500 / preconnect / ErrorBoundary emoji / IO 修 / 键盘 nav)
- PWA P2: 6 项
- Bundle B-P2: 3 项

**Phase 4: 文档 + 收口 (估计 1 小时)**
- `docs/SUMMARY_v2.1.16.md` 写好
- `docs/CHANGELOG.md` v2.1.16 段
- 更新测试数 / 行数
- 主人 3 维 review (代码 + 文档 + 抗审查)

---

## 关键经验

- **W135 抗审查教训**: "测试全过 ≠ 正确" 再次验证. 33 个单元测试 100% 走 fallback, 0 个真测 worker 运行时
- **W135 抗审查教训**: "新增功能" 风险高. 8 大新功能里 4 个有 P0 (字母索引 / LCP / syncManager / SW sync handler)
- **W135 抗审查教训**: runtimeCaching 规则容易写成 "看起来对, 0 业务命中" 的装饰. 真业务路径要 grep 验证
- **W135 抗审查教训**: Bundle 拆分要看**实际 chunk 内容**, 不只看大小. llm-vendor 56KB 实际是 mini-vendor
