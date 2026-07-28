# v1.59.0 W54 — Verifier 17 独立 review

**日期**: 2026-07-28 (W54, 独立 verifier)
**版本**: v1.59.0
**范围**: UI 集成 + 跨文件 5 维度
**结论**: **0 P0 + 1 P1 + 6 P2** ⚠️

---

## 总结

| 维度 | 发现 |
|------|------|
| 1. 25 DICT key 真使用 | 9 死 key (v1.58 声称 25 全用, 实为 16) |
| 2. 切语言 UI bug | 1 P1 (ReportsPage line 177) + 2 P2 |
| 3. 死代码扫描误报 | 7 真死 export (P2) |
| 4. 升级 toast race | 1 P2 (Home) + 1 P2 (PlanPage) |
| 5. 跨文件 bug | locale 同步 OK, 无 P0 |

**主 review 说 0 P1, 本 verifier 找到 1 P1 (ReportsPage .replace hack)**

---

## 维度 1: 25 DICT key 真使用

### 方法
`grep "t(['\"]<key>['\"]" src/` 排除 `src/lib/i18n.ts`, 找实际引用数。

### v1.57 (W52) 新加 25 key 真使用状态

| key | 调用数 | 页面 | 状态 |
|-----|--------|------|------|
| home.welcome | 1 | Home | ✓ |
| home.streak_subtitle | 1 | Home | ✓ |
| **home.daily_summary** | **0** | — | **✗ 死** |
| plan.week_summary | 1 | PlanPage | ✓ |
| plan.continue_streak | 1 | PlanPage | ✓ |
| plan.completion_rate | 1 | PlanPage | ✓ |
| settings.theme | 1 | Settings | ✓ |
| settings.color | 1 | Settings | ✓ |
| settings.contrast | 1 | Settings | ✓ |
| settings.reset | 1 | Settings | ✓ |
| review.flip_back | 1 | CardReview | ✓ |
| **review.correct** | **0** | — | **✗ 死** |
| **review.incorrect** | **0** | — | **✗ 死** |
| **review.show_answer** | **0** | — | **✗ 死** |
| **review.next_card** | **0** | — | **✗ 死** |
| reports.total_words | 2 | ReportsPage | ✓ |
| reports.total_sessions | 1 | ReportsPage | ✓ |
| reports.avg_accuracy | 1 | ReportsPage | ✓ |
| reports.this_week | 2 | ReportsPage | ✓ |
| **reports.this_month** | **0** | — | **✗ 死** |
| **reports.daily_streak** | **0** | — | **✗ 死** |
| **reports.weekly_chart** | **0** | — | **✗ 死** |
| **reports.export** | **0** | — | **✗ 死** |
| reports.share | 1 | ReportsPage | ✓ |

### 发现: 9 死 key
**v1.58 review 声称 "25 key 全部用到 5 页面", 实际只有 16 个被引用, 9 个死 key**

- 1 个 Home: home.daily_summary
- 4 个 CardReview: review.correct/incorrect/show_answer/next_card
- 4 个 ReportsPage: reports.this_month/daily_streak/weekly_chart/export

**P2 死 DICT key (zh + en 各 9 行, 共 18 行)** — DICT 膨胀不必要
- 修法: 删除 DICT 中 9 个死 key, 节省维护成本
- 影响: 无 (UI 不引用)

---

## 维度 2: 切语言 UI bug

### P1-1: ReportsPage line 177 半翻译 + 错误 .replace

**文件**: `src/pages/ReportsPage.tsx:177`
**代码**:
```jsx
{t('reports.this_week')} ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} {t('reports.total_words').replace('Total words', '词')}
```

**Bug 分析**:
1. `.replace('Total words', '词')` 是 hack:
   - EN: t() 返 `'Total words'`, replace 命中 → 变 `'词'` (中文!)
   - ZH: t() 返 `'总词汇'`, replace 不命中 → 仍 `'总词汇'` (用户应该看到 "词" 但没替换)
2. 周围文字 `({weekly.weekStart} 起) 共学` 永远中文, 不随语言变化

**实际显示**:
- EN: `This week (2026-07-28 起) 共学 12 词` ← 中英混杂
- ZH: `本周 (2026-07-28 起) 共学 12 总词汇` ← "总词汇" 语法生硬

**修法** (任选):
- A. 加 DICT key `'reports.week_summary': '本周 (N) 共学 M 词'/'This week (N): M words'`, 用两次 .replace 替换占位符
- B. 直接硬编码双语: `{locale === 'zh' ? `本周 (${weekly.weekStart} 起) 共学 ${weekly.totalWordsLearned} 词` : `This week (${weekly.weekStart}): ${weekly.totalWordsLearned} words`}`

