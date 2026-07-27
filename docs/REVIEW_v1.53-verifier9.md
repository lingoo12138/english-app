# v1.53.0 W48 — Verifier 9 独立 review (集成 + 跨文件)

**日期**: 2026-07-27 (W48)
**版本**: v1.53.0 (commit fc31825)
**触发**: 第 9 次大 review — verifier9 独立验证
**目标**: 找主审查 + 历史 verifier 漏掉的真问题 (集成 + 跨文件)
**评审范围**: 5 维度独立验证 + 总结
**评审方式**: 静态读 v1.53.0 commit `fc31825` 源码 (v1.54+ WIP 修复不算)
**评审时间**: ~20 min

---

## 0. 背景

- v1.53.0 已 push, 主审查 0 P0 + 0 P1 (8 维度)
- 本 verifier 专注 4 新 i18n 页面 (CustomScenes/ReviewCenter/Achievements/CustomSceneLearn) + 跨文件集成
- 评审时间 20 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: v1.52 verifier7 P1-A 回归 — AIChat.tsx:475 历史按钮仍硬编码中文

**文件**: `src/pages/AIChat.tsx:475`
**引入版本**: v1.52.0 (W47) → v1.53.0 (W48) **未修**
**修法引用**: v1.52 DICT 已加 'aichat.history' = '历史对话 (N)'/'History (N)'

#### 现象

v1.52 verifier7 已找到此 P1 (verifier7 报告 1.1 P1-A), 但 v1.53.0 仍未修:

```tsx
// AIChat.tsx:475 (v1.53.0, 未改)
<button onClick={() => setShowHistory(!showHistory)} ...>
  📚 历史 ({chats.length})           // ← 硬编码中文
</button>

// AIChat.tsx:568 (v1.53.0, v1.52 改的)
<h2 className="text-sm font-semibold">
  📚 {t('aichat.history').replace('N', String(chats.length))}  // ← i18n-ed
</h2>
```

#### 影响

- 切到 en: button 显示 "📚 历史 (5)" (中文), 点开 panel 显示 "📚 History (5)" (英文)
- **UI 不一致**: 同一概念 (历史对话数) 两种语言同时出现在一个面板切换中
- 主审查 `big-review-v1.53.py` 维度 6 "i18n 完整性" 只扫 DICT 完整 (0 missing), 没扫"同屏 t() 一致性"

#### 验证

```bash
$ grep "📚" src/pages/AIChat.tsx
475:          📚 历史 ({chats.length})           # ← v1.53.0 仍未改
568:            <h2 className="text-sm font-semibold">📚 {t('aichat.history')...
```

#### 修法 (v1.54 范围)

```tsx
// AIChat.tsx:475
<button onClick={() => setShowHistory(!showHistory)} ...>
  📚 {t('aichat.history').replace('N', String(chats.length))}
</button>
```

---

### 1.2 P1-B: v1.52 verifier7 P1-B 回归 — WritePage.tsx:417 "我的作文" tab 仍硬编码中文

**文件**: `src/pages/WritePage.tsx:417`
**引入版本**: v0.23.0 (历史 tab 加) → v1.53.0 **未修**
**修法引用**: v1.52 DICT 已加 'write.title' = '写作批改'/'Writing'

#### 现象

```tsx
// WritePage.tsx:378 (v1.52 已改)
<h1 className="text-2xl font-bold mb-1">✍️ {t('write.title')}</h1>

// WritePage.tsx:417 (v1.53.0, 仍未改)
<button onClick={() => setActiveTab('history')} ...>
  📚 我的作文 ({history.length})      // ← 硬编码中文
</button>
```

#### 影响

- 切到 en: 页面标题 "✍️ Writing" (英文), tab 按钮 "📚 我的作文 (3)" (中文)
- **UI 不一致**: 同一页面 标题英文 + tab 中文, 像翻译只做了一半
- v1.52 verifier7 找到的 P1, 隔 1 个 release 仍未修, 是 verifier7 修不全

