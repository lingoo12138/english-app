# ✨ 句刻 · 核心特性

> 详细版本变更请看 [CHANGELOG.md](./CHANGELOG.md) · 本页只描述"产品功能全貌"
>
> 最后更新: 2026-08-11 (v2.1.19)
>
> **English**: This page describes all product features as of v2.1.19. 5,423 words / 100% coverage (root/phrases/pos/examples/synonyms/antonyms). 8 activation features. 37 pages / 37 components / 50+ libs. 3 Web Workers (fsrs/followReadScore/lessonScore, W135).

---

## 📚 内容

- **5,423 高频词** —— 涵盖 CET-4 / 高考 / CET-6 / 考研 / 初中 / 高中 / 日常 7 个学段
- **100% 词根词缀** (1-9 字符子集) —— 看到词根,猜出意思
- **100% 短语** (5,423 词全覆盖) —— W92+W93 收官
- **100% pos + 100% examples** —— W94+W95 收官
- **98% 词有音标** —— 英音/美音任选
- **30 天每日一句** —— 每天一句能直接用上的英语
- **20 篇课文** (P1 5 + P2 7 + P3 8) —— 跨课复用 36 词, 100% 词汇命中
- **244 同义词组** (P1 146 + P3 98) —— 朗文/牛津/柯林斯源
- **78 反义词组** + 词根树 + 同源词

---

## 🎬 8 大激活功能 (W126 改造后)

> W126 把 4 大激活功能页 (跟读/听写/拼写/错题历史) UI 100% 改造, 设计统一: 0 emoji + Icon SVG + 3 圆按钮 + `.card card-interactive` + motion token + dark 兼容.
>
> **业务承诺**: 每个功能都是"想用英语的瞬间就能用上" —— 把英语嵌进真实生活场景里.

### 1. 🎧 听写 (Dictation)

- **路由**: `/dictation`
- **算法** (`src/lib/dictation.ts`):
  - 字符相似度 60% (multiset 频率图, 不重复字符吃亏)
  - 词命中率 40% (按词匹配)
  - 综合 5 档: perfect 95+ / good 70-94 / ok 40-69 / bad 1-39 / wrong 0
- **3 难度**: 1-3 字符 / 4-5 字符 / 6-7 字符
- **W126 UI 改造**: Bento 布局 + 大圆按钮 + 实时评分
- **截图**: [w126-desktop-dictation](../screenshots/w126-desktop-dictation.png)
- **测试**: +20 (`tests/w126-ui.test.ts`)

### 2. 🃏 拼写 / 单词卡 (Spelling)

- **路由**: `/spelling`
- **算法** (`src/lib/spelling.ts`):
  - LCS 字符级 diff, 区分 missing (目标有用户无) / wrong (位置对齐但字符错) / extra (用户多)
  - TTS 播放 + 键盘输入 + 即时反馈
- **3 难度**: 1-3 字符 / 4-5 字符 / 6-7 字符
- **W126 UI 改造**: 字符级 diff 高亮 (绿/红/黄三色区分 missing/wrong/extra)
- **截图**: [w126-desktop-spelling](../screenshots/w126-desktop-spelling.png)
- **测试**: +20 (`tests/w126-ui.test.ts`)

### 3. 🎤 跟读 (Pronounce Custom)

- **路由**: `/pronounce-custom?text=...`
- **算法** (`src/lib/followRead.ts`):
  - TTS 逐句朗读 (0.7/0.85/1/1.2x 倍速)
  - Web Speech API STT 录音
  - 字符 60% + 词 40% 综合评分 (跟听写算法对齐)
- **W126 UI 改造**: 跟读自定义页 (Header + 3 圆按钮 + 进度条)
- **截图**: [04-pronunciation](../screenshots/04-pronunciation.png) (通用 PronunciationPractice 组件)
- **测试**: +20 (`tests/w126-ui.test.ts`)

### 4. 🎤 跟读评分 (Follow-read Score, 课文)