---

### P2-1: ReportsPage line 241 半翻译

**文件**: `src/pages/ReportsPage.tsx:241`
**代码**:
```jsx
{t('reports.this_week')}还没有学习数据,先学几个词再来看看?
```

**Bug**:
- EN: `This week还没有学习数据,先学几个词再来看看?` ← 仍中文
- ZH: `本周还没有学习数据,先学几个词再来看看?` ← OK

**修法**: 加 DICT key 或 i18n, 提取完整句为 DICT

---

### P2-2: 5 页面 i18n 完整度 60% (已知 v1.58 局限, v1.59 不在修复范围)

- Home.tsx: 成就卡 / streak 里程碑 / 快捷入口 大半中文硬编码
- PlanPage.tsx: 7 天曲线说明 / 完成日 / 日均 / 总学词 / 今日详情 / AI 计划 modal 全部中文
- CardReview.tsx: 准备中 / 来自 / 翻到背面 等仍部分中文
- ReportsPage.tsx: 多处 stat label (`学词` / `跟读` / `错题`) 中文硬编码, encouragement 数据层全中文

**说明**: v1.58 把 25 个 key 放到 5 页面只覆盖了核心标签 (副标题/header), 上下文未翻译。这本身不是 v1.59 的新 bug, 但说明 i18n 完整度仍低。

---

## 维度 3: 9 维度死代码扫描误报

`scripts/big-review-v1.59.py` 第 9 维度扫到 143 候选死 export, 大多是 React 组件 (JSX 引用, 非 import) 和 React hook, 正常。

### 真实死 export (7 个, 跨文件 0 引用)

**src/lib/migrate.ts**:
- `validateSchema(data)` — 0 外部引用, 仅在 migrate.ts 内部 readMigrationFile 用 (line 145)
  - 建议: 加 `// @internal` 注释或改为不 export

**src/lib/wordTags.ts** (6 个):
- `MAX_TAG_LEN` (const) — 0 外部, 仅 wordTags.ts 内部用 (line 31, 38)
- `MAX_TOTAL_TAGS` (const) — 0 外部, 完全未用
- `parseTagInput(input)` — 0 外部, 仅内部用
- `filterFavoritesByTag(favorites, wordTagMap, tag)` — 0 外部, 完全未用
- `clearAllTagsForWord(wordId)` — 0 外部, 完全未用
- `findSimilarTags(query, limit)` — 0 外部, 完全未用

**P2 死 export**:
- 修法: 删除未用的 (MAX_TOTAL_TAGS, filterFavoritesByTag, clearAllTagsForWord, findSimilarTags), 或加 `// @internal` 注释标注仅文件内
- 影响: 0 (UI 行为不变)

---

## 维度 4: 升级 toast race

### 模拟 3 次 markWordCompleted

**场景**: 用户在 L1 (XP=49), 距 L2 (XP=50) 差 1 XP。点 1 个词 (+5 XP), 应该升级弹 toast。

**代码**: `src/pages/Home.tsx:78-86`
```jsx
const handleMarkPlanWord = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)  // → void addXP(+5, 'LEARN') fire-and-forget
  await logAction(wordId, 'view')
  const newPlan = await generateTodayPlan(dailyGoal, targetLevel)
  setPlan(newPlan)
  setXpState(getXPState())  // ← 读当前 localStorage, 但 addXP 异步可能未写
}
```

### 实际时序

| t | 事件 | localStorage XP | React xpState |
|---|------|-----------------|---------------|
| 0 | 用户点击 mark | 49 | 1 |
| 0+ | markWordCompleted 调 void addXP(异步) | 49 | 1 |
| 1ms | logAction await 完成 | 49 | 1 |
| 2ms | generateTodayPlan await 完成 | 49 | 1 |
| 3ms | setPlan + setXpState(getXPState()) | 49 | **1** (没升) |
| 4ms | addXP 内部 readState (49) → writeState (54) | **54** | 1 (state 不变, 不 rerender) |
| — | useEffect 不触发 (state 没变) | 54 | 1 |
| 5ms | 用户看不到 toast | 54 | 1 |

### P2-1: Home 升级 toast 漏检

**Bug**: 当 `addXP` 比 `setXpState(getXPState())` 晚完成时, React 读到的 XP 是旧值, useEffect 比较前后 level 都是 1, **不弹升级 toast**。

