# v1.85.0 课文 (Textbook) Review — Verifier F 独立对抗性 review

**日期**: 2026-07-31 (W76, 第 18 次大 review — 独立 verifier F)
**范围**: v1.85-B 课文模块 (`src/lib/textbook.ts` + `src/data/textbook.ts` + `src/pages/TextbookPage.tsx` + `src/pages/LessonDetailPage.tsx`)
**方法**: 独立执行检查 (不读 producer 总结), 重新抽样验证每个声明, 9 维度全扫 + 内容质量 + UX + 路由
**测试基线**: 805 单元测试全过 (含 20 个 textbook.test.ts) / tsc --noEmit 0 错误 / `npm run build` 12.47s ✓

---

## TL;DR

| # | 严重度 | 位置 | 简述 |
|---|--------|------|------|
| **P1-1** | **P1 内容** | `src/data/textbook.ts` 5 篇 | **跨课复用率不达标**: 只有 2 个词 (`family` ×3, `friend` ×2) 出现在 ≥2 课的词汇表, 规格要 5-10 个 (触类旁通 + 复习) |
| **P1-2** | **P1 内容** | `src/data/textbook.ts` 4 课 body | **6 个词汇在正文中不命中 (高亮失效)**: `report/document/task` (L2 复数), `family` (L3 缺失), `amaze/peace` (L4 派生形), `message/photo/tool` (L5 复数) — 用户点不到释义, 学习闭环断 |
| **P1-3** | **P1 内容** | `src/data/textbook.ts:66` | **Lesson 3 vocab 含 `family` 但 body 完全不出现** — 词条与正文无任何关联, 凭空挂的词 |
| P2-1 | P2 死代码 | `src/pages/LessonDetailPage.tsx:3` | `useRef` 导入但从未使用 — 历史 `textbook:updated` cleanup 改用 `useEffect(()=>()=>)` 后残留 |
| P2-2 | P2 i18n | `src/lib/i18n.ts` 缺 11+ key | textbook 0 字典条目, zh/en 切换不会翻译 (全模块唯一纯中文硬编码) |
| P2-3 | P2 移动 UX | `src/pages/LessonDetailPage.tsx:164` | 进度条 `sticky top-0 z-10` 与 Layout `<header sticky top-0 z-10>` 移动端同位叠加, 进度条会盖在 header 上 |
| P2-4 | P2 fire-and-forget | `src/pages/TextbookPage.tsx:17, 22` | `getLearnedLessonIds().then(...)` 无 `.catch` (2 处), 失败静默不暴露 |
| P2-5 | P2 console | `src/pages/LessonDetailPage.tsx:67, 110` | 2 处 `console.error` 无 DEV 守卫 (v1.78 大 review 要求生产环境 console 全静默) |
| P2-6 | P2 移动 UX | `src/pages/LessonDetailPage.tsx:208-244` | tooltip 只能点词自身或 ✕ 关闭, 无 click-outside 监听, 移动端关闭不便 |
| P2-7 | P2 setLoading | `src/pages/LessonDetailPage.tsx:48-69` | 加载逻辑用 if/then/catch 三处分别 setLoading(false), 无 `finally` — 已被 cancelled flag 兜住, 但 P2 风格债 |
| P2-8 | P2 教学一致 | `src/data/textbook.ts:43, 60, 91` | lesson `level` 与词条 `level` 部分错位: L3(`primary`) 词表有 `price` (`gaozhong`); L4(`junior`) 有 `amaze/wonderful` (`gaozhong`/`daily`); L5(`cet4`) 有 `web` (`primary`)/`internet` (`cet6`) |
| P3-1 | P3 | `src/data/textbook.ts:74, 81, 97` | Lesson 4 末句 "I am glad to be alive" 语法上 OK 但风格稍弱; Lesson 1 中 `wonderful` 出现 2 次 (vocab 含) — 词汇堆叠感 |

---

## 一、代码 review (9 维度)

### 1.1 catch any / 空 catch — PASS ✓

- `src/lib/textbook.ts`: 0 try/catch (业务层不直接 catch, 让调用方处理) — ✓
- `src/pages/TextbookPage.tsx`: 0 try/catch — ✓
- `src/pages/LessonDetailPage.tsx:97-114`: 1 处 try/catch (toggleLearned), `} catch (e) { console.error(...); toast.error(...) }` **有 console.error + toast**, 非空 catch — ✓