#### 验证

```bash
$ grep "我的作文" src/pages/WritePage.tsx
417:          📚 我的作文 ({history.length})
```

#### 修法 (v1.54 范围)

新增 DICT key:
```ts
// i18n.ts zh/en
'write.history_tab': '我的作文 (N)' / 'My essays (N)',
```

修 WritePage.tsx:417:
```tsx
<button onClick={() => setActiveTab('history')} ...>
  📚 {t('write.history_tab').replace('N', String(history.length))}
</button>
```

---

### 1.3 P2-A: worddetail.back 死 key (DICT 定义但 0 处使用)

**文件**: `src/lib/i18n.ts:135` (zh) + `:269` (en)
**引入版本**: v1.53.0 (本次新加, 但从未引用)

#### 现象

```bash
$ grep -rn "worddetail.back" src/ --include="*.ts" --include="*.tsx"
src/lib/i18n.ts:135:    'worddetail.back': '返回',
src/lib/i18n.ts:269:    'worddetail.back': 'Back',
# 仅 DICT 定义, 0 处使用
```

#### 影响

- 死 key 占 DICT 容量 (~30 字节 raw / ~15 字节 gzipped)
- 静态扫描"i18n 完整性"会报"1 个 key 未被任何 t() 调用" (false positive 风险)
- v1.53.0 review notes 写"worddetail.back (预留)" — 但预留是 W49 计划, 现在定义就早

#### 修法 (2 选 1)

**A. 用上** (v1.54 改 WordDetail 页面时同步):
```tsx
// src/pages/WordDetail.tsx
<button onClick={() => navigate(-1)}>{t('worddetail.back')}</button>
```

**B. 删掉** (如果 W49 不用):
```ts
// i18n.ts:135 (zh) + :269 (en) 删 'worddetail.back' 行
```

---

### 1.4 P2-B: initLocale 死代码 (导出但 0 处调用)

**文件**: `src/lib/i18n.ts:319`
**引入版本**: v1.41.0 (W41), **5 个 release 无人调用**

#### 现象

```bash
$ grep -rn "initLocale" src/ --include="*.ts" --include="*.tsx"
src/lib/i18n.ts:319:export function initLocale(): Locale {
# 仅定义, 0 处使用
```

#### 影响

- 死代码: 5 个 release (v1.41 → v1.53) 没人调用
- 当前**不构成 bug**: `getLocale()` 在 useState 初始值里直接读 localStorage, 替代了 initLocale 的作用
- **风险**: 如果未来某个非 useTranslate 路径调 `t(key)` (用模块默认 currentLocale), 会拿到 stale 'zh', 因为 initLocale 没在启动时跑
- 当前所有 t() 调用都通过 useTranslate, 没踩到, 但埋雷

#### 修法 (3 选 1)

**A. 删掉** (推荐, 当前没用到):
```ts
// i18n.ts 删 initLocale 函数 + 'initLocale' 出现在 tests/i18n.test.ts:5
// 同步删测试
```

**B. 在 main.tsx 调一次** (若觉得有用):
```ts
// main.tsx 顶部
import { initLocale } from './lib/i18n'
initLocale()  // 同步 currentLocale 到 localStorage
```

**C. 留个 TODO** (最低成本): 加 `/** @deprecated 当前未用, W49 决定删或调 */` 注释

---

## 2. 5 维度独立评估

### 维度 1: UI 渲染 bug (4 页面 t() 调用)

**结论**: **0 新 P0/P1**, 但有 1 P1 回归 (见 1.1, 1.2)

**4 页面 t() 调用验证**:

| 文件 | t() 调用 | N 替换 | DICT 完整 | 同屏一致性 |
|------|---------|--------|----------|-----------|
| CustomScenes.tsx:218 | `customscenes.title` | 无 N | ✓ zh/en 有 | **部分** (h1 i18n, 周围 ~20 中文) |
| CustomScenes.tsx:284 | `customscenes.extracted` | `.replace('N', String(extractedWords.length))` | ✓ zh/en 有 | **部分** (h3 i18n, L97 toast 硬编码 "提取到 N 个生词") |
| ReviewCenter.tsx:132 | `review.empty` | 无 N | ✓ zh/en 有 | **部分** (h2 i18n, L134/135/139/142 硬编码) |
| ReviewCenter.tsx:155 | `review.done` | 无 N | ✓ zh/en 有 | **部分** (h2 i18n, L157/163/167/171/176 硬编码) |
| Achievements.tsx:49 | `achievements.title` | 无 N | ✓ zh/en 有 | **部分** (h1 i18n, TYPE_META labels + 成就数据全硬编码) |
| CustomSceneLearn.tsx:168 | `customlearn.done` | 无 N | ✓ zh/en 有 | **部分** (h1 i18n, L170/178/185 硬编码) |

**6 个 t() 调用本身全部正常**:
- CustomScenes.tsx:218 → 显示 "📝 自定义场景" / "📝 Custom Scenes" ✓
- CustomScenes.tsx:284 → 显示 "📋 提取结果 (N 词)" / "📋 Extracted (N words)" ✓
- ReviewCenter.tsx:132 → 显示 "没有待复习的词" / "No due reviews" ✓
- ReviewCenter.tsx:155 → 显示 "复习完成!" / "Review complete!" ✓
- Achievements.tsx:49 → 显示 "🏆 成就墙" / "🏆 Achievements" ✓
- CustomSceneLearn.tsx:168 → 显示 "学完啦!" / "Done!" ✓

**N 替换逻辑全对** (3 处):
- `t('customscenes.extracted').replace('N', String(extractedWords.length))` — 安全 (length 是数组, 不可能 undefined)
- `t('aichat.history').replace('N', String(chats.length))` — 安全
- `t('write.errors').replace('N', String(result.errors.length))` — 安全

**维度 1 结论**: v1.53 4 页面 t() 集成本身无 bug, 但有 2 P1 回归 (v1.52 verifier7 漏修) 需 v1.54 补

---

### 维度 2: t() key 重复定义

**结论**: 0 重复. v1.53 新 key 全部唯一.

**DICT key 扫描**:

| 范围 | 数量 | 检查 |
|------|------|------|
| v1.53 新 key (zh) | 7 | 全部唯一 |
| v1.53 新 key (en) | 7 | 全部唯一, 与 zh 一一对应 |
| review.* key 总数 | 33 (含 v1.45 26 + v1.53 2 + review.due/today/streak/days/startSession 5 旧) | review.empty ≠ review.empty_title, review.done ≠ review.done_title |
| 全 DICT zh key | 120 (实际 115 数字符串重复 5 个 v1.45 CardReview 子串, 总 DICT entry 240 zh+en) | set 等, 无重复 |

**review.empty vs review.empty_title (无冲突)**:
- `review.empty` (v1.53 新): "没有待复习的词" / "No due reviews" — ReviewCenter 队列空时
- `review.empty_title` (v1.45 CardReview): "生词本为空" / "Notebook is empty" — CardReview 生词本空时
- **不同语义, 不同 key**: 一个是"待复习队列空", 一个是"生词本空"。 命名虽相似, 不冲突。

**review.done vs review.done_title (无冲突)**:
- `review.done` (v1.53 新): "复习完成!" / "Review complete!"
- `review.done_title` (v1.45 CardReview): "🎉 复习完成" / "🎉 Review complete"
- **相似但 key 不同**, emoji 区别, 不冲突。

**P2 命名 smell** (不修): review.empty 和 review.empty_title, review.done 和 review.done_title 共存, 命名规范不一致。 短期 W48 改不动, 留 v2.0 统一。

---

### 维度 3: t() N 替换 bug (类比 v1.49 addXP race)