- **路由**: `/textbook/:id`
- **算法** (`src/lib/followReadByLesson.ts` + `followReadScore.ts`):
  - 跨课复用词 掌握度计算
  - 跟读评分集成
  - 字符 60% + 词 40% 综合评分
- **W124 UI 改造**: LessonScorePage Bento 布局
- **截图**: [w124-desktop-lesson-score](../screenshots/w124-desktop-lesson-score.png)
- **测试**: 7 (`tests/w124-lesson-score.test.ts`)

### 5. 🔁 错题复习 (Error Review Flashcard)

- **路由**: `/errors/review`
- **算法** (`src/lib/errorReview.ts` + `errorReviewSession.ts`):
  - **队列模型**: `shift()` 弹出当前, 错题 `push(末尾)` 留
  - **答对** (perfect/good): 移出复习池
  - **答错**: 推回末尾, 下次再出 (Anki 风格)
  - **偷看**: 0 分 + 标 peeked (审计友好)
  - **字符 60% + 词 40%** 综合评分 (跟听写算法对齐)
- **W123b UI 改造**: Skeleton + Icon SVG
- **截图**: [w123b-errorreview-ui](../screenshots/15-abruptly-after.png)
- **测试**: 7 (`tests/w123b-errorreview-ui.test.ts`)

### 6. 📊 错题历史 (Error History)

- **路由**: `/errors/history`
- **数据**: `getAllWritingErrors` + `getAllDictationErrors` 合并 (5 tab filter: 写作/对话/听写/拼写/跟读)
- **统计** (`src/lib/errorHistory.ts` + `errorStats.ts`):
  - 4 大统计卡片 (总数 / 已复习 / 准确率 / 平均分)
  - 按 source 分组 (横条形图)
  - 3 排序 (按次数 / 按最近 / 按难度)
  - 过滤 (按日期 / 按类型 / 按单词)
  - 难度分布
- **W126 UI 改造**: 横向条形图 + 来源分组 + 难度分布
- **截图**: [w126-desktop-error-history](../screenshots/w126-desktop-error-history.png)
- **测试**: +20 (`tests/w126-ui.test.ts`)

### 7. ⭐ 释义收藏 (Translation Favorites)

- **路由**: `/favorites/translation`
- **数据**: IDB v8 `translationFavs` 表 ([wordId+index] 复合 key), 每条释义独立 ⭐/☆
- **功能** (`src/lib/translationFav*.ts`):
  - 每条释义独立收藏
  - 跨词搜索 (W101 v2.0.7)
  - 跨页面 (AIChat / WordDetail / WordList / TranslationPage)
- **截图**: (释义页)
- **测试**: 8+ (`tests/translation-fav.test.ts` + `translationFavCrossPage.test.ts` + `translationFavFilter.test.ts` + `translationFavList.test.ts` + `translationFavSearch.test.ts`)

### 8. 💬 AI 对话 v2 (AI Chat)

- **路由**: `/aichat`
- **功能**:
  - 17 角色模式 (11 单 + 3 多人 + 3 复盘)
  - folders (W123d v2.1.10) + reply + 快捷建议 (W123c v2.1.9)
  - 实时纠错 (8 错误类型)
  - 收藏 (W1-B)
  - STT 累积 input (MAX_INPUT=500 截断)
  - Skeleton 反馈层 + Icon SVG
- **W123d UI 改造**: AIChat v2 (folders + reply)
- **截图**: [w123d-desktop-aichat](../screenshots/w123d-desktop-aichat.png)
- **测试**: 6+7+7+7 = 27 (`tests/w123a-aichat-ui.test.ts` + `w123b-errorreview-ui.test.ts` + `w123c-aichat-quick-replies.test.ts` + `w123d-aichat-folders.test.ts`)

---

## 🎯 W126 — 8 大激活功能 UI 改造 (4 大页, 设计统一收官)

> **业务承诺**: 4 大激活功能页 (跟读/听写/拼写/错题历史) UI 100% 改造, 整站设计语言统一.

