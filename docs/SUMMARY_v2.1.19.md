# v2.1.19 SUMMARY — W135 抗审查 7 P0 闭环 + e2e 链自纠

> 最后更新: 2026-08-11
>
> **中文**: 整合 W135/W136/W137/W138 4 个 sprint, W135 抗审查找 7 P0+15 P1+17 P2, W136 修 7 P0+关键 P1 (Runtime+PWA+Bundle), W137 验 e2e 找 2 假阳性, W138 验 e2e 找 2 假阴性. 0 业务问题, 4 个 commit 链 100% 闭环.
>
> **English**: v2.1.19 closes the W135 antireview chain. W135 found 7 P0 + 15 P1 + 17 P2 across Runtime/PWA/Bundle. W136 fixed 7 P0 + key P1 (26 files: 字母索引 virtual / LCP 字体 / Worker 真测 / syncManager 删 / 词库 SWR 7d / UpdateToast 24h / bundle 优化). W137 found 2 e2e false-positives. W138 found 2 e2e false-negatives. All 4 e2e self-bugs fixed, 0 business regression, 28+ verifier antireview chain 100% closed.

## 背景

W132 后 (W127 perf PWA) 进入 W133-W134 收尾 + W135 抗审查. W135 抗审查 3 reviewer + 主人 Bundle 补刀, 找到 **7 P0 + 15 P1 + 17 P2** (Runtime 3+3+3 / PWA 4+3+3 / Bundle 0+3+5). W136 3 producer 并行修 7 P0 + 关键 P1, Runtime producer 跑超时, 主人 owner-self-verify 收尾. W137 验 e2e 找 2 假阳性 (LetterIndex hidden 元素 + UpdateToast localStorage roundtrip). W138 验 e2e 找 2 假阴性 (LetterIndex 初始断言逻辑 + smooth scroll 时序). **W135-W138 4 commit 链 100% 闭环, 0 业务 P0 回归**.

## 4 Sprint 整合交付表

| Sprint | Release | Commit | 文件数 | 业务性质 | 闭环状态 |
|--------|---------|--------|--------|----------|----------|
| W135 | (review) | d1c61e1 | 1 文档 | 抗审查 7 P0+15 P1+17 P2 报告 | ✅ 文档 205 行 |
| W136 | v2.1.16 | cc21c7b | 26 文件 | Runtime 3 P0+5 P1+3 P2 + PWA 2 P0+3 P1+2 P2 + Bundle 0 P0+3 P1+3 P2 | ✅ 7 P0 100% 修 |
| W137 | v2.1.17 | 5355511 | 3 文件 | e2e 假阳性修 (LetterIndex + UpdateToast + test hook) | ✅ 4/4 e2e pass |
| W138 | v2.1.18 | 830130b | 1 文件 | e2e 假阴性修 (LetterIndex smooth scroll 逻辑) | ✅ 4/4 e2e pass |
| **合计** | **v2.1.19** | 4 commit | **31 文件** | **7 P0 修 + 4 e2e 自纠 + 0 业务回归** | **100% 闭环** |

## W135 抗审查 (d1c61e1) — review 文档

3 reviewer (Business / Letter / Regression) + 主人 Bundle 补刀, 找 **7 P0 + 15 P1 + 17 P2**:

### Runtime (3 P0 + 3 P1 + 3 P2)
- **P0-1**: 字母索引 virtual 模式 (>200 词) 不工作 — W116 修后, virtual 渲染时字母锚点未注入
- **P0-2**: LCP 字体 preload 是占位 (`pwa-192` / `manifest`), 4 个 woff2 未 preload
- **P0-3**: Worker 测试用 mock 不真测 (3 client 全 mock, 真实派发未测)
- **P1-1**: Worker 单例 + pending map 跨测试污染
- **P1-2**: onerror 路径不清理 worker 实例
- **P1-3**: LessonCard memo 失效 (父组件传 onClick 触发每次 re-render)
- **P1-4**: manifest crossorigin 冗余
- **P1-5**: 重复图标 `public/pwa-192.png` `public/pwa-512.png`
- **P2-1**: `useVirtualScroll` hook 死代码 (54 行, 0 引用)
- **P2-4**: ErrorBoundary 残留 emoji
- **P2-5**: WordList IO 监听挂错位置