**判断**: 全部正确, 无空 catch, 无 `catch (e: any)` 兜底。

### 1.2 fire-and-forget — **FAIL P2-4**

| 文件 | 行 | 代码 | 风险 |
|------|----|----|------|
| `TextbookPage.tsx` | 17 | `getLearnedLessonIds().then(ids => { if (!cancelled) setLearned(ids) })` | 无 `.catch`, IDB 故障时 unhandled rejection |
| `TextbookPage.tsx` | 22 | `getLearnedLessonIds().then(ids => { ... })` (textbook:updated handler) | 同上, 2 处 |
| `LessonDetailPage.tsx` | 65 | `.catch(e => { ... })` ✓ | **有 catch, 通过** |

**修复建议**:
```ts
// TextbookPage.tsx L17
getLearnedLessonIds().then(ids => {
  if (!cancelled) setLearned(ids)
}).catch(e => console.warn('TextbookPage 加载已学状态失败', e))

// L22 handler 同上
```

### 1.3 setLoading 缺 finally — P2-7 (已 mitigated)

```ts
// LessonDetailPage.tsx:48-69
setLoading(true)                        // line 48
setVocabWords([])
setLearned(false)
setProgress(0)
if (!lesson) {
  setLoading(false)                     // path 1
  return
}
let cancelled = false
Promise.all([...]).then(...).catch(e => {
  if (cancelled) return
  console.error('LessonDetailPage 加载失败', e)
  setLoading(false)                     // path 2
})
```

**问题**: 三处 setLoading(false) 显式调用, 无 `finally` 包裹。理论上如果 `setVocabWords` 抛错会被 catch 覆盖; 但若 `lesson` 为 null 走 `return` 路径则 setLoading(false) 不会被某些浏览器 race-condition 触发 (实际 React batching 会处理)。

**实际表现**: 由于 `cancelled` flag 在 cleanup 时设 true, 老 async chain 不会更新新组件, **loading 状态实际正确**。但代码结构欠防御。

**修复建议**: 用 `finally { setLoading(false) }` 替代两处显式 setLoading(false):
```ts
Promise.all([...])
  .then(([words, isL]) => {
    if (cancelled) return
    setVocabWords(words)
    setLearned(isL)
  })
  .catch(e => { if (!cancelled) console.error('...', e) })
  .finally(() => { if (!cancelled) setLoading(false) })
```

### 1.4 as any — PASS ✓ (0 处)

```
src/lib/textbook.ts → 0
src/pages/TextbookPage.tsx → 0
src/pages/LessonDetailPage.tsx → 0
```

**判断**: 完全无 `as any`, 类型安全。

### 1.5 console — **FAIL P2-5**

| 文件 | 行 | 代码 |
|------|----|----|
| `LessonDetailPage.tsx` | 67 | `console.error('LessonDetailPage 加载失败', e)` |
| `LessonDetailPage.tsx` | 110 | `console.error('切换已学状态失败', e)` |

**对比 v1.78 大 review 决策**:
> 4 处 console 全清, 生产环境 console 完全静默

**修复建议**:
```ts
if (import.meta.env.DEV) console.error('LessonDetailPage 加载失败', e)
```

### 1.6 i18n — **FAIL P2-2**

`src/lib/i18n.ts` 中 grep `'textbook'` → **0 条**。
对比同 release 的 CardReview (26 key) / ReportsPage (3 key) / Home (4 key) / FillBlankPage (17 key)。

| 页面 | useTranslate 引用 | 字典 key |
|------|----------------|---------|
| CardReview | 44 | 26 |
| Home | 16 | 4+ |
| FillBlankPage | 17 | - |
| TextbookPage | **4** (仍硬编码) | **0** |
| LessonDetailPage | **5** (仍硬编码) | **0** |

**严重度判断**: 整 app 用户切到英文后, textbook 模块仍全部中文 — 不一致。**P2 而非 P1**: 因为 v1.41 i18n 引入时, textbook 模块尚未存在, 本 release 是首批缺失, 既往 release 也有类似 P2 历史。