**4 大页改造**:
- **`PronounceCustom.tsx`** (60 → 137 行): 跟读自定义 — 顶部 Header + 3 圆按钮 (TTS 切句) + STT 录音 + 字符/词级评分
- **`DictationPage.tsx`** (399 → 474 行): 听写 — 字符相似度 60% (multiset) + 词命中率 40% + 5 档综合 + 3 难度
- **`SpellingPage.tsx`** (317 → 381 行): 拼写 — LCS 字符级 diff 高亮 (绿/红/黄区分 missing/wrong/extra) + 即时反馈
- **`ErrorHistoryPage.tsx`** (264 → 437 行): 错题历史 — 横向条形图 + 来源分组 (5 tab: 写作/对话/听写/拼写/跟读) + 难度分布 + 3 排序

**设计统一 6 件套**:
- **0 emoji**: 32 组件 + 4 页全用 Icon SVG (20 个内联: Home/Book/Video/Sparkles/Chat/Calendar/Edit/Headphones/BarChart/Settings/Star/Trophy/User/Share/FileText/Arrow/Waving/Refresh)
- **3 圆按钮**: 顶部居中标题 + `.btn-circle-primary/ghost` (上/下/确认)
- **`.card card-interactive`**: 柔浮阴影 (`var(--shadow-soft)`) + hover -translate-y-0.5 + `var(--shadow-hover)`
- **motion token**: `--t-fast 150ms / --t-base 250ms / --t-slow 400ms` + `--ease / --ease-spring` (0 framer-motion)
- **dark 模式兼容**: 8 主题 CSS 变量驱动, 0 延迟切换, 高对比度模式 (W125) 自动适配
- **bento 2x2**: 桌面 Bento Grid / 移动 1 列堆叠, 状态卡 `p-6 rounded-2xl`

**测试**: +20 单元测试 (`tests/w126-ui.test.ts`)

**截图**: [w126-desktop-dictation](../screenshots/w126-desktop-dictation.png) · [w126-desktop-spelling](../screenshots/w126-desktop-spelling.png) · [w126-desktop-error-history](../screenshots/w126-desktop-error-history.png)

---

## 🌐 W132 — 翻译/同义词/词根 UI 改造 (W126 风格延续)

> **业务承诺**: 翻译 + 同义词按钮 + 词根网络 3 页跟 W126 设计语言 100% 一致, 整站改版稿 4 件套收官.

**3 文件 跟 W126 风格一致** (0 emoji + Icon SVG + W123d 顶部 + W113 v2 card + 3 状态色 + motion + 暗色):
- **`src/pages/Translate.tsx`** (444 行):
  - W123d 3 圆按钮 (翻页/交换/清空) + 标题居中 + IconArrow (rotate-180)
  - W121 折叠 (`openGroups` + `localStorage` 持久化)
  - 0 emoji (替 IconShare / IconClose / IconRefresh / IconSparkles)
  - W123a sticky bottom + `safe-area-inset-bottom`
  - 3 状态色 (默认/成功/错误) + 数字 `font-mono tabular-nums`
  - 拷贝状态 1.5s 反馈
- **`src/components/SynonymsButton.tsx`** (218 行):
  - 0 emoji (替 IconRefresh / IconSparkles / IconClose / IconBookOpen)
  - `.card card-interactive` + 3 状态色
  - 大圆环 (W124 Bento 风格) + motion + 暗色
  - `aria-label` a11y
- **`src/components/WordNetwork.tsx`** (267 行):
  - 4 tab (同根/近义/反义/搭配)
  - 0 emoji (替 IconBookOpen / IconRefresh)
  - `role=tablist/tab/tabpanel` + `aria-selected`
  - 3 状态色 + 暗色 + 空态 Icon

**业务价值**:
- 翻译页支持 8 翻译 (Google / 百度 / DeepL / 腾讯 / OpenAI / Claude / 自定义 / 自定义端点)
- 同义词按钮: 词详情页 1 键查看 244 同义词组 (P1 146 + P3 98)
- 词根网络: 4 tab 切换, 触类旁通 (W71-W82) 集成入口

**测试**: +27 单元测试 (`tests/w133-synonyms-translation.test.ts`)

---

## ⚡ W136 — 字母索引 virtual 模式 + LCP 字体 preload + 删 syncManager

