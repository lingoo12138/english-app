# 🏗️ 技术架构

> v2.1.19 快照 · 详情见 [CHANGELOG.md](./CHANGELOG.md)
>
> **English**: Architecture as of v2.1.19. Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3. PWA offline (108 precache / 1.45MB). IndexedDB v8 (11 tables, zero cloud). pdfjs split into vendor chunk (476KB → 142KB gzip async). llm-vendor split (21KB gzip, LLM page lazy). 3 Web Workers (fsrs/followReadScore/lessonScore). LCP font preload (4 woff2). Cross-tab IDB sync (BroadcastChannel + storage fallback + 100ms debounce + 5MB cap + 3 retry). 50+ libs / 37 pages / 37 components.

---

## 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst + SPA navigateFallback)
│   └─ 108 precache / 1.45MB / 词库 SWR 7d / AI SWR 1d / 翻译 NetworkFirst (W136 调优)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB v8 本地存储 (11 张表, 零云)
├─ AI 抽象层: 10 LLM / 8 TTS / 8 翻译 (统一接口 + 自动降级)
├─ 学习算法: FSRS 间隔重复 + 字符相似度 (multiset) + LCS diff
├─ 跟读 STT: Web Speech API (浏览器原生) + 评分算法
├─ Web Worker (W135): fsrs / followReadScore / lessonScore — 主线程不卡
├─ 性能: pdfjs 拆 vendor (476KB → 142KB gzip 异步) + llm-vendor 21KB + LCP 字体 preload
├─ 跨 tab: BroadcastChannel + storage event fallback (idbSync.ts, 100ms debounce + 5MB cap + 3 retry)
├─ 数据导出: dataExport.ts 统一 7 类别 + CSV/JSON/MD 转换
└─ 测试: Vitest 1633 / 115 文件 + Playwright 23 spec / 128+ 测试 + 28+ verifier 抗审查
```

---

## 模块图

### 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│  Pages (27)                                                  │
│  ├─ Home / WordList / WordDetail / Notebook                 │
│  ├─ Textbook / LessonDetail / LessonScore                   │
│  ├─ Dictation / Spelling / Pronounce / FollowRead           │
│  ├─ Errors / ErrorReview / ErrorHistory / ErrorStats        │
│  ├─ AIChat / WritePage / Translate / Camera                 │
│  ├─ Scenes / SceneDetail / CustomScene*                     │
│  ├─ Calendar / LearnReport / Reports                        │
│  ├─ Achievements / PlanPage / ReviewCenter / DailyPage      │
│  └─ Settings / DocsPage                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Components (32) + Layout (desktop 22 + mobile 5)           │
│  ├─ TTSButton / PronunciationPractice / ErrorExplainButton │
│  ├─ Toast / Skeleton (5 出口) / Icon SVG (20 个)            │
│  ├─ WordCard (React.memo) / Bento / MainCTA                │
│  └─ a11y: ErrorBoundary / skip-link / aria-label           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Libs (50+)                                                  │
│  ├─ 学习算法: dictation / spelling / followRead / errorReview│
│  ├─ 知识网络: wordNetwork (synonym/antonym/root) / textbook  │
│  ├─ AI 抽象: llm / tts / stt / translate / imageRecog        │
│  ├─ 数据: db (IDB v8) / dataExport / idbSync / migrate      │
│  ├─ UI: md / toastStore / i18n / theme                      │
│  └─ 统计: learnReport / learningCalendar / errorStats      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Data / Store / Types                                        │
│  ├─ Data: words.json (5,423) / synonyms*.ts / textbook*.ts  │
│  ├─ Store: Zustand 4 (5 stores: settings/plan/xp/streak)   │
│  └─ Types: TypeScript 5 严格模式                            │
└─────────────────────────────────────────────────────────────┘
```

### idbSync 模块图 (W128 新增)