**修复建议**: 加 11+ key:
```
'textbook.title' / 'textbook.subtitle' / 'textbook.howto_title' / 'textbook.howto_desc'
'textbook.learned_badge' / 'textbook.back_list' / 'textbook.mark_learned' / 'textbook.unmark_learned'
'lesson.vocab_title' / 'lesson.empty_vocab' / 'lesson.tip_title' / 'lesson.tip_desc'
'lesson.mark_success' / 'lesson.unmark_success' / 'lesson.op_failed' / 'lesson.not_found'
'lesson.progress_label' / 'lesson.tts_hint' / 'lesson.tap_to_dismiss'
```

### 1.7 死代码 — **FAIL P2-1**

`src/pages/LessonDetailPage.tsx:3`:
```ts
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
```

`useRef` 全文件 grep 仅出现 1 次 (导入行), **从未使用**。是 v1.85-B 早期实现时计划用 ref 存 hover 状态, 改用 `hoveredRange` state 后残留。

**修复建议**:
```ts
import { useState, useEffect, useMemo, useCallback } from 'react'
```

### 1.8 历史修复回归 — PASS ✓ (6 个关键修复全部健在)

| 修复 | 来源 | 当前状态 |
|------|------|---------|
| v1.45 cardreview 26 i18n keys | verifier1 | ✓ 健在 |
| v1.48 addXP 静态 import (避免 fire-and-forget) | verifier3 | ✓ 健在 |
| v1.51 db.ts:251 `await addXP(...)` | verifier4 | ✓ 健在 (`textbook.ts:109-115` 走 addFavorite 同路径) |
| v1.78 console 全清 (4 处) | 大 review | **回归** (P2-5, 2 处 console 漏掉) |
| v1.55 i18n 25 pages | 大 review | **回归** (P2-2, textbook 0 key) |
| v1.52 dynamic import 健在 | 大 review | ✓ 健在 (textbook 走 `lazy(() => import('./pages/TextbookPage'))`) |

### 1.9 9 维度小结

| 维度 | 状态 | 备注 |
|------|------|------|
| catch any | ✓ | 1 处有, 0 空 catch |
| 空 catch | ✓ | 0 |
| fire-and-forget | ✗ P2-4 | 2 处 TextbookPage |
| setLoading finally | △ P2-7 | cancelled flag 兜住, 但 P2 风格债 |
| as any | ✓ | 0 处 |
| console | ✗ P2-5 | 2 处无 DEV 守卫 |
| i18n | ✗ P2-2 | 0 key, 整模块中文硬编码 |
| 死代码 | ✗ P2-1 | useRef unused import |
| 历史修复 | △ 2 回归 | console / i18n 漏 |

---

## 二、内容质量 (核心审查)

### 2.1 词数: 80-150 词, 不超 200 词 — **PASS ✓**

| 课 | 词数 | 状态 |
|----|------|------|
| L1 travel-airport | 110 | ✓ (80-150) |
| L2 work-meeting | 120 | ✓ |
| L3 daily-shopping | 111 | ✓ |
| L4 emotion-feelings | 102 | ✓ |
| L5 tech-smartphone | 111 | ✓ |
| **5 篇平均** | **110.8** | ✓ |

源码注释要求 "80-150 词", 全部合格, 无超 200。

### 2.2 词汇表词都在 words.json — **PASS ✓**

`public/data/words.json` 共 **5,423 词** (确认规格数字)。

独立抽样 50 个词汇 (5 课 × 10), **全部命中** (0 缺失):
```
travel-airport → 0 missing
work-meeting → 0 missing
daily-shopping → 0 missing
emotion-feelings → 0 missing
tech-smartphone → 0 missing
```

### 2.3 跨课词汇复用率 (触类旁通 + 复习) — **FAIL P1-1**

规格要求: 5 篇复用 5-10 个学过的词 (跨 ≥2 课出现)。

**实际数据**:
```
Total unique vocab across 5 lessons: 47
Reused across lessons: 2
  - family  in 3 lessons (1, 3, 5)
  - friend  in 2 lessons (3, 4)
```

**5-10 vs 2** — **差距 60-80%**。规格未达。