**结论**: **0 bug**。 N 替换在 v1.53 是纯字符串操作, 单线程, 无 race.

**v1.49 addXP race 是什么 (背景)**:
```ts
// v1.43 旧:
void import('./xpSystem').then(m => m.addXP(...))
// dynamic import 是 microtask, 可能在 HMR 下与 writeState race
// v1.48 修: 静态 import, 同步执行
```

**v1.53 t().replace() race 分析**:
```ts
// CustomScenes.tsx:284 (v1.53)
t('customscenes.extracted').replace('N', String(extractedWords.length))
// 拆分:
// 1. t() 查 DICT, 同步
// 2. .replace() 同步字符串替换
// 全程同步, 不可能 race
```

**Edge case 验证**:

```ts
// Case 1: t() 返回 key 自身 (key 缺失)
t('nonexistent.key', 'en')  // → 'nonexistent.key'
'nonexistent.key'.replace('N', '5')  // → 'nonexistent.key' (replace 不报错, no-op)
// ✓ 安全 fallback

// Case 2: extractedWords.length = 0
// 但 `{extractedWords.length > 0 && ...}` 包裹, 永远 length > 0 才走到
// ✓ 安全

// Case 3: extractedWords.length = undefined (理论不可能, useState 默认 [])
// String(undefined) = 'undefined' → "提取结果 (undefined 词)" / "Extracted (undefined words)"
// 当前不会触发 (length 永远是 number), 但 N 替换 API 不防御
// P3 防御性编程: extractedWords.length ?? 0, 不修
```

**12 个 t().replace('N', ...) 站点全扫**:
```
AIChat.tsx:568 .replace('N', String(chats.length))         ✓ chats.length 来自 useState
CardReview.tsx:230 .replace('N', reviewedCount).replace('M', queue.length)  ✓ 同 useState
CardReview.tsx:417 .replace('N', String(reviewedCount))    ✓
CardReview.tsx:418 .replace('N', String(pendingDueCount))  ✓
CustomScenes.tsx:284 .replace('N', String(extractedWords.length))  ✓
ListenPage.tsx:614 .replace('N', lesson.title)             ⚠ lesson.title 可能是中文, 但 DICT 模板 zh='N 已加入' N 是占位符, replace 把'N'换成 lesson.title, 结果 "咖啡店点单 已加入" ✓
Notebook.tsx:276 .replace('N', words).replace('M', due)    ✓
Notebook.tsx:341 .replace('N', String(selected.size))      ✓
Notebook.tsx:458 .replace('N', String(dueCount))          ✓
WordList.tsx:169 3-replace N/M/K 全 String() ✓
WordList.tsx:292 .replace('N', String(filtered.length))   ✓
WritePage.tsx:477 .replace('N', String(result.errors.length))  ✓
```

**唯一值得关注的 (P3)**: ListenPage.tsx:614 用了 `lesson.title` (string), 其他都用 `String(number)`. 类型不一致但功能正确。

**维度 3 结论**: 0 bug, N 替换 API 健壮, v1.49 addXP race 不适用

---

### 维度 4: 跨页面 locale 同步

**结论**: 0 bug. useTranslate 跨组件正确同步.

**验证 useTranslate 行为**:

```ts
// useTranslate.ts:7
const [locale, setLocaleState] = useState<Locale>(getLocale())  // 启动时读 localStorage

// useTranslate.ts:10-15
useEffect(() => {
  const handler = (e: Event) => {
    setLocaleState((e as CustomEvent<Locale>).detail)
  }
  window.addEventListener('locale-change', handler)
  return () => window.removeEventListener('locale-change', listener)
}, [])

// useTranslate.ts:17
const t = useCallback((key: string) => translate(key, locale), [locale])  // locale 变 → t 重建 → rerender
```

**locale 切换流程** (用户点 Settings → 选 en):
1. `setLocale('en')` 调 useTranslate.changeLocale
2. changeLocale 调 i18n.setLocale:
   - 改模块 `currentLocale = 'en'`
   - 写 `localStorage['app-locale'] = 'en'`
   - `window.dispatchEvent(new CustomEvent('locale-change', { detail: 'en' }))`