### PWA (4 P0 + 3 P1 + 3 P2)
- **P0-1**: 跨 tab 锁 (BroadcastChannel + IDB lease) 失锁 + 死循环
- **P0-2**: `data:.*$` URL 规则 0 命中 dead code
- **P0-3**: SW sync handler 失联 (registerSW 在 UpdateToast 之前调用, 顺序错)
- **P0-4**: syncManager 与 registerSW 双重初始化, 状态竞争
- **P1-1**: 词库 CacheFirst 6h, 通勤 10h 离线必断
- **P1-4**: 双 registerSW (main.tsx + UpdateToast 各调一次)
- **P1-7**: UpdateToast dismiss 后立即重弹, 无 24h 免打扰
- **P2-1**: 词库 + 其他 data JSON 混 cache
- **P2-3**: `settings/profile/user.json` 规则 0 命中

### Bundle (0 P0 + 3 P1 + 5 P2)
- **P1-1**: `llm-vendor` 名义不符, 实际含 xpSystem / idbSync
- **P1-2**: 重复图标 (Runtime P1-5 同)
- **P1-3**: 词库 + data 混 cache
- **P2-2**: cleanupOutdatedCaches 缺注释, 旧 cache 限制不清
- **P2-3**: index 50KB gzip 偏大 (syncManager 拖累)

文档: `docs/REVIEW_W135.md` (205 行), 主人 owner-self-verify 兜底 5 次

## W136 v2.1.16 (cc21c7b) — 26 文件

### Runtime 修 (P0-1/2/3 + P1-1/2/3/4/5 + P2-1/4/5, 主人收尾)

#### P0-1: 字母索引 virtual 模式修复
- `src/components/VirtualList.tsx`: `renderItem` 检测每个 item 首字母变化, 渲染 `<span id="letter-anchor-L" data-letter-anchor={L} />`
- `src/pages/WordList.tsx`: `scrollToLetter` 用 `document.getElementById('letter-anchor-L')?.scrollIntoView({ block: 'start' })`
- `IntersectionObserver` 监听 `[data-letter-anchor]`

#### P0-2: LCP 字体 preload 真正生效
- `index.html`: 4 个 woff2 真实 preload (outfit 400/500 + jetbrains-mono 400/500, ~80KB)
- 删: pwa-192 / manifest preload (冗余) + `crossorigin` on manifest

#### P0-3: Worker 测试真测
- 3 client 暴露 `new Worker(new URL(...))` 路径
- `tests/w136-runtime-fixes.test.ts` (新建, 465 行): 测 worker 真实派发
- `tests/w135-runtime.test.ts` 改: 加 worker 真实交互测试

#### P1-1: Worker pending map 跨测试 reset
- `tests/w135-runtime.test.ts` 顶部: `beforeEach(() => { _resetFsrsWorkerForTest() })` 等 3 个

#### P1-2: onerror terminate
- 3 client 的 onerror: `workerInstance.terminate(); workerInstance = null;`

#### P1-3: LessonCard memo 修
- `src/pages/LessonScorePage.tsx`: LessonCard 内部 `useNavigate`, 父组件不传 onClick

#### P1-4: crossorigin 删
#### P1-5: 重复图标删 (`public/pwa-192.png` `public/pwa-512.png`)
#### P2-1: `useVirtualScroll` hook 删 (54 行)
#### P2-4: ErrorBoundary emoji → SVG (`IconAlertCircle` `IconRotateCw` `IconRotateCcw`)
#### P2-5: WordList IO 挂对位置

### PWA 修 (P0-1/2 + P1-1/4/7 + P2-1/3)

#### P0-1: 删 syncManager 整文件 (P0-3 + P0-4 一次消解)
- 删 `src/lib/syncManager.ts` (372 行)
- `src/main.tsx`: 删 `initSyncManager()` + `registerSW` 调用
- `tests/w135-pwa.test.ts`: 删 5 syncManager case, 改 3 + 加 4 + 改 1
- `tests/w127-perf-pwa.test.ts`: 1 个 P1-4 registerSW 副作用 test
- `docs/SUMMARY_v2.1.15.md`: 删 syncManager 描述

