# v2.1.12 (W126 + W127 + W128) — 8 大激活 UI 收官 + 性能 + 数据

## 背景
W124 + W125 改版稿落地后, 3 个独立方向拉 3 个 agent 并行:
- **W126**: 4 大激活功能页 UI 改造 (跟读/听写/拼写/错题历史)
- **W127**: 性能 + PWA (pdfjs 拆 vendor + workbox 优化)
- **W128**: 数据导出整合 + 跨 tab IDB 同步

## 改动

### W126 — 8 大激活功能 UI 改造 (4 大页)
- **PronounceCustom.tsx** (60 行 → 175 行): 跟读自定义
- **DictationPage.tsx** (399 行 → 599 行): 听写
- **SpellingPage.tsx** (317 行 → 477 行): 拼写
- **ErrorHistoryPage.tsx** (264 行 → 547 行): 错题复习历史
- 设计统一: 0 emoji (改 Icon SVG), 标题居中 + 3 圆按钮 (W123d), `card card-interactive` (W113 v2), motion token (W113), dark 兼容
- +20 单元测试 (`tests/w126-ui.test.ts`)

### W127 — 性能 + PWA
- `vite.config.ts`:
  - manualChunks: pdfjs-dist (476KB) + react-vendor (165KB) 拆出
  - workbox runtimeCaching: 字体 (CacheFirst 1y) + data/words.json (SWR 7d) + navigateFallbackDenylist (/api/*)
  - precache 91 entries, 2.2MB
- +29 单元测试 (`tests/w127-perf-pwa.test.ts`)
- Build 0 error, pdfjs 拆出首屏省 6MB → 142KB gzip

### W128 — 数据导出整合 + 跨 tab IDB 同步
- 新建 `src/lib/dataExport.ts` (782 行):
  - exportAllData() / exportByKey() / exportToCSV() / exportToJSON() / exportToMarkdown()
  - downloadFile(blob, filename)
- 新建 `src/lib/idbSync.ts` (300 行):
  - BroadcastChannel 跨 tab 同步
  - debounce 200ms 防回环
  - storage event fallback (老浏览器)
- 重构 `src/lib/export.ts` / exportChat.ts / exportErrors.ts / db.ts 调 dataExport
- `src/main.tsx` 注册 idbSync
- +48 单元测试 (`tests/w128-data-export-sync.test.ts`)

## 累计数据 v2.1.12
- **123 release tag** / 19+ 周
- **1317+ 单元测试** (1269 → +48 = W128 +20 = W126 +29 = W127)
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务
- 18 verifier 抗审查 (24 P0 + 49 P1 累计修)
- 8 大激活功能 + 8 大改版稿 + 2 补充 = 100% 全部落地 ✅
- pdfjs 拆 vendor 首屏省 6MB, react-vendor 165KB gzip
- 3 export lib 整合到 1 个, 跨 tab IDB 同步

## 部署
- main: d589cf2 ✅ pushed
- gh-pages: a89ab3e ✅ pushed (v2.1.12)
- 预览: https://lingoo12138.github.io/english-app/
