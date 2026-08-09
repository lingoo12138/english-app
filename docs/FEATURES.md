# ✨ 句刻 · 核心特性

> 详细版本变更请看 [CHANGELOG.md](./CHANGELOG.md) · 本页只描述"产品功能全貌"
>
> 最后更新: 2026-08-09 (v2.1.12)
>
> **English**: This page describes all product features as of v2.1.12. 5,423 words / 100% coverage (root/phrases/pos/examples/synonyms/antonyms). 8 activation features. 27 pages / 32 components / 50+ libs.

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

## 🎨 4 圆卡 Bento + Icon SVG 设计原则

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
- **跨 tab IDB 同步** (W128) —— BroadcastChannel + storage event fallback
- **数据导出整合** (W128) —— dataExport.ts 7 类别 + CSV/JSON/MD 转换 + `EXPORT_SCHEMA_VERSION = 2`

---

## 🎨 体验

- **8 主题** —— CSS 变量驱动, 0 延迟切换
- **4 字号** —— 弱视/老人/儿童自适应
- **2 语言** —— 中/英
- **3 步 onboarding** —— 首次启动
- **PWA 离线** —— 30 天 CacheFirst + SPA navigateFallback
- **iOS 安全区** —— viewport-fit=cover + safe-area CSS 变量
- **暗色模式 + 高对比度** (W125)

---

## 📦 累计数据 (截至 v2.1.12)

- **5,423 词 / 100% 全覆盖** ⭐ (词根/短语/pos/examples/同义词/反义词)
- **20 篇课文 / 244 同义词组 / 78 反义词**
- **8 大激活功能**: 听写 / 拼写 / 跟读 / 跟读评分 / 错题复习 / 错题历史 / 释义收藏 / AI 对话
- **1450 单元测试** / 100+ 文件
- **35+ 次大 review** (含 **18 verifier 抗审查**)
- **27 页面 / 32 组件 / 50+ 库 / 460+ commit**
- **123 release tag** / 19+ 周
- **0 P0 + 0 P1 业务**

---

## 📎 内部 anchor

- [8 大激活功能](#-8-大激活功能-w126-改造后) — 听写/拼写/跟读/跟读评分/错题复习/错题历史/释义收藏/AI 对话
- [4 圆卡 Bento + Icon SVG](#-4-圆卡-bento--icon-svg-设计原则) — 设计原则
- [场景对话](#-场景对话) — 5 场景 / 6 难度 / 8 角色
- [自定义场景](#-自定义场景-粘贴文本上传) — 文本/文件/PDF/拍照
- [触类旁通](#-触类旁通-w71-w82) — 244/78/词根
- [生词本 + 错题本](#-生词本--错题本) — 7 tag / 5 tab
- [学习日历 + 报告](#-学习日历--报告) — 月历/日报/XP
- [AI 全栈](#-ai-全栈) — 10 LLM / 8 TTS / 8 翻译
- [数据本地化](#-数据本地化) — 零云 / IDB / 跨 tab 同步
- [体验](#-体验) — 8 主题 / 4 字号 / PWA