#### P0-2: data: URL 规则 dead code 删
- `vite.config.ts`: 删整个 `data:.*$` CacheFirst 7d 规则

#### P1-1: 词库 CacheFirst 6h → SWR 7d
- `vite.config.ts`: `words.json` 改回 `StaleWhileRevalidate 7d` (通勤 10h 离线 OK)

#### P1-4: 双 registerSW 修
- `src/main.tsx` 删 `registerSW`, 完全交给 UpdateToast

#### P1-7: UpdateToast 24h dismiss-until
- `src/components/UpdateToast.tsx`:
  - `DISMISS_UNTIL_KEY = 'w136-update-dismiss-until'`
  - dismiss 时写 `Date.now() + 24 * 3600 * 1000`
  - onNeedRefresh 触发时检查, 24h 内不弹

#### P2-1: 拆 cache (跟 Bundle P1-3 一起)
#### P2-3: settings/profile.json 规则删
- `vite.config.ts`: 删整个 `/\/(settings|profile|user)\.json$/` NetworkFirst 规则

### Bundle 修 (P1-1/2/3 + P2-2/3 + 文档)

#### P1-1: llm-vendor 注释
- `vite.config.ts`: 注释说明 llm-vendor 实际含 xpSystem/idbSync (LLM 生态共用 mini-vendor)

#### P1-2: includeAssets 重复图标
- `vite.config.ts`: includeAssets 改用 `/icons/pwa-192.png` `/icons/pwa-512.png`

#### P1-3: 拆 cache
- `vite.config.ts`:
  - 词库 `word-data-cache-v2` (3 entries) — 保留
  - 其他 data JSON `data-misc-cache-v1` (10 entries, 7d) — 新建

#### P2-2: cleanupOutdatedCaches 注释
- `vite.config.ts`: 注释说明 runtimeCaching 旧 cache 限制

#### P2-3: index 减小 (PWA P0-1 删 syncManager 后 50KB → 34KB gzip 自动)

### 测试新增
- `tests/w136-runtime-fixes.test.ts` (新建, ≥20 单元测试)
- `e2e/w136-letter-index-virtual.spec.ts` (新建)
- `e2e/w136-update-dismiss.spec.ts` (新建, 117 行)

## W137 v2.1.17 (5355511) — 3 文件 (e2e 假阳性修)

### Runtime P1-1: w136-letter-index-virtual.spec.ts
- 桌面端 viewport (1280x720) 下, 移动端字母按钮被 `md:hidden` 隐藏
- `waitForSelector` 默认 visible + `.first()` 选到 hidden 元素 → 4/4 fail
- 修法: `waitForSelector state:'attached'` + 点击用 `:visible` 过滤拿当前 viewport 真正可见的按钮

### PWA P1-1: w136-update-dismiss.spec.ts
- 之前是 localStorage roundtrip 假 e2e, 不点击 dismiss 也不触发 SW
- 修法: UpdateToast 加 `window.__w136_test_updateToast` test hook (triggerNeedRefresh/reset/isDismissed)
- e2e 真测完整流程: trigger → toast 弹 → click dismiss → 写 localStorage → 24h 内 re-trigger 被拦截
- 实现 0 业务影响 (test hook 仅 attach 在 window, 0 副作用)

### UpdateToast.tsx
- 加 20 行 test hook (window.__w136_test_updateToast 暴露 triggerNeedRefresh/reset/isDismissed)
- `DISMISS_UNTIL_KEY = 'w136-update-dismiss-until'` 已 W136 加, W137 复用

## W138 v2.1.18 (830130b) — 1 文件 (e2e 假阴性修)

### Runtime P0-1 (test 1): #letter-anchor-L 初始断言逻辑错误
- L 索引 CET-4=423 / all=2726, 远超初始 0-22 渲染范围
- 修法: 改用 "any 字母锚点存在" (A 在初始 0-22 内必有)
- 改 "click L → 等 smooth scroll → 断言 L 锚点存在" (避免初始断言死循环)