> **业务承诺**: W135 抗审查 7 P0 100% 闭环, 5,423 词主用例字母索引 work, LCP 字体真实 preload.

### 1. 字母索引 virtual 模式 (5,423 词主用例)

- **`src/components/VirtualList.tsx`**: 新增字母锚点 — 在 `renderItem` 检测每个 item 的首字母变化, 渲染 `<span id="letter-anchor-L" data-letter-anchor={L} />`
- **`src/pages/WordList.tsx`**:
  - `scrollToLetter`: 用 `document.getElementById('letter-anchor-L')?.scrollIntoView({ block: 'start' })`
  - `IntersectionObserver` 监听 `[data-letter-anchor]` 元素 (现在在 virtual 模式也有)
- **业务价值**: 5,423 词流畅滚动 + 字母索引秒跳 (W116 spring 动效保留)
- **e2e**: `e2e/w136-letter-index-virtual.spec.ts` 4/4 通过 (W137 修假阳性 + W138 修假阴性)

### 2. LCP 字体 preload 真实生效

- **`index.html` line 38-46**: 替换占位的 pwa-192 / manifest preload 为 4 个 woff2 真实 preload (~80KB):
  - `outfit-latin-400-normal-*.woff2`
  - `outfit-latin-500-normal-*.woff2`
  - `jetbrains-mono-latin-400-normal-*.woff2`
  - `jetbrains-mono-500-normal-*.woff2`
- 业务价值: 首屏文字不再 FOUT (Flash of Unstyled Text), LCP 时间显著下降
- 删冗余: pwa-192 / manifest preload + `crossorigin` on manifest

### 3. 删 syncManager 死代码 (W135 抗审查 P0)

- 删 `src/lib/syncManager.ts` (372 行) — 业务侧 0 调用, 3 个 P0 一次消解:
  - **P0 死代码**: `enqueueOfflineWrite` 0 业务侧调用
  - **P0 跨 tab 写无锁**: 双 tab 同时 flush 双倍 XP
  - **P0 SW sync handler 缺**: Background Sync 链路断
- **`src/main.tsx`**: 删 `initSyncManager()` + `registerSW` 调用
- 业务价值: 0 业务影响 (IDB 直写够用), index bundle 50KB → 34KB gzip (-32%)

### 4. 配套 W135 抗审查 P1 修复

- **UpdateToast 24h dismiss-until**: 用户点"稍后"后, 24h 内不弹 SW 更新 toast
  - `DISMISS_UNTIL_KEY = 'w136-update-dismiss-until'`
  - dismiss 时写 `Date.now() + 24 * 3600 * 1000`
- **词库缓存**: CacheFirst 6h → SWR 7d (通勤 10h 离线 OK)
- **PWA cache 拆**: 词库 `word-data-cache-v2` (3 entries) + 其他 data JSON `data-misc-cache-v1` (10 entries, 7d)
- **翻译 API**: 保持 NetworkFirst (翻译不能过期)

**测试**: +39 单元测试 (`tests/w136-runtime-fixes.test.ts` 等) + 2 e2e spec

---

## 🎨 4 圆卡 Bento + Icon SVG 设计原则 (W126 + W132 统一)

> W126 把 4 大激活功能页 (跟读/听写/拼写/错题历史) UI 100% 改造, W132 把翻译/同义词/词根 3 页跟 W126 风格一致, 整站设计语言统一: 0 emoji + Icon SVG + 3 圆按钮 + `.card card-interactive` + motion token + dark 兼容.

每页统一布局:

### 顶部 (Header)
- 居中标题 (主标题 + 副标题)
- 3 圆按钮 (上/下/确认), 圆按钮 = `.btn-circle .btn-circle-primary/.btn-circle-ghost`
- 主操作高亮 (品牌色 brand-500), 次操作 ghost

### 中部 (Content)
- 状态卡 (`.card card-interactive`):
  - 柔浮阴影: `box-shadow: var(--shadow-soft)`
  - hover: `transform: translateY(-2px); box-shadow: var(--shadow-hover)`
  - 圆角: `rounded-2xl` (16px)
  - 内边距: `p-6` (24px)