**为什么会这样**: 5 课主题差异大 (旅行/工作/生活/情感/科技), 词汇选取没刻意做交集。

**修复建议** (优先级最高, 因为这是规格核心):
- 选定 5-7 个 "生活高频词" 作为公共词, 强行塞进 ≥2 课正文 (例: `time`, `day`, `home`, `work`, `feel`, `good`, `think`, `make`)
- 例: 在 L1 加 "We had a **good** time", L2 加 "I always **feel good** when **work** is done"

### 2.4 词汇在正文中的高亮命中 — **FAIL P1-2 / P1-3**

**核心问题**: 词汇表里的词应该在正文中高亮可点。独立执行 `findVocabInBody` 逻辑, 统计每课 vocab 在 body 中至少 1 次高亮命中的比例:

| 课 | vocab | 命中 | 缺失词 | 原因 |
|----|------|------|--------|------|
| L1 travel-airport | 10 | **10 / 10** | — | 100% ✓ |
| L2 work-meeting | 10 | 7 / 10 | `report, document, task` | body 用 `reports/documents/tasks` 复数, vocab 是单数 |
| L3 daily-shopping | 10 | 9 / 10 | `family` | body **完全没有** family 这个词 (P1-3 单独 flag) |
| L4 emotion-feelings | 10 | 8 / 10 | `amaze, peace` | body 用 `amazed!` / `peaceful`, vocab 是 base 形 |
| L5 tech-smartphone | 10 | 7 / 10 | `message, photo, tool` | body 用 `messages/photos/tools` 复数 |

**总计**: 6 / 50 = 12% 词条 "挂空挡"。

**业务影响**:
- 用户读完 L2 看到 "reports" 不知道是不是 vocab 里的 `report` — 高亮不亮, 不点击
- 教学闭环断 (高亮 → 点词 → 看释义 → 加生词本)
- 这是 v1.85-B 课文模块的 **核心功能**: "在真实语境中学词汇", 12% 失效 = 12% 词汇不达预期

**修复建议** (按优先级):
1. **改 body 用单数** (最简单):
   - L2: `reports` → `a report`, `documents` → `a document`, `tasks` → `my task`
   - L5: `messages` → `a message`, `photos` → `a photo`, `tools` → `a tool`
2. **改 vocab 用复数/派生形** (更自然):
   - L4: `amaze` → `amazed`, `peace` → `peaceful`
3. **L3 删 vocab 的 `family`** (因 body 完全没出现) — 或在 body 加一句
4. **算法侧** (可选): `findVocabInBody` 加常见后缀容忍 (`-s`, `-ed`, `-ing`, `-ful`), 避免语法变体失效
   - 风险: 可能误匹配 (e.g. "work" + "s" 不会撞词, 但 "task" + "s" 也不应乱匹配)
   - 建议: 维护一个白名单或用 stems

### 2.5 语法 / 拼写 / 标点 抽样 — **PASS ✓**

5 篇全部通读, 无以下问题:
- 拼写错误: 0
- 主谓一致错误: 0
- 时态错乱: 0 (L1 全过去时, L2/3/4/5 全现在时 — 风格统一)
- 标点错误: 0
- 冠词错误: 0 (L1 "a trip" / "a small hotel" / "a wonderful view" / "a box of tea" — 全部正确)
- 大小写错误: 0 (句首大写, 专有名词正确)

**小瑕疵** (P3-1, 不修):
- L1 "wonderful" 出现 2 次 (vocab + 2 次 in body) — 略重复, 但仍在 80-150 词内
- L4 "I am glad to be alive" — 句意 OK, 略文艺

### 2.6 内容质量小结

| 检查项 | 状态 |
|--------|------|
| 词数 80-150 | ✓ |
| 词数 ≤200 | ✓ (max 120) |
| 词汇在 words.json | ✓ (50/50) |
| 跨课复用 5-10 | **✗ P1-1 (实际 2)** |
| 词汇在 body 高亮命中 | **✗ P1-2 (44/50, 6 失效)** |
| Lesson 3 family 词条 / body 一致 | **✗ P1-3** |
| 语法 / 拼写 / 标点 | ✓ |

---

## 三、UX review

### 3.1 列表页 (TextbookPage) — 大体通过, 1 个 P2