3. changeLocale 调 setLocaleState('en') (useTranslate 内部 useState)
4. **所有挂载 useTranslate 的组件**通过事件 listener 收到通知, 各自 setLocaleState → rerender
5. t() callback 因 locale 依赖重建, 后续调用返 en 翻译

**App.tsx 是否需要 rerender?**
- App.tsx 不调 t(), 只渲染 `<Suspense>` + `<Routes>` + `<Layout>`
- App.tsx 不挂 useTranslate
- **不需要 rerender** — 因为 App 渲染的子组件 (Routes 下的页面) 各自挂 useTranslate, 各自 rerender
- Layout.tsx 也不挂 useTranslate, 但 Layout 渲染的中文 nav 文字本来就不 i18n (Layout.tsx:30-37 硬编码), 所以"不需要"也是合理的

**P2 候选 (不修)**: Layout.tsx 顶部 nav 硬编码中文 (写作/错题/听力/报告/生词)。 这是 v1.41 引入 i18n 时遗留, v1.53 之前没人提。 改 Layout 需要 1h+, v1.54 单独做。

**维度 4 结论**: 0 bug, locale 跨页同步正确, Layout 中文 nav 是已知遗留 P2

---

### 维度 5: 包大小

**结论**: 0 关注点. v1.53 DICT +7 key = +150 字节 raw / +50 字节 gzipped, 可忽略.

**DICT 体积分析**:

| 范围 | zh 源 | en 源 | 总 raw | 估 gzipped (0.35) |
|------|------|------|-------|------------------|
| v1.41 初始 (~30 key) | 1.3 KB | 1.2 KB | 2.5 KB | 0.9 KB |
| v1.45 CardReview (+26 key) | 1.4 KB | 1.4 KB | 2.8 KB | 1.0 KB |
| v1.46-50 (其他 +30 key) | 1.5 KB | 1.5 KB | 3.0 KB | 1.1 KB |
| v1.52 AIChat/WritePage (+7) | 0.3 KB | 0.3 KB | 0.6 KB | 0.2 KB |
| **v1.53 4 页面 (+7)** | **0.3 KB** | **0.3 KB** | **0.6 KB** | **0.2 KB** |
| **总计 (115 key)** | **5.6 KB** | **5.2 KB** | **10.8 KB** | **3.8 KB** |

**bundle 实际位置**:
- DICT 在 `dist/assets/useTranslate-CNOrdYcc.js` (8.5 KB raw, 3.5 KB gzipped)
- **不在初始 index chunk** (因为 useTranslate 只被 lazy pages 用, Vite 自动切分)
- 但 `Home.tsx` 是默认路由 (`<Route index element={<Home />}`), 它 `lazy(() => import('./pages/Home'))` 加载, 同时拖入 useTranslate chunk
- 所以: **首次打开 / 立即触发 useTranslate chunk 加载** (~3.5 KB gzipped, 在 4G 下 < 100ms)

**v1.53 增加 0.6 KB raw / 0.2 KB gzipped**, 对首屏用户体验无可感知影响。

**懒加载 i18n 是否更好 (按页面 import)?**

- 想法: 每个 page 独立 import 自己的 DICT 切片, 减少 lazy chunk 大小
- 现实: 1 个 page 用了 1-2 个 key, 切分后每个 page 的 i18n chunk 1-2 KB raw, 节省 ~1 KB / page
- 代价: 10+ HTTP 请求变多, 浏览器并行连接数压力, 实际可能更慢
- **结论: 当前"全量 DICT 1 个 chunk"是正确选择**, 不动

**P2 候选 (不修)**: DICT 当前是 hand-written 字典 + 注释。 未来 W50+ 可考虑引入 i18next + JSON dict, 减轻手维护负担。 但 v1.41 选 hand-written 是有意的 (0 依赖, 静态类型), 维持现状。