```
┌─────────────────────────────────────────────────────────────┐
│  src/main.tsx                                                │
│  └─ initIdbSync({ stores, onChange })                       │
└────────────────────┬────────────────────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
       ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│ BroadcastChannel│       │  storage event     │
│  (现代浏览器)  │          │  (老浏览器 fallback)│
│  名称:         │          │  key:             │
│  english-app- │          │  __idb-sync__     │
│  idb-sync     │          │                   │
└──────┬───────┘          └────────┬──────────┘
       │                           │
       │  5 操作:                  │
       │  put / delete / clear     │
       │  bulkPut / bulkDelete     │
       │                           │
       │  字段:                    │
       │  msgId (去重)             │
       │  store (哪个表)           │
       │  op (什么操作)            │
       │  key (主键)               │
       │  ts (时间戳)              │
       │  sourceTab (源 tab id)    │
       │                           │
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │  notifyIdbWrite()         │
       │  ├─ debounce 200ms        │
       │  ├─ rate limit 1/200ms    │
       │  │  (同 store+op+key 合并)│
       │  └─ 设 _receiving 旗标    │
       │     (防回环)              │
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │  副 tab 收到              │
       │  ├─ 比对 msgId            │
       │  ├─ 比对 sourceTab        │
       │  ├─ 回调 onChange()       │
       │  └─ UI 决定 setState      │
       └───────────────────────────┘
```

### dataExport 模块图 (W128 新增)

```
┌─────────────────────────────────────────────────────────────┐
│  src/lib/dataExport.ts (782 行)                              │
│  EXPORT_SCHEMA_VERSION = 2                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
       ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│  导出 7 类别 │          │  转换 3 格式      │
│              │          │                   │
│  - settings  │          │  - CSV (BOM +     │
│  - words     │          │    注入防护)      │
│  - chats     │          │  - JSON          │
│  - errors    │          │    (indent=2)    │
│  - lessonSco │          │  - MD (YAML      │
│  - achieve.  │          │    frontmatter)  │
│  - favorites │          │                   │
└──────┬───────┘          └────────┬──────────┘
       │                           │
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │  downloadFile(blob, name)  │
       │  Blob URL (大文件友好)     │
       └───────────────────────────┘
```

### Web Worker 模块图 (W135 新增)

```
┌─────────────────────────────────────────────────────────────┐
│  主线程 (UI)                                                  │
│  ├─ fsrsWorkerClient.ts                                     │
│  │  └─ new Worker(new URL('../workers/fsrs.worker.ts',...)) │
│  ├─ followReadScoreWorkerClient.ts                          │
│  │  └─ new Worker(new URL('../workers/followReadScore.worker.ts',...)) │
│  └─ lessonScoreWorkerClient.ts                              │
│     └─ new Worker(new URL('../workers/lessonScore.worker.ts',...)) │
└────────────────────┬────────────────────────────────────────┘
                     │  postMessage (主线程不卡)
┌────────────────────▼────────────────────────────────────────┐
│  src/workers/                                                │
│  ├─ fsrs.worker.ts (202 行)                                  │
│  │  └─ FSRS 复习调度, 批量 30 词一次算                       │
│  │     next_review = now + stability × difficulty_factor   │
│  ├─ followReadScore.worker.ts (103 行)                       │
│  │  └─ 跟读评分聚合 (avg/best/byLesson/recent)               │
│  │     charScore × 0.6 + wordScore × 0.4                    │
│  └─ lessonScore.worker.ts (121 行)                           │
│     └─ 课文评分计算 (跨课复用词)                              │
│        LessonCard memo + 不传 onClick                        │
└─────────────────────────────────────────────────────────────┘
```

**关键点**:
- 3 个 Worker 全部跑在独立线程, 主线程不卡 (跟读评分 / FSRS 复习 / 课文评分 都有重计算)
- 测试用 MockWorker 真实派发 (W136 P0-3 修, 33 测试安全感是真的)
- `onerror` reject pending 后清 worker (`workerInstance.terminate(); workerInstance = null;`)
- Worker 单例 + pending map 跨测试 reset (`_resetFsrsWorkerForTest()`)

### pdfjs + llm-vendor chunk 图 (W127 + W135)