**5 张卡片** ✓ — `grid grid-cols-1 gap-3` 单列布局, 移动友好
**等级标签** ✓ — `LEVELS.find(l => l.value === lesson.level)` 5 课分别显示 初中/CET-4/小学/初中/CET-4, 颜色对应
**词汇数** ✓ — 实际从 words.json 命中数计算, 不只看 vocab.length
**已学 badge** ✓ — `✓ 已学` 绿底
**完读状态** ✓ — `toggleLearned` 写 IndexedDB, 通过 `textbook:updated` 事件跨页同步

**问题 P2-3 (移动端进度条覆盖 header)**:
- `LessonDetailPage.tsx:164` 进度条 `sticky top-0 z-10 bg-white/80 backdrop-blur -mx-4 px-4 py-2`
- `Layout.tsx:87` 移动 header `sticky top-0 z-10 ...`
- 两者同 z-10 同 top-0, 进度条在 main 内, 渲染顺序在后 → **进度条覆盖 header**
- 移动端滚到正文后, 顶部会出现进度条 + header 双层, header 标题被半透明覆盖

**修复建议**:
```tsx
// LessonDetailPage.tsx
<div className="sticky top-14 md:top-0 z-10 ...">  // top-14 让出 h-14 header
```

### 3.2 详情页 (LessonDetailPage) — 通过, 2 个 P2

**词汇高亮** ✓ — `bg-amber-100 dark:bg-amber-900/30 text-amber-800` 颜色对比可读
**Hover 释义** ✓ — 鼠标悬停显示中文 tooltip, 暗色模式适配
**Click 展开** ✓ — 点击固定底部 tooltip, 显示音标/翻译/查看详情
**进度条** ✓ — 1px 高顶部进度条, 含百分比
**完读按钮** ✓ — "✓ 已学" / "○ 标记为已学", 防双击 (`togglingLearned`)
**TTS 朗读** ✓ — 全文 TTS 按钮 + 词汇表逐词 TTS

**问题 P2-6 (无 click-outside 关闭)**:
- tooltip 只能点击同词自身 (toggle) 或 ✕ 关闭
- 移动端用户点完一个词看到 tooltip 后, 想看下一个词必须先 ✕, 流程割裂
- 桌面端勉强可接受 (因为有 hover 切换)

**修复建议**:
```tsx
useEffect(() => {
  if (!tooltipWord) return
  const onClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-vocab-token]') && !target.closest('[data-vocab-tooltip]')) {
      setTooltipWord(null)
    }
  }
  // 延迟绑定, 避免当前 click 立即触发
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
  return () => document.removeEventListener('click', onClickOutside)
}, [tooltipWord])
```

### 3.3 移动端体验 — 1 个 P2

- 5 张卡片堆叠 ✓ — `grid-cols-1`
- 词汇表两列 → 移动单列 ✓ — `grid-cols-1 sm:grid-cols-2`
- 进度条冲突 ✗ P2-3 (如上)
- 顶部返回按钮: 桌面 `hidden md:inline-flex`, 移动用 Layout 全局 header 返回 (✓)

### 3.4 dark mode — **PASS ✓**

抽样 dark: 前缀:
```
TextbookPage.tsx: 8 处 dark:
LessonDetailPage.tsx: 12 处 dark:
```

每个有 `text-stone-X` 的元素都配 `dark:text-stone-Y`, 卡片 / 进度条 / 高亮 / tooltip / 完读 badge 全覆盖。

### 3.5 UX 小结

| 检查项 | 状态 |
|--------|------|
| 5 张卡片列表 | ✓ |
| 词汇高亮 + 悬停释义 | ✓ |
| 进度条 (顶部) | ✓ |
| 点词跳转 / 详情 tooltip | ✓ |
| 完读状态 + 跨页同步 | ✓ |
| 移动端布局 | △ P2-3 进度条覆盖 header |
| 移动端 tooltip 关闭 | △ P2-6 无 click-outside |
| dark mode | ✓ |

---

## 四、路由 / 集成

### 4.1 路由配置 — **PASS ✓**

`src/App.tsx:155-156`:
```tsx
<Route path="textbook" element={<TextbookPage />} />
<Route path="textbook/:id" element={<LessonDetailPage />} />
```

