# 🏗️ 技术架构

> v2.1.12 快照 · 详情见 [CHANGELOG.md](./CHANGELOG.md)
>
> **English**: Architecture as of v2.1.12. Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3. PWA offline. IndexedDB v8 (11 tables, zero cloud). pdfjs split into vendor chunk (476KB → 142KB gzip async). Cross-tab IDB sync (BroadcastChannel + storage fallback). 50+ libs / 27 pages / 32 components.

---

## 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst + SPA navigateFallback)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB v8 本地存储 (11 张表, 零云)
├─ AI 抽象层: 10 LLM / 8 TTS / 8 翻译 (统一接口 + 自动降级)
├─ 学习算法: FSRS 间隔重复 + 字符相似度 (multiset) + LCS diff
├─ 跟读 STT: Web Speech API (浏览器原生) + 评分算法
├─ 性能: pdfjs 拆 vendor (476KB → 142KB gzip 异步)
├─ 跨 tab: BroadcastChannel + storage event fallback (idbSync.ts)
└─ 数据导出: dataExport.ts 统一 7 类别 + CSV/JSON/MD 转换
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

### pdfjs vendor chunk 图 (W127)

```
拆前 (gzip):
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

拆后 (gzip):
┌────────────────────────────┐
│  main bundle: ~600KB        │
│  ├─ react-vendor (165KB)   │  ← 独立 chunk
│  ├─ db-vendor (52KB)       │  ← 独立 chunk
│  ├─ state-vendor (4KB)     │  ← 独立 chunk
│  └─ md-vendor (3KB)        │  ← 独立 chunk
└────────────────────────────┘
       │
       │  PDF 阅读时才 import
       ▼
┌────────────────────────────┐
│  pdfjs chunk: 142KB (异步)   │  ← React.lazy 加载
└────────────────────────────┘

效果: 首屏省 6MB → 600KB (-90%)
```

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

- **Vitest 4** 单元测试 (**1478 测试** / 100+ 文件)
- **Playwright** e2e (19 spec, 60+ 测试)
- **自定义 verify-v*.mjs** 静态检查 (60 闭环, 8 个已修)
- **自定义 review-v*.py** P0/P1/P2 审查 (14 版本历史)
- **大 review 机制** (类似 v1.6 13 bug / v1.22 18 处 catch any / v1.36 3 处 / v1.40.1 2 处 / v1.45-1.58 verifier 找 12 处)
- **verifier 抗审查 (W87+)** — 2-3 独立 verifier sub-agent 并行, 找对抗性 bug (W87 找 4 P0 + 12 P1)
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
│   ├── idbSync.ts        # 跨 tab IDB 同步 (W128, 300 行)
│   ├── db.ts             # IDB v8 schema
│   ├── tts.ts / stt.ts   # TTS/STT 抽象
│   ├── llm.ts            # LLM 抽象 (10 渠道)
│   ├── md.ts             # Markdown 解析
│   └── ...
├── pages/                # 37 页面
│   ├── WordList.tsx / WordDetail.tsx  # 单词
│   ├── TextbookPage.tsx / LessonDetailPage.tsx  # 课文 (跟读评分集成)
│   ├── DictationPage.tsx / SpellingPage.tsx  # 听写/拼写 (W126 UI 改造)
│   ├── ErrorReviewPage.tsx  # 错题复习 (W87 新)
│   ├── ErrorHistoryPage.tsx  # 错题历史 (W126 UI 改造, 437 行)
│   ├── ErrorsPage.tsx       # 改错本 (5 tab filter)
│   ├── WritePage.tsx / AIChat.tsx  # 写作/AI (W123a-d v2)
│   ├── PronounceCustom.tsx  # 跟读自定义 (W126 UI 改造, 137 行)
│   └── ...
├── components/           # 37 组件
│   ├── TTSButton.tsx / PronunciationPractice.tsx
│   ├── Toast.tsx / Skeleton.tsx (5 出口) /
│   ├── Icon.tsx (20 个内联 SVG) /
│   └── ...
├── data/                 # 数据文件
│   ├── synonyms.ts (146) / synonyms-p3.ts (98)  # W71+W82 合并 244
│   ├── textbook.ts / textbook-p2.ts / textbook-p3.ts  # 20 篇
│   └── ...
├── store/                # Zustand store
└── types/                # TypeScript 类型

tests/                    # 100+ 文件, 1478 测试
├── w126-ui.test.ts       # 4 大页 UI 改造 (20 测试)
├── w127-perf-pwa.test.ts # pdfjs 拆 vendor + workbox (29 测试)
├── w128-data-export-sync.test.ts  # dataExport + idbSync (48 测试)
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

### vendor chunk 拆 (W127)

```
vite.config.ts:
  build.rollupOptions.output.manualChunks = {
    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
    'db-vendor': ['dexie', 'dexie-react-hooks'],
    'state-vendor': ['zustand'],
    'md-vendor': ['blueimp-md5'],
    'pdfjs': ['pdfjs-dist']  // 异步 import
  }
```

---

## 部署架构

```
main 分支        ← 代码 (460+ commit)
gh-pages 分支   ← dist/ 静态文件 (91 entries, ~2.4MB)

GitHub Pages CDN → https://lingoo12138.github.io/english-app/

PWA CacheFirst (30 天) + 字体 (1 年) + 词库 (7 天):
  ├─ index.html / assets/* (precache, 91 entries / 2.2MB)
  ├─ 字体 (CacheFirst 1y, 60 entries)
  ├─ /data/words.json (StaleWhileRevalidate 7d, 5 entries)
  └─ SPA navigateFallback = /english-app/index.html

性能优化 (W127):
  ├─ pdfjs 拆 vendor (476KB → 142KB gzip 异步)
  ├─ react-vendor 独立 (165KB)
  └─ 首屏省 6MB (-90%)
```