```
拆前 v2.1.12 (gzip):
┌────────────────────────────┐
│  main bundle: ~1.2MB       │
│  ├─ react (40KB)           │
│  ├─ react-dom (130KB)      │
│  ├─ react-router (30KB)    │
│  ├─ dexie (45KB)           │
│  ├─ zustand (4KB)          │
│  ├─ blueimp-md5 (3KB)      │
│  └─ pdfjs-dist (476KB)     │  ← 476KB 阻塞首屏!
└────────────────────────────┘

拆后 v2.1.19 (gzip, W135 进一步):
┌────────────────────────────┐
│  main bundle: ~600KB        │
│  ├─ react-vendor (54KB)    │  ← W135 进一步压
│  ├─ db-vendor (32KB)       │
│  ├─ llm-vendor (21KB)      │  ← W135 新增 (LLM 生态共用 mini-vendor)
│  ├─ state-vendor (4KB)     │
│  └─ md-vendor (3KB)        │
└────────────────────────────┘
       │
       │  PDF 阅读时才 import
       ▼
┌────────────────────────────┐
│  pdfjs chunk: 142KB (异步)   │  ← React.lazy 加载
└────────────────────────────┘
       │
       │  3 Worker chunks (W135)
       ▼
┌────────────────────────────┐
│  fsrs / followReadScore /   │
│  lessonScore worker chunks  │  ← 主线程不卡
└────────────────────────────┘

效果: 首屏省 6MB → 600KB (-90%), index 50KB → 34KB gzip (W136 删 syncManager)
```

**llm-vendor chunk 细节** (W135 + W136):
- 实际含 LLM 生态共用 mini-vendor (xpSystem / idbSync 等共享依赖)
- 不强拆, 文档说明 (W136 抗审查 P1-1 修)
- LLM 页面 (AIChat / WritePage) 切换秒开
- 21KB gzip / 56KB raw (W135 引入)

### IDB v8 表结构 (11 张)

```typescript
words           // 5,423 词主表
favorites       // 生词本
translationFavs // 释义收藏 (W85 新, [wordId+index] 复合 key)
writingErrors   // 写作错题 (write/chat/chinese)
dictationErrors // 听写/拼写/跟读错题 (v1.92 source: 'dictation'|'spelling'|'follow-read')
reviewQueue     // 复习队列 (FSRS)
vocabCache      // 词汇缓存
settings        // 用户设置
streak          // 连续学习
xp              // 经验值
notes           // 笔记
```

### 测试栈

- **Vitest 4** 单元测试 (**1633 测试** / 115 文件, v2.1.16 收官)
- **Playwright** e2e (23 spec, 128+ 测试)
  - W129 跨页 5 spec + W131 dark/pwa + W134 pdfjs + W135 pwa-update + W136 letter-index + W136 update-dismiss
- **自定义 verify-v*.mjs** 静态检查 (60 闭环, 8 个已修)
- **自定义 review-v*.py** P0/P1/P2 审查 (14 版本历史)
- **大 review 机制** (类似 v1.6 13 bug / v1.22 18 处 catch any / v1.36 3 处 / v1.40.1 2 处 / v1.45-1.58 verifier 找 12 处)
- **verifier 抗审查 (W87-W138)** — 2-3 独立 verifier sub-agent 并行, 找对抗性 bug (累计 28+ 次, 24+ P0 闭环)
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)

---

## 目录结构

