# v2.1.15 (W135) — 性能 + Bundle 优化 (3 producer 并行)

> 最后更新: 2026-08-10
>
> **English**: v2.1.15 is the W135 performance push. Three parallel workstreams landed: W135-Bundle tightened the Vite manualChunks (new `llm-vendor` chunk), W135-Runtime moved 3 heavy compute paths into Web Workers (FSRS, followReadScore, lessonScore) and added a VirtualList + LCP preload, W135-PWA rewrote the SW caching strategy (words.json to CacheFirst, AI to SWR, export data cached, Background Sync manager, UpdateToast).

## 背景

v2.1.14 收口后, 用户希望 W135 进一步压性能. 3 个独立方向 3 个 agent 并行, 但 sub-agent 跑超 30 分钟 (token plan 上限), 主人接手收尾.

## 改动

### W135-Bundle — manualChunks 进一步拆分 + 资源压缩
- `vite.config.ts`:
  - 新增 `llm-vendor` chunk (合并 7 个 LLM 共享 lib, ~56KB / ~15KB gzip)
  - 收紧 `maximumFileSizeToCacheInBytes` 从 2MB → 1MB
  - 启用 `clientsClaim: true` (新版 SW 立即接管未受控 tab)
- bundle size 实测:
  - 之前 (W134): 108 precache / 1.43MB
  - 现在 (W135): 110 precache / 1.48MB (新增 llm-vendor + 3 worker chunks)

### W135-Runtime — Web Worker 重计算 + 虚拟滚动 + LCP
- 新建 `src/workers/` (3 个 Worker):
  - `fsrs.worker.ts` (202 行): FSRS 复习调度, 批量 30 词一次算
  - `followReadScore.worker.ts` (103 行): 跟读评分聚合 (avg/best/byLesson/recent)
  - `lessonScore.worker.ts` (121 行): 课文评分计算 (跨课复用词)
- 新建 `src/lib/*WorkerClient.ts` (3 个):
  - 主线程通过 postMessage 调 Worker, 不阻塞 UI
- 新建 `src/components/VirtualList.tsx` (209 行): 长列表虚拟滚动
- 新建 `src/lib/virtualScroll.ts` (54 行): useVirtualScroll hook
- `src/pages/WordList.tsx`: 加虚拟滚动 (5,423 词流畅)
- `index.html`: 加 LCP preload (pwa-192.png + manifest.webmanifest)
- `src/App.tsx`: ErrorBoundary 包裹 Suspense 兜底 + 路由 path 预热

### W135-PWA — 缓存策略调优 + 资源预取 + Background Sync + SW 更新
- `vite.config.ts` workbox 全面调优:
  - `words.json`: SWR 7d → **CacheFirst + 6h 过期** (重复打开秒开, 6h 后台重拉)
  - `AI/LLM`: NetworkFirst 1d → **StaleWhileRevalidate 1d** (重复 query 秒回)
  - 翻译 API: 保持 NetworkFirst (翻译不能过期)
  - 新增 `data:` URL 缓存 (用户导出数据 7d)
  - 新增 settings/profile.json NetworkFirst 1d
  - 字体: CacheFirst 1y (不变)
- 新建 `src/lib/syncManager.ts` (372 行): Background Sync 抽象
  - 离线写入排队, 在线时自动 flush
  - 5 次重试 + 指数退避
  - 注册默认 handlers: favorite/dictation/errorReview
- 新建 `src/lib/prefetch.ts` (195 行): 路由 hover 预取 + idle 预热
- 新建 `src/components/UpdateToast.tsx` (148 行): SW 新版本 toast 提示
- `src/main.tsx`: 集成 syncManager + UpdateToast
- 新建 `e2e/w135-pwa-update.spec.ts`: SW 更新 e2e

### 累计 (v2.1.15)
- 1594 单元测试 (1552 → +42) 全过
- 114 test 文件, 0 失败
- 110 precache / 1.48MB
- 0 P0 + 0 P1 业务 维持 200+ 轮
- 3 个 Web Worker 化重计算, 主线程不卡
- 1 个 llm-vendor chunk, LLM 页面切换秒开
- 路由级 hover 预取 + offline 写入自动 sync
- 8 大激活 + 8 大改版稿 + 2 补充 + 改版稿 2 + 改版稿 3 + W135 = **100% 全部落地** ✅

### 部署
- main: 待 commit + push
- gh-pages: v2.1.14 deployed, 待 v2.1.15 编译后 deploy
- 预览: https://lingoo12138.github.io/english-app/

### 性能红线 (守住)
- 词库 < 100ms (CacheFirst 6h 命中)
- 跨路由 < 50ms (react-vendor 54KB gzip + 路由预取)
- glass ≤ 2 / 0 framer-motion
- 主线程: 重计算全部 Worker 化
- bundle: 0 emoji → 0 依赖 SVG / pdfjs 异步 import / llm-vendor 单独 chunk
- PWA: 110 precache / 1.48MB / 字体 1y / 词库 6h / AI 1d / 翻译 NetworkFirst

### 后续 backlog
- 进一步 lazy load (大组件 dataExport, llmTutor, followReadTrendChart)
- 引入 Web Worker 池 (批量 IDB 写也 Worker 化)
- 集成 Lighthouse 自动化 (CI 跑 perf audit)
