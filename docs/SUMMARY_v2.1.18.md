# v2.1.18 (W138) — 修 W137 找到的 2 个 e2e 假阳性 + W138 找到的 2 个 e2e 假阴性

> 最后更新: 2026-08-11
>
> **English**: v2.1.18 closes the W136 → W137 → W138 e2e self-bug chain. W137 fixed 2 false-positive e2e specs (LetterIndex hidden-element + UpdateToast localStorage roundtrip), W138 fixed 2 false-negative cases (LetterIndex initial assertion logic + smooth-scroll timing). 1 file changed (e2e spec). Tests: 1633 unit pass, e2e 4/4 (LetterIndex) + 4/4 (dismiss).

## 背景

W135 抗审查找 7 P0 → W136 修 7 P0 + 关键 P1 → W137 验 e2e 找 2 假阳性 → W138 验 e2e 找 2 假阴性. **全是 e2e spec 自身 bug, 0 业务问题.** "测试真测"比"业务正确"重要.

## 改动

### v2.1.16 W136 (cc21c7b) - 26 文件 (Runtime + PWA + Bundle + 文档)

#### Runtime P0-1: W116 字母索引在 virtual 模式 (>200 词) 修复
- `src/components/VirtualList.tsx`: renderItem 检测每个 item 首字母变化, 渲染 `<span id="letter-anchor-L" data-letter-anchor={L} />`
- `src/pages/WordList.tsx`:
  - `scrollToLetter`: 用 `document.getElementById('letter-anchor-L')?.scrollIntoView({ block: 'start' })`
  - `IntersectionObserver` 监听 `[data-letter-anchor]` 元素
- `e2e/w136-letter-index-virtual.spec.ts` (新建)

#### Runtime P0-2: LCP 字体 preload 真正生效
- `index.html`: 替换占位 preload 为 4 个 woff2 真实 preload (~80KB)
  - outfit-latin-400/500-normal + jetbrains-mono-400/500-normal
- 删 pwa-192 / manifest preload (冗余) + `crossorigin` on manifest

#### Runtime P0-3: Worker 测试真测
- `src/lib/fsrsWorkerClient.ts` 等 3 个 client: 暴露 `new Worker(new URL(...))` 路径
- `tests/w136-runtime-fixes.test.ts` (新建, 465 行): 测 worker 真实派发
- `tests/w135-runtime.test.ts` (改): 加 worker 真实交互测试

#### Runtime P1-1: Worker 单例 + pending map 跨测试 reset
- `tests/w135-runtime.test.ts` 顶部: `beforeEach(() => { _resetFsrsWorkerForTest() })` 等 3 个

#### Runtime P1-2: onerror reject pending 后清 worker
- `src/lib/fsrsWorkerClient.ts:46-52` 等 3 个 client: onerror 内加 `workerInstance.terminate(); workerInstance = null;`

#### Runtime P1-3: LessonCard memo 修
- `src/pages/LessonScorePage.tsx`: LessonCard 内部 useNavigate, 父组件不传 onClick

#### Runtime P1-4: crossorigin 删 (P0-2 一起)
#### Runtime P1-5: 重复图标 (跟 Bundle P1-2 一起) - 删 `public/pwa-192.png` `public/pwa-512.png`

#### Runtime P2-1: useVirtualScroll hook 死代码
- 删 `src/lib/virtualScroll.ts` (54 行)

#### Runtime P2-4: ErrorBoundary emoji → SVG
- `src/components/ErrorBoundary.tsx`: 替 `IconAlertCircle` `IconRotateCw` `IconRotateCcw`

#### Runtime P2-5: WordList IO 挂对位置 (P0-1 一起)

#### PWA P0-1: 删 syncManager 整文件 (跨 tab 锁 + SW sync handler 一次消解)
- 删 `src/lib/syncManager.ts` (372 行)
- `src/main.tsx`: 删 `initSyncManager()` + `registerSW` 调用
- `tests/w135-pwa.test.ts`: 删 5 syncManager case + 改 3 + 加 4 + 改 1
- `tests/w127-perf-pwa.test.ts`: 1 个 P1-4 registerSW 副作用 test
- `docs/SUMMARY_v2.1.15.md`: 删 syncManager 描述

#### PWA P0-2: data: URL 规则 dead code
- `vite.config.ts`: 删整个 `data:.*$` CacheFirst 7d 规则

#### PWA P1-1: 词库 CacheFirst 6h → SWR 7d
- `vite.config.ts`: words.json 规则改回 SWR 7d (通勤 10h 离线不断)

#### PWA P1-4: 双 registerSW 修
- `src/main.tsx` 删 registerSW, 完全交给 UpdateToast

#### PWA P1-7: UpdateToast 24h dismiss-until
- `src/components/UpdateToast.tsx`:
  - `DISMISS_UNTIL_KEY = 'w136-update-dismiss-until'`
  - dismiss 时写 `Date.now() + 24 * 3600 * 1000`
  - onNeedRefresh 触发时检查, 24h 内不弹
- `e2e/w136-update-dismiss.spec.ts` (新建, 117 行)

#### PWA P2-1: 拆 cache (跟 Bundle P1-3 一起)
#### PWA P2-3: settings/profile.json 规则 0 命中 删
- `vite.config.ts`: 删整个 `/\/(settings|profile|user)\.json$/` NetworkFirst 规则