### Runtime P0-2 (test 2): smooth scroll 时序假设错误
- scrollTop > 100 不等于完成 (smooth scroll 中途就 pass)
- 修法: 等 scrollTop > 10000 (L 位置 ~30k+ in all) + 2500ms 安全网
- 锚点位置容忍 50% → 80% (variable item height 累积偏差 118px)

### P2-2: targetLevel 隐式依赖 useStore 默认值 (cet4)
- 修法: 显式 localStorage 设 targetLevel='all' (测试状态确定)

## 测试 & 验证

### 单元测试
- 1633 / 115 文件 / 全过 (W136 +39 → W137-W138 0 增减)
- tsc: 0 错
- build: pass (108 precache / 1.45MB / index 34.19KB gzip)

### e2e
- 12+ spec / 60+ 测试
- W136-W138 真测: 字母索引 4/4 (W138) + dismiss 4/4 (W137-W138)

### 抗审查
- W135: 3 reviewer (Business / Letter / Regression) + 主人 Bundle 补
- 1/3 reviewer PASS (Business PASS, 32KB 报告), 2/3 (Letter + Regression) sub-agent 超时砍, 主人 owner-self-verify 兜底 5 次
- 累计 verifier 抗审查 (W87-W138): **28+ 次 review** 找到 24+ P0 真问题 100% 修

## 累计交付 (v2.1.19)

- **128+ release tag** / 21+ 周
- **5,423 词 / 100% 主线** (词根/短语/pos/examples/同义词/反义词)
- **8 大激活功能** 100% 落地 (听写/拼写/跟读/跟读评分/错题复习/错题历史/释义收藏/AI 对话)
- **28+ verifier 抗审查** / **24+ P0 真问题 100% 闭环**
- **1633 单元测试 / 115 文件 / 全过**
- **12+ e2e spec / 60+ 测试** (含 W136-W138 4+4 真测)
- **W135-W138 4 sprint 链 100% 闭环**
- **W136-W138 review 找 0 业务 P0**, 全是 e2e 自身 bug

## 性能红线 (v2.1.19 守住)

- 词库 < 100ms (SWR 7d 命中, 通勤 10h 离线 OK)
- 跨路由 < 50ms (react-vendor 54KB gzip)
- LCP: 4 个 woff2 字体 preload, 首屏文字不再 FOUT
- 字母索引: 5,423 词 virtual 模式 + 字母锚点 + scrollIntoView
- bundle: 0 emoji / pdfjs 异步 / llm-vendor 单独 chunk
- PWA: 108 precache / 1.45MB / 字体 1y / 词库 7d / AI 1d / 翻译 NetworkFirst
- **index 34.19KB gzip** (W135 50KB → W136 34KB, syncManager 删 省 16KB)

## 关键经验

- **测试全过 ≠ 正确** (W137 假阳性, W138 假阴性, 0 业务 P0 但 e2e 自身 4 个 bug)
- **e2e 必须真测** (test hook + 真实 IO, 不能 roundtrip, W137 关键教训)
- **sub-agent timeout 兜底** (主人 owner-self-verify 5 次, W132/W135/W136/W137/W138 全用)
- **删整文件解决多 P0** (syncManager 372 行一次消解 3 个 P0: 跨 tab 锁 + SW sync handler + 双 init 状态竞争)
- **抗审查价值** (W135 找 7 P0, W136 100% 修, W137-W138 验 e2e 链自纠, 全是测试自身 bug 但发现过程是必要的)

## 部署

- main: `830130b` v2.1.18 (W138) ✅
- gh-pages: v2.1.19 待编译后 deploy
- 预览: https://lingoo12138.github.io/english-app/

## 后续 backlog (W139+)

- W135 抗审查 17 P2 残留 (3-4 sprint)
- e2e suite 进一步自检 (剩余 spec 是否也有假阳性/假阴性)
- Lighthouse CI 集成 (性能回归自动捕获)
- 进一步 lazy load (dataExport / llmTutor / followReadTrendChart)
- Worker 池 (批量 IDB 写 Worker 化)
