# v2.1.12 (W126 + W127 + W128) — 8 大激活 UI 收官 + 性能 + 数据

> 最后更新: 2026-08-09
>
> **English**: v2.1.12 is the v2.1.x final release. It closes three parallel workstreams (W126 4-page UI redesign, W127 pdfjs vendor split, W128 data export + IDB sync) and consolidates the 8 activation features with unified design system.

## 背景

W124 + W125 改版稿落地后, 3 个独立方向拉 3 个 agent 并行:
- **W126**: 4 大激活功能页 UI 改造 (跟读/听写/拼写/错题历史)
- **W127**: 性能 + PWA (pdfjs 拆 vendor + workbox 优化)
- **W128**: 数据导出整合 + 跨 tab IDB 同步

3 个 agent 各自交付, 主人整合 + 测试 + 部署.

## 改动

### W126 — 8 大激活功能 UI 改造 (4 大页)
- **PronounceCustom.tsx** (60 行 → 137 行): 跟读自定义
- **DictationPage.tsx** (399 行 → 474 行): 听写
- **SpellingPage.tsx** (317 行 → 381 行): 拼写
- **ErrorHistoryPage.tsx** (264 行 → 437 行): 错题复习历史
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
  - 7 类别 (settings/words/chats/errors/lessonScores/achievements/favorites)
  - EXPORT_SCHEMA_VERSION = 2
- 新建 `src/lib/idbSync.ts` (300 行):
  - BroadcastChannel 跨 tab 同步
  - debounce 200ms 防回环
  - storage event fallback (老浏览器)
  - rate limit 1/200ms 同 store+op+key 合并
  - _receiving 旗标防回环
- 重构 `src/lib/export.ts` / exportChat.ts / exportErrors.ts / db.ts 调 dataExport
- `src/main.tsx` 注册 idbSync
- +48 单元测试 (`tests/w128-data-export-sync.test.ts`)

## 🎬 演示视频 / 截图

### 8 大激活功能 (W126 改造后)

| 功能 | 路由 | 截图 | 关键点 |
|------|------|------|--------|
| 🎧 听写 | `/dictation` | [w126-desktop-dictation](../screenshots/w126-desktop-dictation.png) | Bento 布局 + 大圆按钮 + 实时评分 |
| 🃏 拼写 | `/spelling` | [w126-desktop-spelling](../screenshots/w126-desktop-spelling.png) | 字符级 diff 高亮 (绿/红/黄) |
| 🎤 跟读 | `/pronounce-custom` | (无截图) | Header + 3 圆按钮 + 进度条 |
| 🎤 跟读评分 (课文) | `/textbook/:id` | [w124-desktop-lesson-score](../screenshots/w124-desktop-lesson-score.png) | LessonScore Bento |
| 🔁 错题复习 | `/errors/review` | [w123b-errorreview-ui](../screenshots/15-abruptly-after.png) | Flashcard 队列 + 偷看 |
| 📊 错题历史 | `/errors/history` | [w126-desktop-error-history](../screenshots/w126-desktop-error-history.png) | 横向条形图 + 来源分组 |
| ⭐ 释义收藏 | `/favorites/translation` | (释义页) | 跨词搜索 + [wordId+index] 复合 key |
| 💬 AI 对话 v2 | `/aichat` | [w123d-desktop-aichat](../screenshots/w123d-desktop-aichat.png) | folders + reply + 快捷建议 |

### 暗色 / 高对比度 (W125)

| 主题 | 截图 |
|------|------|
| 🌙 暗色模式 | [w125-dark-mode](../screenshots/w125-dark-mode.png) |
| ♿ 高对比度 | [w125-high-contrast](../screenshots/w125-high-contrast.png) |

### 性能指标 (W127)

```
拆前:  首屏 ~6MB (pdfjs 476KB 在主 bundle)
拆后:  首屏 ~600KB (pdfjs 142KB 异步)
节省:  -90% (省 6MB)
```

### 跨 tab 同步演示 (W128)

```
打开 2 个 tab:
  Tab A: 加生词 → 通知 BroadcastChannel
  Tab B: 收到通知 → onChange('favorites', 'put', id)
       → UI 刷新 (无需刷新页面)

打开第 3 个 tab (Safari <15.4):
  storage event 触发 → fallback 路径
  → UI 刷新 (BroadcastChannel 不存在)
```

### 设计统一 (W126 跨 4 页)

```
顶部: 居中标题 + 3 圆按钮 (上/下/确认)
       └─ .btn-circle .btn-circle-primary (品牌色)
       └─ .btn-circle .btn-circle-ghost (次操作)

中部: .card card-interactive
       └─ box-shadow: var(--shadow-soft)
       └─ hover: translateY(-2px) + var(--shadow-hover)
       └─ rounded-2xl + p-6

底部: 次要操作 + 进度条
       └─ .progress-thin + .progress-brand

Icon: 20 个内联 SVG (0 依赖)
Motion: --t-fast/--t-base/--t-slow + --ease/--ease-spring
Dark: 8 主题 0 延迟切换
```

## 累计数据 v2.1.12
- **123 release tag** / 19+ 周
- **1329 单元测试** (v2.1.7 1232 → +20 W126 + +29 W127 + +48 W128 = 1329)
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务
- 18 verifier 抗审查 (24 P0 + 49 P1 累计修)
- 8 大激活功能 + 8 大改版稿 + 2 补充 = 100% 全部落地 ✅
- pdfjs 拆 vendor 首屏省 6MB, react-vendor 165KB gzip
- 3 export lib 整合到 1 个, 跨 tab IDB 同步

> v2.1.13 (W129+W130+W131) 累计 **1478 单元测试** + 19 e2e spec + 21 verifier 抗审查

## 部署
- main: d589cf2 ✅ pushed
- gh-pages: a89ab3e ✅ pushed (v2.1.12)
- 预览: https://lingoo12138.github.io/english-app/

## 内部 anchor
- [背景](#背景)
- [改动 W126](#w126--8-大激活功能-ui-改造-4-大页)
- [改动 W127](#w127--性能--pwa)
- [改动 W128](#w128--数据导出整合--跨-tab-idb-同步)
- [演示视频 / 截图](#-演示视频--截图)
- [累计数据](#累计数据-v2112)
- [部署](#部署)