- Bento Grid (桌面 2x2 / 移动 1 列堆叠)

### 底部 (Footer)
- 次要操作 (左/右对齐)
- 进度条 (`.progress-thin` + `.progress-brand`)

### Icon (20 个内联 SVG)
`Home` `Book` `Video` `Sparkles` `Chat` `Calendar` `Edit` `Headphones` `BarChart` `Settings` `Star` `Trophy` `User` `Share` `FileText` `Arrow` `Waving` `Refresh` `Plus` `Check`

- **0 依赖** (纯内联 SVG, 跟改版稿一致)
- **0 emoji** (32 组件全替)
- 0 framer-motion (CSS transition)

### Motion Token
```css
--t-fast: 150ms;     /* hover, focus */
--t-base: 250ms;     /* 默认 transition */
--t-slow: 400ms;     /* 页面切换, drawer */
--ease: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Dark 模式
- 8 主题 CSS 变量驱动
- 0 延迟切换
- 高对比度模式 (a11y, W125)
- 自动适配激活页

---

## 🗣️ 场景对话

- **5 个真实场景专题课** —— 餐厅点餐 / 问路 / 购物 / 办公职场 / 自我介绍
- **5 个听力专题** —— 数字 / 机场 / 酒店 / 餐厅 / 商务
- **6 个难度等级 (A1-C2)** —— 自适应
- **8 个 AI 角色** (面试官/咖啡师/前台/导游/服务员/医生/银行柜员/警察)
- **17 角色模式** (11 单 + 3 多人 + 3 复盘)

---

## 📝 自定义场景 (粘贴文本/上传)

- **文本输入** —— 粘贴任何英文文本
- **文件上传** (.txt / .md / **PDF** 懒加载 pdfjs)
  - **W127 优化**: pdfjs 拆 vendor (476KB → 142KB gzip 异步, 省首屏 6MB)
- **拍照识物** —— 7 场景 prompt 池 (general/office/food/animal/plant/furniture/tool)
- **AI 提取生词** —— LLM 提取 + 卡片流 + 入复习队列

---

## 🔗 触类旁通 (W71-W82)

- **同义词网络** —— 244 同义词组 (P1+P3 合并)
- **反义词网络** —— 78 反义词组
- **词根树 + 同源词** —— 100% 词根覆盖 (1-9 字符)
- **填空题** —— 5 题型 (同义词/反义词/词根/搭配/释义), 字符相似度匹配

---

## ⭐ 生词本 + 错题本

- **7 类启发式标签** —— 启发式自动归类 + 自定义 tag
- **复习按 tag 过滤** —— 1 键过滤
- **一键入复习/导出 CSV** —— 批量操作
- **错题合并** (W85-W87) —— 写作 + 听写 + 拼写 + 跟读 5 tab filter
- **错题导出 CSV** (W86) —— BOM UTF-8 (Excel 中文兼容)
- **错题复习** (W87) —— Flashcard 模式, 队列模型

---

## 📊 学习日历 + 报告

- **月历热力图** —— 学习密度可视化
- **日报/周报** —— 进度 + 错题分析 + 改进建议
- **10 XP 等级 + 7 streak 里程碑** —— 成就系统
- **17 角色模式 + 20 成就**

---

## 🤖 AI 全栈

- **10 LLM** (含 OpenRouter free) —— OpenAI / Claude / DeepSeek / 通义千问 / 文心 / 智谱 / OpenRouter / 自定义
- **8 TTS** (4 口音: 美音/英音/澳音/印音) —— 浏览器 / Edge / Azure / ElevenLabs / 百度 / Google / 讯飞 / 自定义
- **8 翻译** —— Google / 百度 / DeepL / 腾讯 / OpenAI / Claude / 自定义 / 自定义端点
- **3 自定义端点** —— OpenAI 兼容协议

---

## 💎 数据本地化

- **零云端** —— 100% 浏览器本地
- **IndexedDB v8** —— 11 张表 (words/favorites/translationFavs/dictationErrors/...)
- **离线优先** —— 离线完整可用 (PWA 30 天 CacheFirst)
- **跨 tab IDB 同步** (W128+W134) —— BroadcastChannel + storage event fallback + 100ms debounce + 5MB cap + 3 retry 指数退避 + 端口化 channel
- **数据导出整合** (W128) —— dataExport.ts 7 类别 + CSV/JSON/MD 转换 + `EXPORT_SCHEMA_VERSION = 2`

---

## 🎨 体验

- **8 主题** —— CSS 变量驱动, 0 延迟切换
- **4 字号** —— 弱视/老人/儿童自适应
- **2 语言** —— 中/英
- **3 步 onboarding** —— 首次启动
- **PWA 离线** —— 108 precache / 1.45MB (W136 调优) + SPA navigateFallback
- **iOS 安全区** —— viewport-fit=cover + safe-area CSS 变量 + 7 PWA icon + 7 splash (W131)
- **暗色模式 + 高对比度** (W125 + W131 全局强化)
- **OfflineBanner** (W131) —— 顶部琥珀色 "当前离线 · 仍可使用已缓存的词库与练习"
- **LCP 字体 preload** (W136) —— 4 个 woff2, ~80KB, 首屏文字不 FOUT
- **UpdateToast 24h 免打扰** (W136) —— SW 更新后, 用户点"稍后" 24h 内不弹
- **跨页 a11y** (W131) —— Skip link + aria-label + aria-expanded + 移动 input 16px

---

## 📦 累计数据 (截至 v2.1.19)

- **5,423 词 / 100% 全覆盖** ⭐ (词根/短语/pos/examples/同义词/反义词)
- **20 篇课文 / 244 同义词组 / 78 反义词**
- **8 大激活功能**: 听写 / 拼写 / 跟读 / 跟读评分 / 错题复习 / 错题历史 / 释义收藏 / AI 对话
- **1633 单元测试** / 115 文件 (v1.85 805 → v2.0.9 1120 → v2.1.7 1232 → v2.1.13 1478 → v2.1.14 1552 → v2.1.16 1633)
- **35+ 次大 review** (含 **28+ verifier 抗审查**, W87-W138)
- **37 页面 / 37 组件 / 50+ 库 / 460+ commit**
- **3 Web Worker** (fsrs/followReadScore/lessonScore, W135 引入)
- **128+ release tag** / 21+ 周
- **0 P0 + 0 P1 业务** 维持 200+ 轮

---

## 📎 内部 anchor

- [8 大激活功能](#-8-大激活功能-w126-改造后) — 听写/拼写/跟读/跟读评分/错题复习/错题历史/释义收藏/AI 对话
- [W126 8 大激活 UI 改造](#-w126--8-大激活功能-ui-改造-4-大页-设计统一收官) — 4 大页 UI 100% 改造
- [W132 翻译/同义词/词根 UI](#-w132--翻译同义词词根-ui-改造-w126-风格延续) — 设计语言延续
- [W136 字母索引 virtual + LCP + 删 syncManager](#-w136--字母索引-virtual-模式--lcp-字体-preload--删-syncmanager) — 抗审查 7 P0 闭环
- [4 圆卡 Bento + Icon SVG](#-4-圆卡-bento--icon-svg-设计原则-w126--w132-统一) — 设计原则
- [场景对话](#-场景对话) — 5 场景 / 6 难度 / 8 角色
- [自定义场景](#-自定义场景-粘贴文本上传) — 文本/文件/PDF/拍照
- [触类旁通](#-触类旁通-w71-w82) — 244/78/词根
- [生词本 + 错题本](#-生词本--错题本) — 7 tag / 5 tab
- [学习日历 + 报告](#-学习日历--报告) — 月历/日报/XP
- [AI 全栈](#-ai-全栈) — 10 LLM / 8 TTS / 8 翻译
- [数据本地化](#-数据本地化) — 零云 / IDB / 跨 tab 同步
- [体验](#-体验) — 8 主题 / 4 字号 / PWA / OfflineBanner / LCP preload