```
src/
├── lib/                  # 50+ 库 (核心算法 + 抽象层)
│   ├── wordNetwork.ts    # 同义词/反义词/词根网络 (W71-W82)
│   ├── textbook.ts       # 课文核心 (W78-W82)
│   ├── dictation.ts      # 听写核心 (W81-W83)
│   ├── spelling.ts       # 拼写 LCS (W84)
│   ├── followRead.ts     # 跟读评分 (W86)
│   ├── errorReview.ts    # 错题复习 (W87, 队列模型)
│   ├── exportErrors.ts   # 错题导出 CSV (W86) [W128 委托 dataExport]
│   ├── dataExport.ts     # 统一数据导出 (W128, 782 行)
│   ├── idbSync.ts        # 跨 tab IDB 同步 (W128+W134, 411 行, 100ms + 5MB + 3 retry)
│   ├── fsrsWorkerClient.ts / followReadScoreWorkerClient.ts / lessonScoreWorkerClient.ts  # W135 Worker 客户端
│   ├── prefetch.ts       # 路由 hover 预取 + idle (W135, 195 行)
│   ├── db.ts             # IDB v8 schema
│   ├── tts.ts / stt.ts   # TTS/STT 抽象
│   ├── llm.ts            # LLM 抽象 (10 渠道)
│   ├── md.ts             # Markdown 解析
│   └── ...
├── workers/              # W135 Web Worker (3 个)
│   ├── fsrs.worker.ts           # FSRS 复习调度 (202 行)
│   ├── followReadScore.worker.ts # 跟读评分聚合 (103 行)
│   └── lessonScore.worker.ts     # 课文评分 (121 行)
├── pages/                # 37 页面
│   ├── WordList.tsx / WordDetail.tsx  # 单词 (WordList 字母索引 virtual 模式 W136)
│   ├── TextbookPage.tsx / LessonDetailPage.tsx  # 课文 (跟读评分集成, W136 LessonCard memo)
│   ├── DictationPage.tsx / SpellingPage.tsx  # 听写/拼写 (W126 UI 改造)
│   ├── ErrorReviewPage.tsx  # 错题复习 (W87 新)
│   ├── ErrorHistoryPage.tsx  # 错题历史 (W126 UI 改造, 437 行)
│   ├── ErrorsPage.tsx       # 改错本 (5 tab filter)
│   ├── Translate.tsx        # 翻译 (W132 UI 改造, 444 行)
│   ├── WritePage.tsx / AIChat.tsx  # 写作/AI (W123a-d v2)
│   ├── PronounceCustom.tsx  # 跟读自定义 (W126 UI 改造, 137 行)
│   └── ...
├── components/           # 37 组件
│   ├── TTSButton.tsx / PronunciationPractice.tsx
│   ├── Toast.tsx / Skeleton.tsx (5 出口) / OfflineBanner.tsx (W131) /
│   ├── Icon.tsx (20 个内联 SVG) /
│   ├── VirtualList.tsx (W135, 209 行, 字母锚点 W136) /
│   ├── UpdateToast.tsx (W135, 148 行, 24h dismiss W136) /
│   ├── ErrorBoundary.tsx (W136 emoji → SVG) /
│   ├── SynonymsButton.tsx / WordNetwork.tsx  # W132 UI 改造
│   └── ...
├── data/                 # 数据文件
│   ├── synonyms.ts (146) / synonyms-p3.ts (98)  # W71+W82 合并 244
│   ├── textbook.ts / textbook-p2.ts / textbook-p3.ts  # 20 篇
│   └── ...
├── store/                # Zustand store
└── types/                # TypeScript 类型

tests/                    # 115 文件, 1633 测试
├── w126-ui.test.ts       # 4 大页 UI 改造 (20 测试)
├── w127-perf-pwa.test.ts # pdfjs 拆 vendor + workbox (29 测试)
├── w128-data-export-sync.test.ts  # dataExport + idbSync (48 测试)
├── w132-review-fixes.test.ts  # W132 修 review 漏洞 (34 测试)
├── w133-synonyms-translation.test.ts  # W133 翻译/同义词 UI (27 测试)
├── w134-idb-sync.test.ts   # W134 idb 优化 (13 测试)
├── w135-runtime.test.ts    # W135 3 Worker + VirtualList (33 测试)
├── w135-pwa.test.ts        # W135 PWA (9 测试)
├── w136-runtime-fixes.test.ts  # W136 Runtime P0/P1 (≥20 测试)
└── ...
docs/                     # 文档
scripts/                  # 17+ 脚本 (内容补全 / 大 review)
public/data/words.json    # 5,423 词主数据
```

---

## 关键算法

### 听写 / 拼写 / 跟读评分 (统一)

```
scoreAnswer(answer, user):
  charScore (multiset 去空格)  = matched_chars / total_chars × 100
  wordScore (按词匹配)        = matched_words / total_words × 100
  final                     = charScore × 0.6 + wordScore × 0.4

grade: 95+ perfect / 70-94 good / 40-69 ok / 1-39 bad / 0 wrong
```

### 错题复习 (W87 队列模型)

```
answerInSession(session, userAnswer, peeked):
  card = session.remaining[0]
  session.remaining.shift()  // 弹出当前
  if (!correct || peeked):
    session.remaining.push(card)  // 错题留, 下次再出
  correct = (grade in [perfect, good])
```