- 两个路由都注册 ✓
- 用 `lazy(() => import('./pages/...'))` 代码分割 ✓ (3.0KB + 7.2KB bundle)
- 未知 id → `getLessonById()` 返 null → 显示 "课文不存在" + 返回按钮 ✓
- Layout nav 入口 (`Layout.tsx:20` 桌面, mobile 入口在 home 快捷区) ✓
- `getPageTitle` (`utils.ts:30-31`) → "课文" / "课文详情" — 移动 header 短标题正确 ✓

### 4.2 数据流 / IndexedDB — **PASS ✓**

- 复用 `favorites` 表 + `lesson:<id>` 前缀 — schema 不破坏 ✓
- `isFavorite` / `addFavorite` / `removeFavorite` / `getAllFavorites` — 全部复用现有 ✓
- 与 Home "收藏" 统计独立 (因为 `wordTags` 已经过滤合成 ID) — 但 `getTodayCount` 只算 view 真实 word, lesson 标已学不影响 today count ✓
- 跨页同步: `textbook:updated` CustomEvent — 简洁有效 ✓

### 4.3 路由 / 集成小结

| 检查项 | 状态 |
|--------|------|
| /textbook 注册 | ✓ |
| /textbook/:id 注册 | ✓ |
| 未知 id 兜底 | ✓ |
| 集成 favorites (复用表) | ✓ |
| 跨页状态同步 | ✓ |
| page title | ✓ |

---

## 五、构建 / 测试

- `npx tsc --noEmit` → 0 错误 ✓
- `npx vitest run` → 805/805 通过 ✓ (含 20 textbook.test.ts)
- `npm run build` → 12.47s, 64 entries precache 2332 KiB ✓
- dist bundle: textbook-5.5KB / TextbookPage-3.0KB / LessonDetailPage-7.2KB — 体积合理 ✓

---

## 六、修复优先级建议

### 🔴 必须修 (P1, 阻塞 release)

1. **P1-1 跨课复用率**: 选 5-7 个公共词塞进 ≥2 课 body (例: `time/day/home/work/think/good`)
2. **P1-2 高亮失效**: 改 body 用 vocab 单数 (L2 改 report/document/task, L5 改 message/photo/tool)
3. **P1-3 L3 family 凭空**: 删 vocab family 或加到 body

### 🟡 强烈建议修 (P2, 不阻塞但 v1.85.0 应该有)

4. **P2-1 useRef 死代码**: 删 import
5. **P2-3 进度条覆盖 header**: `top-14 md:top-0`
6. **P2-4 fire-and-forget**: 2 处加 `.catch`
7. **P2-5 console 守卫**: 2 处加 `import.meta.env.DEV &&`

### 🟢 可延后 (P3 / 风格债)

8. P2-2 i18n (整 app i18n 计划性, 本次不强求)
9. P2-6 click-outside tooltip
10. P2-7 setLoading finally
11. P2-8 教学等级对齐

---

## 七、对比 producer 声明

Producer (v1.85.0 commit a555cae) 声明:
- ✓ "5 篇主题 (travel/work/daily/emotion/tech)" — 验证通过
- ✓ "TextbookPage 列表 + LessonDetailPage 阅读器" — 验证通过
- ✓ "词汇高亮 + 完读进度" — **部分通过 (词汇高亮 P1-2 6 词失效)**
- ✓ "20 单元测试" — 验证通过 (20/20 PASS)

Producer 未声明但 spec 要求:
- ✗ "复用 5-10 学过的词" — P1-1 未达 (实际 2)
- ✗ "词汇表中的词是否都在 words.json" — 通过 (但用法错误, 6 词不命中 body)

---

## 结论

**0 P0, 3 P1, 8 P2** — 代码 9 维度基本干净 (历史修复仅 2 处小回归), 5 篇短文内容质量 **3 个 P1 全部在内容层** (复用率 + 词汇高亮), 业务功能完整可演示但教学闭环在 12% 的词汇上断链。

**release 建议**: 修 P1-1 / P1-2 / P1-3 三个内容 P1 后可发 v1.85.0。P2 可在 v1.85.1 跟随 fillblank 一起做 (i18n + console + 死代码集中清理)。