**触发条件**:
- 跨域 addXP 异步延迟 (microtask 顺序, 通常 <1ms 但不是 0)
- 在恰好升级的临界点 (L1→L2, L2→L3 等)

**修法**:
```js
// plan.ts: 让 markWordCompleted 返回 addXP result
const result = await addXP(XP_REWARDS.LEARN, 'LEARN')  // 不要 void
return { completed, leveledUp: result.leveledUp, level: result.level }

// Home.tsx: 用 result 直接 setXpState
const newPlan = await generateTodayPlan(dailyGoal, targetLevel)
setPlan(newPlan)
setXpState(getXPState())  // 此时 addXP 已完成, 读正确 XP
```

**影响**: P2 (用户错过一次 toast, XP 本身正确, 下一词会触发新 toast)

---

### P2-2: PlanPage 升级 UI 永不同步

**文件**: `src/pages/PlanPage.tsx:132-136`
```jsx
const handleMark = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)
  await refresh()
}
```

**Bug**:
- PlanPage 顶部的 XP 进度条 (`Lv.{xpState.level} {xpState.levelTitle}`) 永远不会更新
- 用户在 PlanPage 标记词, 升级后 UI 不变, 切回 Home 才看到 Lv.2

**修法**:
```jsx
const handleMark = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)
  await refresh()
  setXpState(getXPState())  // 加这一行
}
```

**影响**: P2 (UX 不一致, 但 XP 数据正确)

---

## 维度 5: 跨文件 bug

### locale 同步 ✓
- `useTranslate` 通过 `window.dispatchEvent('locale-change')` 通知
- 所有页面 `useTranslate` 监听事件, `setLocaleState` 触发 rerender
- i18n.ts 模块 `currentLocale` 也在 setLocale 同步更新
- 单一切换器 (AppearanceSection) → 所有页面同步

### v1.58 新加 useTranslate 验证
- ✓ `src/pages/PlanPage.tsx:4` import useTranslate
- ✓ `src/pages/PlanPage.tsx:23` 调用 t() (3 处)
- ✓ `src/pages/ReportsPage.tsx:13` import useTranslate
- ✓ `src/pages/ReportsPage.tsx:20, 116, 161` 多处 t() 调用

### 跨文件 hook 依赖
- i18n.ts 导出 `t/getLocale/setLocale/initLocale/type Locale`
- useTranslate.ts 重新 import 上述, 包装成 hook
- 单元测试 tests/i18n.test.ts 覆盖

**结论**: locale 同步无 bug, v1.58 新加 useTranslate 工作正常

---

## 修复优先级

### P1 (1 个, 必修)
| # | 文件:行 | 描述 |
|---|---------|------|
| P1-1 | `src/pages/ReportsPage.tsx:177` | `.replace('Total words', '词')` 只在 EN 工作, 周围文字永远中文 |

### P2 (6 个, 后续清理)
| # | 文件 | 描述 |
|---|------|------|
| P2-1 | `src/pages/ReportsPage.tsx:241` | "还没有学习数据..." 永远中文 |
| P2-2 | `src/pages/Home.tsx:78-86` | 升级 toast race, 临界点漏检 |
| P2-3 | `src/pages/PlanPage.tsx:132-136` | handleMark 不更新 xpState, UI 永不同步 |
| P2-4 | `src/lib/i18n.ts` (9 处) | 9 死 DICT key (home.daily_summary, review.correct/incorrect/show_answer/next_card, reports.this_month/daily_streak/weekly_chart/export) |
| P2-5 | `src/lib/migrate.ts:53` | validateSchema 0 外部引用, 标 @internal |
| P2-6 | `src/lib/wordTags.ts` (6 处) | MAX_TAG_LEN/MAX_TOTAL_TAGS/parseTagInput/filterFavoritesByTag/clearAllTagsForWord/findSimilarTags 0 外部引用 |

---

## 5 维度独立评估

| 维度 | 评级 | 备注 |
|------|------|------|
| 1. 25 DICT key 真使用 | ⚠️ | 9 死 key, v1.58 review 误报 |
| 2. 切语言 UI bug | ❌ P1 | ReportsPage 半翻译 + 错误 .replace |
| 3. 死代码扫描 | ✓ | 7 真死 export, 不算 bug, 算清理 |
| 4. 升级 toast race | ⚠️ | 临界点漏检, 概率低但存在 |
| 5. 跨文件 bug | ✓ | locale 同步 OK |

---

**v1.59.0 主 review 报 0 P0, 本 verifier 找到 1 P1 (ReportsPage line 177 半翻译 bug)。建议 P1-1 在 v1.60 修。**