### FSRS 间隔重复

```
next_review = now + stability × difficulty_factor
difficulty_factor = 0.8 if hard / 1.0 if ok / 1.3 if easy
```

### 跨 tab IDB 同步 (W128)

```
initIdbSync({ stores, onChange }):
  channel = new BroadcastChannel('english-app-idb-sync')
  channel.onmessage = (msg) => {
    if (msg.msgId === myMsgId) return  // 自身回环跳过
    if (msg.sourceTab === myTabId) return  // 自身回环跳过
    _receiving = true
    onChange(msg.store, msg.op, msg.key)  // 回调 UI setState
    _receiving = false
  }

notifyIdbWrite({ store, op, key }):
  if (_receiving) return  // 收到时不再广播 (防回环)
  debounce(200ms, () => {
    rateLimit(200ms, () => {
      channel.postMessage({
        msgId: nanoid(),
        sourceTab: getTabId(),
        store, op, key, ts: Date.now()
      })
    })
  })
```

### vendor chunk 拆 (W127 + W135 + W136)

```
vite.config.ts:
  build.rollupOptions.output.manualChunks = {
    'react-vendor': ['react', 'react-dom', 'react-router-dom'],  // 54KB gzip
    'db-vendor': ['dexie', 'dexie-react-hooks'],                 // 32KB gzip
    'llm-vendor': [...LLM 生态共用 mini-vendor...],               // 21KB gzip (W135 新)
    'state-vendor': ['zustand'],                                  // 4KB
    'md-vendor': ['blueimp-md5'],                                 // 3KB
    'pdfjs': ['pdfjs-dist']                                       // 142KB gzip 异步
  }
  build.rollupOptions.output.maximumFileSizeToCacheInBytes = 1MB  // W135 收紧
```

**workbox runtimeCaching 调优 (W135 + W136)**:
- 字体 (woff2/woff/ttf/eot) → CacheFirst 1 年 (60 entries) — 不变
- 词库 JSON (`/data/words.json`) → SWR 7 天 (通勤 10h 离线 OK) — W135 改 6h → W136 改回 7d
- 其他 data JSON → CacheFirst 7 天 (`data-misc-cache-v1`, 10 entries) — W136 拆 cache
- AI/LLM 响应 → SWR 1 天 — W135 改 (重复 query 秒回)
- 翻译 API → NetworkFirst — 翻译不能过期
- **W136 删**: `data:.*$` 规则 (0 业务命中) + `settings/profile.json` 规则 (0 业务命中, zustand 走 localStorage)

---

## 部署架构

```
main 分支        ← 代码 (460+ commit)
gh-pages 分支   ← dist/ 静态文件 (108 entries, ~1.45MB)

GitHub Pages CDN → https://lingoo12138.github.io/english-app/

PWA CacheFirst (30 天) + 字体 (1 年) + 词库 (7 天) + AI (1 天) + 翻译 (NetworkFirst):
  ├─ index.html / assets/* (precache, 108 entries / 1.45MB, 单文件 ≤ 1MB W135 收紧)
  ├─ 字体 (CacheFirst 1y, 60 entries)
  ├─ /data/words.json (StaleWhileRevalidate 7d, 3 entries, W136 改)
  ├─ /data/*.json 其他 (CacheFirst 7d, data-misc-cache-v1, 10 entries, W136 拆)
  ├─ AI/LLM 响应 (StaleWhileRevalidate 1d, W135 改)
  ├─ 翻译 API (NetworkFirst, 翻译不能过期)
  └─ SPA navigateFallback = /english-app/index.html

性能优化 (W127 + W135 + W136):
  ├─ pdfjs 拆 vendor (476KB → 142KB gzip 异步)
  ├─ llm-vendor 单独 chunk (21KB gzip, LLM 页面秒开)
  ├─ react-vendor 独立 (54KB gzip, W135 进一步压)
  ├─ 3 Web Worker (fsrs / followReadScore / lessonScore)
  ├─ 4 woff2 LCP 字体 preload (~80KB, 首屏文字不 FOUT)
  └─ 删 syncManager 死代码 (index 50KB → 34KB gzip)
```