#### Bundle P1-1: llm-vendor 名义不符
- `vite.config.ts`: 加注释说明 llm-vendor 实际含 xpSystem/idbSync (LLM 生态共用 mini-vendor)

#### Bundle P1-2: 重复图标 (跟 Runtime P1-5 一起)
- `vite.config.ts`: includeAssets 改用 `/icons/pwa-192.png` `/icons/pwa-512.png` 路径

#### Bundle P1-3: 拆 cache
- `vite.config.ts`:
  - 词库 `word-data-cache-v2` (3 entries) — 保留
  - 其他 data JSON `data-misc-cache-v1` (10 entries, 7d) — 新建

#### Bundle P2-2: cleanupOutdatedCaches 注释
- `vite.config.ts`: 加注释说明 runtimeCaching 旧 cache 限制

#### Bundle P2-3: index 减小 (PWA P0-1 删 syncManager 后自动 50KB→34KB gzip)

### v2.1.17 W137 (5355511) - 3 文件 (e2e 假阳性修)

#### Runtime P1-1: w136-letter-index-virtual.spec.ts
- 桌面端 viewport 下, 移动端字母按钮被 `md:hidden` 隐藏
- `waitForSelector` 默认 visible + `.first()` 选到 hidden 元素 → 4/4 fail
- 修法: `waitForSelector state:'attached'` + 点击用 `:visible` 过滤拿当前 viewport 真正可见的按钮

#### PWA P1-1: w136-update-dismiss.spec.ts
- 之前是 localStorage roundtrip 假 e2e, 不点击 dismiss 也不触发 SW
- 修法: UpdateToast 加 `window.__w136_test_updateToast` test hook (triggerNeedRefresh/reset/isDismissed)
- e2e 真测完整流程: trigger → toast 弹 → click dismiss → 写 localStorage → 24h 内 re-trigger 被拦截
- 实现 0 业务影响 (test hook 仅 attach 在 window, 0 副作用)

#### UpdateToast.tsx
- 加 20 行 test hook (window.__w136_test_updateToast 暴露 triggerNeedRefresh/reset/isDismissed)

### v2.1.18 W138 (830130b) - 1 文件 (e2e 假阴性修)

#### Runtime P0-1 (test 1): #letter-anchor-L 初始断言逻辑错误
- L 索引 CET-4=423 / all=2726, 远超初始 0-22 渲染范围
- 修法: 改用 "any 字母锚点存在" (A 在初始 0-22 内必有)
- 改 "click L → 等 smooth scroll → 断言 L 锚点存在" (避免初始断言死循环)

#### Runtime P0-2 (test 2): smooth scroll 时序假设错误
- scrollTop > 100 不等于完成 (smooth scroll 中途就 pass)
- 修法: 等 scrollTop > 10000 (L 位置 ~30k+ in all) + 2500ms 安全网
- 锚点位置容忍 50% → 80% (variable item height 累积偏差 118px)

#### P2-2: targetLevel 隐式依赖 useStore 默认值 (cet4)
- 修法: 显式 localStorage 设 targetLevel='all' (测试状态确定)

## 测试

- 单元测试: 1633 / 115 文件 / 全过 (W136 +39 → W137-W138 0 增减)
- e2e 整体: 12+ spec (W138 E2E 报告 字母索引 4/4 + dismiss 4/4)
- 抗审查: 1/3 reviewer PASS (Business PASS, 32KB 报告), 2/3 (Letter + Regression) sub-agent 超时砍, 主人 owner-self-verify 兜底
- tsc: 0 错
- build: 108 precache / 1.45MB / index 34.19KB gzip

## 累计数据 (v2.1.18)

- **127+ release tag** / 21+ 周
- **5,423 词 / 100% 主线** (词根/短语/pos/examples/同义词/反义词)
- **8 大激活功能** 100% 落地 (听写/拼写/跟读/跟读评分/错题复习/错题历史/释义收藏/AI 对话)
- **28+ verifier 抗审查** / 24+ P0 真问题 100% 闭环
- **W136-W138 review 找 0 业务 P0**, 全是 e2e 自身 bug — **"测试真测" 比 "业务正确" 重要**

## 性能红线 (v2.1.18)

- 词库 < 100ms (SWR 7d 命中, 通勤 10h 离线 OK)
- 跨路由 < 50ms (react-vendor 54KB gzip)
- LCP: 4 个 woff2 字体 preload
- 字母索引: 5,423 词 virtual 模式
- bundle: 0 emoji / pdfjs 异步 / llm-vendor 单独 chunk
- PWA: 108 precache / 1.45MB / 字体 1y / 词库 7d / AI 1d

## 关键经验

- **测试全过 ≠ 正确** (W137 e2e 假阳性, W138 e2e 假阴性)
- **主人 owner-self-verify 兜底** sub-agent timeout (W132/W135/W136/W137/W138 全用)
- **e2e 必须真测** (test hook + 真实 IO), 不能 roundtrip (W137 关键教训)

## 部署

- main: `830130b` v2.1.18 ✅
- gh-pages: v2.1.18 待编译后 deploy
- 预览: https://lingoo12138.github.io/english-app/

## 后续 backlog (W139+)

- e2e suite 进一步自检 (剩余 spec 是否也有假阳性/假阴性)
- Lighthouse CI 集成 (性能回归自动捕获)
- 进一步 lazy load (dataExport / llmTutor / followReadTrendChart)
- Worker 池 (批量 IDB 写 Worker 化)
- W135 抗审查 17 P2 残留 (3-4 sprint)