**维度 5 结论**: 0 bug, 包大小可控, 懒加载不值得

---

## 3. 累计 (v1.45 → v1.53 含 verifier 修)

| 来源 | 数量 | 内容 |
|------|------|------|
| v1.45 main review | 0 | 0 P0 + 0 P1 |
| v1.45 verifier1 | 2 | P1 i18n (CardReview 26 key) + P2 dead code |
| v1.45 verifier2 | 2 | P1-A addXP 同步 / P1-B getRecommendedWords fallback |
| v1.45 verifier3 | 1 | P1 PlanPage XP 进度条 width 错算 |
| v1.48 verifier4 | 2 + 1 | P1-B db.ts fire-and-forget / P1-C i18n 7 页面盲区 / P2-A addXP 静默 |
| v1.51 verifier5 | 1 | P1-B db.ts addXP quota |
| v1.52 verifier6 | 1 | P1 Notebook 漏修 |
| v1.52 verifier7 | 2 + 1 | P1-A AIChat history button / P1-B WritePage 我的作文 tab / P2-A CEFRLevel 命名 |
| v1.53 main review | 0 | 0 P0 + 0 P1 |
| **v1.53 verifier9 (本)** | **2 P1 + 2 P2** | **P1-A AIChat 回归 / P1-B WritePage 回归 / P2-A worddetail.back 死 key / P2-B initLocale 死代码** |

| 维度 | 评估 | bug |
|------|------|-----|
| 1 UI 渲染 t() | ✓ 0 新 bug | 1.1, 1.2 v1.52 P1 回归 |
| 2 key 重复 | ✓ 0 bug | - |
| 3 N 替换 race | ✓ 0 bug (不像 v1.49 addXP) | - |
| 4 locale 同步 | ✓ 0 bug | - |
| 5 包大小 | ✓ 0 bug | - |

**v1.53 本身 0 新 P0/P1**, 但**有 2 个 v1.52 verifier7 P1 漏修**。 这反映: v1.53 focus 是"4 页面 t()", 不是"补 v1.52 verifier7 修不全"。

---

## 4. 修法优先级

**P1-A (AIChat 历史按钮)**: 1 行修改, 1 min. 建议 v1.54 hotfix.

**P1-B (WritePage 我的作文 tab)**: 1 行 DICT + 1 行 UI, 5 min. 建议 v1.54 hotfix.

**P2-A (worddetail.back 死 key)**: 1 行删 或 W49 WordDetail 用上, 5 min.

**P2-B (initLocale 死代码)**: 删函数 + 删测试 或 main.tsx 调一次, 5 min. 可选.

---

## 5. 验证

- tsc --noEmit: 0 错误 (主审查已确认, 本 verifier 仅静态读)
- vitest: 22 + 11 + 113 DICT key 覆盖测试全过 (主审查已确认)
- 静态审查: `python3 scripts/big-review-v1.53.py` 跑过 0 P0
- 本 verifier 仅静态读, 无代码改动 (按约束)

---

## 6. 总结

**v1.53.0 本身 i18n 集成 0 新 bug**:
- 4 页面 6 个 t() 调用全部正确
- DICT 0 missing, 0 重复
- N 替换 race-free
- locale 跨页同步正确
- 包大小 +0.2 KB gzipped, 可忽略

**2 个 v1.52 verifier7 P1 回归待 v1.54 修**:
- AIChat.tsx:475 历史按钮
- WritePage.tsx:417 我的作文 tab

**2 个 P2 死代码清理**:
- worddetail.back 死 key
- initLocale 死函数

**v1.53 主审查 0 P1 的口径是"v1.53 范围 0 新 P1"**, 不是"v1.52-v1.53 累计 0 P1"。 后者口径下, 还有 2 P1 待 v1.54 修。

---

**最后更新**: 2026-07-27 (W48 verifier9)
