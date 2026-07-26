# v1.39 verifier3 — 独立 dead code / IDB / 性能 / 测试 复检

**日期**: 2026-07-26
**审查者**: general (independent verifier, 4 任务 1 个文件)
**范围**: v1.37-v1.39 累积 3 release tag (commit 1f6ca1c..f3b17c9)
**对照基线**: `docs/REVIEW_v1.36-verifier2.md` (5 dead lib + 14 未覆盖 lib)
**结论**: **0 新 dead lib ✓, 1 P1 集成残缺 (phraseCards), 1 P2 暗色双实现, 0 IDB 风险, 4 个性能观察 (3 良性 + 1 race), 13/14 仍未覆盖**

---

## 总览 (TL;DR)

| 维度 | v1.36 状态 | v1.37-v1.39 状态 | 评级 | 变化 |
|------|----------|------------------|------|------|
| **5 dead lib UI 集成** | 0/5 (37 测试 dead) | 4/5 ✓ + 1/5 残缺 | 中→良 | +4 真集成, -1 残缺 |
| **v1.38 InAppBanner** | — | ✓ 真集成 | 优 | 新 |
| **v1.39 暗色/TTS/多人** | — | 3/3 ✓ 真集成 | 优 | 新 |
| **IDB schema** | v6, 0 冲突 | v6, 0 冲突, +0 表 | 优 | 不变 |
| **writingErrors / records 索引** | 全部匹配 | 全部匹配 (errorStats 加 1 reader) | 优 | +1 reader |
| **InAppBanner 60s setInterval** | — | < 1ms/tick, 应不抖 | 优 | 新 |
| **applyContrastFix 重复注入** | — | ✓ idempotent (getElementById 守卫) | 优 | 新 |
| **MultiRoleContent 每次 parse** | — | ~50 calls / 50 消息, < 1ms | 良 | 可选 memo |
| **initDarkMode 阻塞主线程** | — | < 1ms, ⚠ race condition | 良 | 新 |
| **测试总数** | 626 | **642** (+16) | 优 | +10 darkMode +6 调整 |
| **未覆盖 lib** | 14 | **13** (themes.ts 部分覆盖) | 良 | -1 |
| **新 P0** | 0 | 0 | 优 | — |
| **新 P1** | 0 | **1** (phraseCards 切短语不显示短语) | ⚠ | 新 |
| **新 P2** | 0 | **1** (暗色双实现 + race) | ⚠ | 新 |

### 核心结论
1. **集成 4/5 真实有效** — errorStats / writingTemplates / aiPlanGenerator 完美触达用户;tagSuggest 走本地启发式, 不是 LLM 路径
2. **phraseCards 集成残缺 (P1)** — 切短语按钮切换 + 短语队列构建 OK, **但渲染时仍读 `queue[currentIndex].word`, 短语从未显示**. 用户点按钮看不到短语卡
3. **暗色模式双实现 (P2)** — themes.ts (localStorage `dark-mode`) 与 useStore (zustand persist) 并行, App.tsx 两个 useEffect 都会触达 html.dark class (race)
4. **IDB 完全无变更** — v6 维持, 无新表, errorStats 用的 `ts` 索引存在
5. **3 个性能观察 良性** — InAppBanner/applyContrastFix/parseMultiRoleReply 都已合理化;**1 个 race condition** (initDarkMode vs useEffect darkMode)

---

## 任务 1: Dead code 复检

### 1.1 5 dead lib 集成逐一验证

#### ✓ errorStats.ts → ErrorsPage (v1.37.0 W35-1) — **FULLY INTEGRATED**

**调用点** (src/pages/ErrorsPage.tsx):
```
L7:  import { getErrorSummary, ERROR_TYPE_LABELS, getErrorTypeColor, type ErrorSummary } from '../lib/errorStats'
L24: const [errorSummary, setErrorSummary] = useState<ErrorSummary | null>(null)
L33: getErrorSummary().then(setErrorSummary).catch(() => setErrorSummary(null))
L267-325: 3 卡片 (类型分布 / 7 天趋势 / 高频错词 Top 5)
L277: ERROR_TYPE_LABELS[t.type] 实际渲染
L277: getErrorTypeColor(t.type) 实际渲染
```

**导出使用率**: 3/3 函数 + 1/1 const (ERROR_TYPE_LABELS 实际渲染)
- `getErrorSummary()` ✓ L33
- `ERROR_TYPE_LABELS` ✓ L277
- `getErrorTypeColor` ✓ L277
- `ErrorSummary` type ✓ L24

**注意**: 页面仍保留 inline `useMemo` 算 stats (filtered), 原因是 filter=write/chat 切换时 inline 跟 filter 走, 而 lib 永远算 "总". **双实现并存的合理场景**, 不是 dead code 重复.

#### ✓ writingTemplates.ts → WritePage (v1.37.0 W35-2) — **FULLY INTEGRATED**

**调用点** (src/pages/WritePage.tsx):
```
L6:  import { WRITING_TEMPLATES, buildTemplatePrompt } from '../lib/writingTemplates'
L115: const [showTemplate, setShowTemplate] = useState(false)
L370-373: <TemplateModal open={showTemplate} onSelect={...} />
L426: <button onClick={() => setShowTemplate(true)}>📝 模板</button>
L848-925: TemplateModal 组件 (4 模板列表 + 字段填写 + 提示生成)
L853: const template = WRITING_TEMPLATES.find(...)
L858: buildTemplatePrompt(template.id, values) → onSelect(prompt)
```

**导出使用率**: 2/2
- `WRITING_TEMPLATES` ✓ L6 import + L853 + L877 渲染
- `buildTemplatePrompt` ✓ L858

**用户路径**: /write → 点 📝 模板 → 选 4 模板之一 (邮件/自我介绍/道歉/感谢) → 填字段 → 点确认 → setInput(prompt) 写文本. **完整流程.**

#### ✓ aiPlanGenerator.ts → PlanPage (v1.37.0 W35-4) — **FULLY INTEGRATED**

**调用点** (src/pages/PlanPage.tsx):
```
L7:  import { generateAIPlan, type AIPlan } from '../lib/aiPlanGenerator'
L24: const [aiPlan, setAIPlan] = useState<AIPlan | null>(null)
L44-77: handleGenerateAIPlan (LLM 调用 + setAIPlan)
L147: <button onClick={() => setShowAIPlan(true)}>🤖 AI 定制多日计划</button>
L259-285: AI 计划 modal (生成中/strategy/estimatedWords 渲染)
L270: <button onClick={handleGenerateAIPlan}>✨ 生成 7 天计划</button>
```

**导出使用率**: 1/1 函数 + 1/1 type
- `generateAIPlan` ✓ L55
- `AIPlan` type ✓ L7/L24
- `parseAIPlan` / `estimatePlanMinutes` 内部由 generateAIPlan 调用 (无需直接 UI 调用)

**用户路径**: /plan → 点 🤖 AI 定制多日计划 → 弹 modal → 点 ✨ 生成 7 天计划 → 调 LLM → 显示 strategy + estimatedWords. **完整流程.**

#### ⚠ tagSuggest.ts → Notebook (v1.37.0 W35-5) — **PARTIALLY INTEGRATED (本地启发式, 不是 LLM)**

**调用点** (src/pages/Notebook.tsx):
```
L153-176: handleAISuggest (调 wordTags.suggestTagsFromWord 本地启发式)
L158: import('../lib/wordTags') — 动态 import wordTags
L159: const suggested = suggestTagsFromWord(word.word, word.translations[0])
L497: onAISuggest={handleAISuggest} 传给 NotebookWord
L575: title="AI 推荐 tag" 按钮
```

**导出使用率**: 1/3 (仅 re-export 的本地启发式)
- `suggestTagsFromWord` (re-export from wordTags) ✓ — 但实际从 wordTags 直接 import
- `suggestTagsByLLM` (LLM 推荐) ❌ **DEAD** — 无 UI 调用
- `parseTagSuggestions` (LLM 解析) ❌ **DEAD** — 无 UI 调用

**问题**:
- v1.37 changelog 描述 "🤖 AI 推荐 tag 按钮 (本地启发式)" — 实际是诚实的
- 但 tagSuggest.ts lib 整体设计是为 LLM 推荐, 真实场景的本地启发式早就由 wordTags.suggestTagsFromWord 提供
- LLM 推荐函数 `suggestTagsByLLM` / `parseTagSuggestions` 仍是 dead code (0 UI 引用, 5 测试覆盖)
- 5 tagSuggest.test.ts 测试场景 (LLM mock) 实际永远不会在用户流程中触发

**用户路径**: /notebook → 点 🤖 AI 推荐 tag → 走 wordTags.suggestTagsFromWord (本地, 无 LLM). **不调 LLM, 不消耗 token, 但也不算"AI 推荐"**.

#### ⚠ phraseCards.ts → CardReview (v1.37.0 W35-3) — **⚠ P1 BROKEN INTEGRATION**

**调用点** (src/pages/CardReview.tsx):
```
L11: import { extractPhrasesFromWords, shuffleCards, getPhraseTTS, type PhraseCard } from '../lib/phraseCards'
L39: const [mode, setMode] = useState<'word' | 'phrase'>('word')
L40: const [phraseQueue, setPhraseQueue] = useState<PhraseCard[]>([])
L116-120: if (mode === 'phrase') { phraseList = extractPhrasesFromWords(allWords); setPhraseQueue(shuffleCards(phraseList).slice(0, 20)) }
L253: onClick={() => { setMode(mode === 'word' ? 'phrase' : 'word'); window.location.reload() }}
L259: {mode === 'word' ? currentIndex + 1 : Math.min(currentIndex + 1, phraseQueue.length)} / {mode === 'word' ? queue.length : phraseQueue.length}
```

**导出使用率**: 2/3 + 1 type, **但渲染层未触达**
- `extractPhrasesFromWords` ✓ L118
- `shuffleCards` ✓ L119
- `getPhraseTTS` ❌ **IMPORTED BUT NEVER CALLED** — dead
- `PhraseCard` type ✓ (L40 useState)

**渲染层 (L237-256)**:
```
L237: const current = queue[currentIndex]
L238: const word = current.word
L281-301: <h1>{word.word}</h1> / <TTSButton text={word.word} />  // 单词卡
```

**问题 (P1)**: 短语模式切了 mode 状态, 建了 phraseQueue, 但渲染仍读 `queue[currentIndex].word` (单词卡). **用户点 📚 切短语 后, 看到的是同样的单词卡, 短语从未显示.**

**应有路径** (推断):
- 切短语 → loadWords() → extractPhrasesFromWords → setPhraseQueue
- 渲染: `if (mode === 'phrase') { const current = phraseQueue[currentIndex]; <h1>{current.text}</h1> ... }` — **这段代码不存在**

**根本原因**: v1.37 changelog 报 "📚 切短语按钮 + 短语队列", 但只完成了"队列"半段, 缺"渲染"半段. 短语 mode 实际不可用.

**测试浪费**: phraseCards.test.ts 10 测试覆盖 (extractPhrases / shuffle / getPhraseTTS), 但 getPhraseTTS 在 UI 完全 dead, 测试是 lib-only.

**修复建议 (给 owner)**: 在 CardReview 渲染分支加 `mode === 'phrase'` 条件渲染 phraseQueue[currentIndex] (PhraseCard UI: 短语/翻译/TTS 按钮). 估 30-60 行.

### 1.2 v1.38 InAppBanner — **FULLY INTEGRATED**

**调用点**:
```
src/App.tsx L11: import InAppBanner from './components/InAppBanner'
src/App.tsx L113: <InAppBanner /> 顶层挂载
src/components/InAppBanner.tsx L6-9: import { shouldShowInAppReminder, loadInAppReminderState, dismissInAppReminder, vibrateIfSupported, shouldUseInAppReminder } from '../lib/inAppReminder'
```

**lib 复用**: 5 函数 (v1.34 inAppReminder) 全部触达 UI
- `shouldUseInAppReminder` ✓ L22 (平台检测)
- `shouldShowInAppReminder` ✓ L29, L30
- `loadInAppReminderState` ✓ L31
- `vibrateIfSupported` ✓ L34
- `dismissInAppReminder` ✓ L45, L51

**无新增 lib**: InAppBanner 纯 UI 组件, 复用 v1.34 inAppReminder (8 测试已存). ✓

### 1.3 v1.39 暗色/TTS/多人 — **3/3 集成**

#### v1.39 W37-1 MultiRoleContent — **FULLY INTEGRATED**

**调用点** (src/pages/AIChat.tsx):
```
L16: import { ... parseMultiRoleReply } from '../lib/chatRoles'
L886: <MultiRoleContent content={message.content} isUser={isUser} paragraphRef={paragraphRef} />
L983-1010: MultiRoleContent 函数组件 (检测 [Name]: 前缀 + 拆气泡)
L994: const parsed = parseMultiRoleReply(content)
```

**复用**: parseMultiRoleReply 是 v1.27 写的 (multiRole.test.ts 11 测试已存), v1.39 仅拆出 UI 组件包装. **无新 lib.**

#### v1.39 W37-2 TTSSection 4 accent — **FULLY INTEGRATED**

**调用点** (src/components/settings/TTSSection.tsx):
```
L41: const englishVoices = voices.filter(v => v.lang.startsWith('en'))
L60-95: 4 按钮 (美/英/澳/印), 内部 setVoiceName(matched.name)
L98-105: 保留原 select 全部 voice (高级用户)
```

**复用**: voiceName / setVoiceName 来自 useStore (zustand persist). 不引新 lib. ✓

#### v1.39 W37-3 暗色模式 — **⚠ 4 函数, 2 UI 引用 + 1 race condition**

**调用点** (src/App.tsx):
```
L37: import { getTheme, applyTheme, applyFontSize, initDarkMode, applyContrastFix } from './lib/themes'
L66: applyContrastFix(darkMode) — useEffect([darkMode])
L71: initDarkMode() — useEffect([])
```

**导出使用率** (src/lib/themes.ts):
- `isDarkMode()` ❌ **NOT CALLED from UI** (仅测试用, 2 测试)
- `toggleDarkMode(force?)` ❌ **NOT CALLED from UI** (仅测试用, 4 测试)
- `applyContrastFix(isDark)` ✓ L66 + L161 (toggleDarkMode 内部) + L201/L204 (initDarkMode 内部)
- `initDarkMode()` ✓ L71 (App.tsx 启动时)

**UI 实际暗色切换**:
- 用户在 AppearanceSection 点开关 → `useStore.toggleDark()` (zustand) → `darkMode` 翻转
- App.tsx useEffect([darkMode]) → 1) classList.add/remove('dark'), 2) applyContrastFix(darkMode)
- **themes.ts `toggleDarkMode` 永远不被调用** — `localStorage.setItem('dark-mode', ...)` 永不被触发

**问题 (P2)**:
1. **双实现并存**: themes.ts 用 localStorage key `dark-mode`, useStore 用 zustand persist key (推测 `english-app-store`)
2. **Dead 写入路径**: `toggleDarkMode` 写 `dark-mode` localStorage, 但 UI 走 useStore, 这个 key 永远是空
3. **Race condition**: `initDarkMode` 与 `useEffect([darkMode])` 都触达 `html.dark` class — 启动时序:
   - Render → classList 应用 store 初始值
   - useEffect 顺序: 1) darkMode useEffect (line 64), 2) ... 3) applyContrastFix (line 66), 4) initDarkMode (line 71)
   - initDarkMode 读 `localStorage.getItem('dark-mode')` 永远是 `null` (因为没写入) → fallback `matchMedia('(prefers-color-scheme: dark)')` → 覆盖之前 useEffect 设置的 class

**结果**:
- 系统暗色偏好用户, 无论 useStore darkMode 是什么, 启动后 initDarkMode 会用系统偏好覆盖
- `dark-mode` localStorage key 是死路径

**修复建议 (给 owner)**:
- 方案 A: 删 themes.ts `isDarkMode` + `toggleDarkMode` + `initDarkMode` (3 函数), App.tsx 启动时仅依赖 zustand persist
- 方案 B: 改用 useStore 替代 themes.ts localStorage, 统一数据源

### 1.4 v1.39 新增 lib / 函数是否仍有 UI 引用

- `src/lib/themes.ts` 仅 +70 行 (4 函数, 见上)
- 无新 lib 文件
- 所有新 lib 函数都已分析 (见 1.3)
- 1 dead 函数: `getPhraseTTS` (imported but never called in UI)

### 1.5 Dead code 总览

| 维度 | 数据 |
|------|------|
| v1.36 报告的 5 dead lib | tagSuggest / writingTemplates / aiPlanGenerator / errorStats / phraseCards |
| v1.37 集成后状态 | 4/5 真集成, 1/5 (phraseCards) 残缺 |
| 新增 dead lib (v1.37-v1.39) | **0** |
| 新增 dead 函数 (v1.37-v1.39) | **3** — `isDarkMode`, `toggleDarkMode` (themes.ts), `getPhraseTTS` (phraseCards.ts) |
| 残缺集成 | 1 (phraseCards 切短语不显示短语) — **P1** |
| 双实现 / 死路径 | 1 (themes.ts 暗色 localStorage 路径 dead) — **P2** |
| 总 dead/残缺代码 | ~110 行 (3 函数 + phraseCards 渲染 + 暗色双实现) |
| 测试浪费 (dead lib 测试) | 0 — 5 dead lib 全部复活, 但 getPhraseTTS 10 测试 + darkMode 6/10 测试 是 dead/largely-dead |

---

## 任务 2: IDB 完整性

### 2.1 IDB schema 状态 (commit f3b17c9)

| 维度 | v1.36 状态 | v1.39 状态 | 变化 |
|------|----------|----------|------|
| db.version | 6 | **6** | 0 (无 migration) |
| 表数 | 9 | **9** | 0 (无新表) |
| 索引变化 | — | **0** | 0 |
| 表名冲突 | 0 | **0** | 0 |
| writingErrors schema | `++id, ts, source` | **同上** | 0 |
| records schema | `++id, wordId, action, timestamp` | **同上** | 0 |

**结论**: v1.37-v1.39 期间 IDB schema 完全没动. 无需 migration. v1.21 后 (db.version 6) 至今 18 release tag, 0 schema 变更, 极稳.

### 2.2 v1.37-v1.39 新代码的 IDB 触达

| Lib/Component | 触达表 | 操作 | 索引使用 |
|---------------|--------|------|---------|
| **errorStats** (W35-1) | `writingErrors` | `orderBy('ts').reverse().toArray()` | ✓ `ts` 索引存在 |
| **InAppBanner** (W36) | — (经 inAppReminder → reminderContent → favorites/records) | 间接, 复用 v1.34 路径 | ✓ |
| **TTSSection 4 accent** (W37-2) | — | — | — |
| **MultiRoleContent** (W37-1) | — | — | — |
| **themes.ts 暗色** (W37-3) | — (仅 localStorage) | — | — |

**v1.37-v1.39 中直接触达 IDB 的仅 errorStats (1 处新增 reader)**, 索引使用正确.

### 2.3 writingErrors / records 索引使用审计

#### writingErrors 表
- **schema** (v3, v1.21 后不变): `++id, ts, source`
- **所有 reader** (v1.37-v1.39 + 历史):
  - `errorStats.getErrorSummary` (v1.35 → v1.37 集成) — `orderBy('ts').reverse()` ✓
  - `db.getAllWritingErrors` (v0.23) — `toArray()` ✓
  - `db.deleteWritingError` (v0.23) — `delete(id)` ✓
  - `achievements.ts` — `count()`, `where({source})` ✓
  - `errorReview.ts` — `where({source}).reverse().sortBy('ts')` ✓
  - `learningReport.ts` — `where('ts').above()` ✓
  - `migrate.ts` — export 读 ✓
- **新写入源** (v1.37-v1.39): 0 (WritePage 写 source='write', AIChat 写 source='chat' — 都不变)
- **结论**: writingErrors 全路径正确

#### records 表
- **schema** (v1, v1.21 后不变): `++id, wordId, action, timestamp`
- **所有 reader** (v1.37-v1.39 + 历史):
  - `db.getTodayCount`, `db.getTotalLearned` ✓
  - `achievements.ts` — `where('action').equals().count()` ✓
  - `learningReport.ts` — `where('timestamp').above()` ✓
  - `reminderContent.ts` (v1.24) — `orderBy('timestamp').reverse().first()` ✓
  - `ShareCard.tsx` — 读 ✓
- **新写入源** (v1.37-v1.39): 0
- **结论**: records 全路径正确

### 2.4 暗色/多人/TTS 是否触达 IDB

- 暗色 (themes.ts) — 仅 localStorage, **不触达 IDB** ✓
- MultiRoleContent (AIChat.tsx) — 仅 message.content (内存态), **不触达 IDB** ✓
- TTSSection — 改 useStore.voiceName (zustand), **不触达 IDB** ✓
- InAppBanner — 经 inAppReminder → reminderContent → favorites/records (复用 v1.34 路径, **不新触达** IDB) ✓

**结论**: v1.37-v1.39 不需任何 IDB migration, 不需 version 升级.

### 2.5 IDB 风险汇总

| 风险 | 等级 | 备注 |
|------|------|------|
| Version 冲突 | 无 | 0 新表, 无需 version 升 7 |
| 表名冲突 | 无 | 0 新表 |
| 索引缺失 | 无 | errorStats 用 `ts` 索引已在 writingErrors schema |
| Quota 风险 | 无变化 | v1.6 review 维持 handleDbError 守卫 |
| Type 漂移 | 无 | WritingError 接口 v0.23+ 稳定 |
| 总 IDB 风险 | **0** | ✓ |

---

## 任务 3: 性能

### 3.1 InAppBanner 60s setInterval (v1.38 W36)

**代码** (src/components/InAppBanner.tsx L23-37):
```ts
useEffect(() => {
  if (!shouldUseInAppReminder()) {
    setEnabled(false)
    return
  }
  setEnabled(true)
  const check = async () => {
    if (!shouldShowInAppReminder()) return
    const s = await loadInAppReminderState()
    if (s) { setState(s); vibrateIfSupported() }
  }
  void check()
  const interval = window.setInterval(check, 60_000)
  return () => clearInterval(interval)
}, [])
```

**分析**:
- `shouldUseInAppReminder()` — sync, 检查 Notification API + iOS 检测, < 1ms
- `shouldShowInAppReminder()` — sync, 读 localStorage + Date check, < 1ms
  - **关键守卫**: `if (now.getHours() !== settings.hour) return false` — 99% 时间返 false
  - **结果**: 60s tick 99% 在 L29 return, 不进 loadInAppReminderState
- `loadInAppReminderState()` — async, 调 `getReminderStats()` (favorites.count + records.where('timestamp').above().count()) + `buildReminderBody()` (LLM 触达)
  - **仅在恰好 settings.hour:settings.minute 时** 真正跑 — 1 分钟/天 1 次
- `vibrateIfSupported()` — sync, `navigator.vibrate(200)` 即时返回
- `setState(s)` — 触达 React rerender, 但 state 没变就不 rerender

**性能评估**:
- **常态 (1440 min/天)**: 1439 次早 return, < 1ms/tick, **几乎零成本**
- **峰值 (1 min/天)**: 跑 1 次 loadInAppReminderState (~10-50ms, 含 IDB query)
- **总成本**: 60s × 1440 = 1440 ticks/天, 其中 1 tick 跑重活, 1439 tick 早 return

**结论**: ✓ 60s interval 合理, 无性能问题. `shouldShowInAppReminder` 早 return 是关键优化.

### 3.2 applyContrastFix 反复调用 (v1.39 W37-3)

**代码** (src/lib/themes.ts L167-186):
```ts
export function applyContrastFix(isDark: boolean): void {
  if (typeof document === 'undefined') return
  let styleEl = document.getElementById('dark-contrast-fix') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dark-contrast-fix'
    document.head.appendChild(styleEl)
  }
  if (isDark) {
    styleEl.textContent = `...`
  } else {
    styleEl.textContent = ''
  }
}
```

**调用点** (v1.39):
- `App.tsx` L66 useEffect([darkMode]) — 每次 darkMode 变触发
- `themes.ts` L161 (toggleDarkMode 内部) — 死路径
- `themes.ts` L201/L204 (initDarkMode 内部) — 启动时

**分析**:
- `getElementById('dark-contrast-fix')` — 浏览器原生 DOM API, O(1) 查
- **idempotent 设计**: 找到就复用, 找不到才 createElement + appendChild
- `styleEl.textContent = ...` — 不创建新元素, 仅替换 textContent
- **无重复 style 标签风险** ✓

**性能评估**:
- 首次调用: getElementById null → createElement + append + textContent ≈ 1-2ms
- 后续调用: getElementById hit → textContent set ≈ 0.1ms
- **总成本**: darkMode 切换频次极低 (用户手动), 可忽略

**结论**: ✓ idempotent 设计正确, 无重复 style 标签问题. 无性能问题.

### 3.3 MultiRoleContent 每次 render 都 parseMultiRoleReply (v1.39 W37-1)

**代码** (src/pages/AIChat.tsx L983-1010):
```ts
function MultiRoleContent({ content, isUser, paragraphRef }) {
  if (isUser) return <p>{content}</p>
  const parsed = parseMultiRoleReply(content)  // 每次 render 都调
  if (!parsed) return <p>{content}</p>
  return <div>...</div>
}
```

**parseMultiRoleReply 实现** (src/lib/chatRoles.ts L497-509):
```ts
const m = text.match(/^\s*\[([^\]]+)\]\s*:\s*([\s\S]+)$/)  // 正则
if (!m) return null
const name = m[1].trim()
const content = m[2].trim()
const role = ALL_ROLES.find(r => r.name === name)  // 14 角色线性扫
return { name, emoji: role?.emoji || '👤', content }
```

**调用频次**:
- MultiRoleContent 是 MessageBubble 子组件
- 每次 MessageBubble re-render, MultiRoleContent 也 re-render
- 50 消息聊天 → 50 次 parseMultiRoleReply
- **每次成本**: 1 正则 + 14 角色 Array.find ≈ 0.01-0.05ms

**Memoize 需要吗**:
- ✓ **不需要** (理论): 总成本 ~0.5-2.5ms / 50 消息 render
- ⚠ **可加防御**: `useMemo(() => parseMultiRoleReply(content), [content])` 避免 message.content 不变时重复计算
- 实际场景下, content 经常不变 (用户已发消息, content 不会动), useMemo 能省 50 次调用

**结论**: 良 (良性, 可选优化). 不加也 OK, 加 useMemo 是 1 行.

### 3.4 initDarkMode 启动阻塞主线程 (v1.39 W37-3)

**代码** (src/lib/themes.ts L189-208):
```ts
export function initDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  let saved: string | null = null
  try { saved = localStorage.getItem('dark-mode') } catch {}
  const shouldBeDark = saved === '1' || (
    saved === null && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
  if (shouldBeDark) {
    document.documentElement.classList.add('dark')
    applyContrastFix(true)
  } else {
    document.documentElement.classList.remove('dark')
    applyContrastFix(false)
  }
  return shouldBeDark
}
```

**调用点** (src/App.tsx L70-72):
```ts
useEffect(() => {
  initDarkMode()
}, [])
```

**分析**:
- `localStorage.getItem` — sync, < 0.1ms
- `window.matchMedia` — sync, < 0.1ms
- `classList.add/remove` — sync, < 0.1ms
- `applyContrastFix` — sync, 首次 ~1-2ms, 后续 < 0.5ms
- **总成本**: < 3ms, 完全在主线程

**主线程阻塞?**:
- React 启动流程: render → effects
- 启动时这个 useEffect 排在第 4 个, 之前已经有 darkMode useEffect 跑了 classList 设置
- `initDarkMode` **会再次设置 classList** (重复 DOM 写入, 但幂等)
- **不阻塞主线程**: 3ms 完全在可接受范围, 不会卡渲染

**⚠ Race condition** (非性能问题, 但相关):
- `useEffect([darkMode])` (L64) 先跑: 按 store 初始值设 html.dark
- `useEffect([darkMode])` (L66) 跑: applyContrastFix(darkMode)
- `useEffect([])` (L70) 跑: initDarkMode()
  - 读 localStorage 'dark-mode' (永远是 null, 死路径)
  - fallback matchMedia (系统偏好)
  - **覆盖** 之前 useEffect 设置的 class (如果 matchMedia 答案与 store 不同)
- **结果**: 系统暗色用户, 即使 useStore darkMode=false, 启动后会被 initDarkMode 强制设 dark

**结论**:
- 性能: ✓ 不阻塞 (3ms, 接受)
- 正确性: ⚠ race condition (P2, 死路径导致暗色状态受系统偏好覆盖 store)

### 3.5 性能总评

| 项目 | 评级 | 备注 |
|------|------|------|
| InAppBanner 60s interval | ✓ 优 | 早 return 守卫, 99% tick 零成本 |
| applyContrastFix 反复调用 | ✓ 优 | idempotent (getElementById 守卫), 无重复 style |
| MultiRoleContent parseMultiRoleReply | 良 | 50 消息 50 次调用, < 2.5ms 总成本, 可选 useMemo |
| initDarkMode 阻塞 | ✓ 优 (性能), ⚠ 良 (正确性) | < 3ms 不阻塞, 但 race condition 是 P2 |
| 总性能 | ✓ 优 | 0 性能问题, 1 正确性 race (P2) |

---

## 任务 4: 测试覆盖复检

### 4.1 测试总数

| 时间 | 测试总数 | 来源 |
|------|---------|------|
| v1.36 (8facbcc) | 626 (changelog 632, ±1%) | v1.36 verifier2 报告 |
| v1.37 (1f6ca1c) | 626 (0 新增) | changelog "无新测试, 都是 UI 集成" |
| v1.38 (fa05bce) | 626 (0 新增) | changelog "无新增, UI 集成" |
| v1.39 (f3b17c9) | **642** (+16) | 实际 `npx vitest run` 输出 642, changelog 642 ✓ |
| **本次实测** | **642 pass** | vitest run 全过 (47 文件, 642 tests, 201s) |

**changelog 精度**: v1.39 报 642, 实测 642 ✓ (v1.36 verifier2 grep 偏差 ±1% 修正).

### 4.2 v1.37-v1.39 新增测试

| Release | 新增文件 | 新增测试 | 评级 |
|---------|---------|---------|------|
| v1.37.0 (5 dead code UI 集成) | 0 | **0** | ⚠ 5 lib 集成无新测试 |
| v1.38.0 (InAppBanner) | 0 | **0** | ⚠ 1 组件无新测试 |
| v1.39.0 (3 件 UI 增强) | tests/darkMode.test.ts | **10** (isDarkMode 2 + toggleDarkMode 4 + applyContrastFix 2 + initDarkMode 2) | ✓ |

**覆盖率缺口 (v1.37-v1.39 新增代码)**:
- phraseCards UI 集成 (W35-3) — 0 测试 (lib 测试已存, UI 集成无)
- InAppBanner 组件 (W36) — 0 测试
- MultiRoleContent 组件 (W37-1) — 0 测试 (parseMultiRoleReply lib 测试已存)
- TTSSection 4 accent (W37-2) — 0 测试
- PlanPage/WritePage/ErrorsPage/Notebook 集成代码 — 0 测试
- **总: 5 UI 集成 task, 0 测试, 0 闭环脚本**

### 4.3 14 未覆盖 lib 复检

| Lib | v1.36 状态 | v1.39 状态 | 变化 |
|-----|----------|----------|------|
| **themes.ts** | 152L, 0 测试 | 222L, **10 测试** (darkMode.test.ts) | ✓ 部分覆盖 |
| daily.ts | 15L, 0 测试 | 15L, 0 测试 | 0 |
| export.ts | 95L, 0 测试 | 95L, 0 测试 | 0 |
| exportChat.ts | 159L, 0 测试 | 160L, 0 测试 | 0 |
| imageRecog.ts | 228L, 0 测试 | 228L, 0 测试 | 0 |
| learnReport.ts | 172L, 0 测试 | 172L, 0 测试 | 0 |
| recorder.ts | 402L, 0 测试 | 402L, 0 测试 | 0 |
| reminder.ts | 168L, 0 测试 (含 v1.24 data.url 漏测) | 168L, 0 测试 | 0 |
| stt.ts | 133L, 0 测试 | 133L, 0 测试 | 0 |
| streak.ts | 88L, 0 测试 | 88L, 0 测试 | 0 |
| translate.ts | 527L, 0 测试 | 527L, 0 测试 | 0 |
| tts.ts | 853L, 0 测试 | 853L, 0 测试 | 0 |
| utils.ts | 30L, 0 测试 | 30L, 0 测试 | 0 |
| words.ts | 46L, 0 测试 | 46L, 0 测试 | 0 |

**结论**:
- **13/14 仍未覆盖** — v1.37-v1.39 仅 themes.ts 得部分覆盖
- themes.ts: 4/9 函数测了 (isDarkMode/toggleDarkMode/applyContrastFix/initDarkMode), 5/9 未测 (THEMES 常量 / applyTheme / getTheme / FONT_SIZES 常量 / applyFontSize)
- reminder.ts v1.24 data.url 仍未测 (v1.36 review 漏修)
- **总未覆盖 lib**: 14 (含 themes.ts 仍部分缺)

### 4.4 集成测试 vs 单元测试对比

| 类型 | v1.36 | v1.39 | 变化 |
|------|------|------|------|
| 单元测试 | 626 | 642 | +16 |
| UI 集成测试 (vitest) | 0 | 0 | 0 |
| 闭环脚本 (scripts/verify-*.mjs) | 多个 | 未新增 | 0 |
| 静态审查脚本 (scripts/review-*.py) | 多个 | v1.39 大 review | +1 |

**v1.37-v1.39 测试策略**: 仅单测 darkMode 4 函数 (10 测试), UI 集成 task 全部"目测 + 静态审查", 无 vitest 集成测试, 无新增 verify-*.mjs 闭环脚本. 0 集成回归保护.

### 4.5 测试覆盖总评

| 维度 | v1.36 | v1.39 | 评级 |
|------|------|------|------|
| 测试总数 | 626 | 642 | ✓ 优 (+16) |
| v1.37-v1.39 新增代码测试 | — | 10 (darkMode only) | ⚠ 仅 1/3 |
| UI 集成测试 | 0 | 0 | ⚠ 仍 0 |
| 未覆盖 lib | 14 | 13 (-1, themes.ts 部分) | 良 (缓慢改善) |
| v1.24 data.url 漏修 | ✗ | ✗ | ⚠ 维持 8 个版本 |

---

## 总结 (北极星视角)

### 数据
- **测试总数**: 626 → **642** (+16, 全部 darkMode)
- **Dead lib**: 5 → 0 (4 真集成, 1 残缺)
- **Dead 函数 (v1.37-v1.39 新)**: 3 (`isDarkMode`, `toggleDarkMode`, `getPhraseTTS`)
- **IDB schema**: v6 维持, 0 迁移, 0 新表
- **P0**: 0
- **P1**: 1 (phraseCards 切短语不显示短语, UI 不通)
- **P2**: 1 (themes.ts 暗色双实现 + race condition)
- **性能问题**: 0 (3 项良性, 1 项 race 是正确性问题)

### 关键发现
1. **phraseCards 集成残缺 (P1)** — 切短语按钮和短语队列构建 OK, **但渲染层未触达 phraseQueue**, 切短语后看到同样的单词卡. v1.37 标题"单词短语闪卡"承诺的短语模式实际不可用. 需补 ~30-60 行 CardReview 渲染分支.
2. **暗色模式双实现 (P2)** — themes.ts (`localStorage dark-mode` key) + useStore (zustand persist) 并行, App.tsx 两 useEffect 都会写 html.dark class. `initDarkMode`/`toggleDarkMode` 写入的 localStorage key 永不被 UI 读 (死路径), `initDarkMode` 还会用系统偏好覆盖 store 暗色状态. 建议删 themes.ts 暗色函数, 统一走 useStore.
3. **5 dead lib 4 真集成** — errorStats / writingTemplates / aiPlanGenerator 完美触达, tagSuggest 走本地启发式 (不调 LLM, 不算真"AI"), phraseCards 残缺.
4. **3 个新 dead 函数** — `isDarkMode` / `toggleDarkMode` (themes.ts) / `getPhraseTTS` (phraseCards.ts) 全部仅测试, 无 UI 引用. 删了可省 8 darkMode 测试 + 部分 phraseCards 测试.
5. **IDB 完全无变更** — v1.37-v1.39 0 新表/0 新索引, v6 schema 维持. errorStats 用的 `ts` 索引已在.
6. **性能 3 良性 + 1 race** — InAppBanner 早 return 99% tick 零成本; applyContrastFix idempotent; parseMultiRoleReply 总成本 < 2.5ms; initDarkMode < 3ms 不阻塞, 但 race condition 覆盖 store 暗色.

### 结论

**v1.37-v1.39 是 5 dead code 复活 + 3 件 UI 增强**, **0 新 dead lib**, 极稳的 IDB, 良性性能. 但暴露 2 个集成残缺: 1 P1 (phraseCards 不显示短语) + 1 P2 (暗色双实现).

**建议 owner 优先决策**:
- **P1 必修**: 补 CardReview phrase mode 渲染 (30-60 行) — 5 分钟写, 兑现 v1.37 承诺
- **P2 清理**: 删 themes.ts `isDarkMode`/`toggleDarkMode`/`initDarkMode` (3 函数) + 改 App.tsx 不调 `initDarkMode` — 10 行 diff, 消除 race + 死路径
- **测试补强 (可选)**: 5 UI 集成 task 0 测试, 可加 1-2 个端到端测试 (Playwright 或 vitest jsdom + RTL)
- **14 未覆盖 lib**: 13 仍未测, 仍属 v0.x 技术债, 不属本 review 范围

**北极星 (触发可业 + 内容能用 + 学得会) 影响**:
- phraseCards 不显示短语: **中** — 用户点切短语期望看到短语, 实际看不到, 体验断裂
- 暗色双实现: **低** — 用户功能正常, 仅 race 概率低
- 5 dead lib 复活: **高** — 4 个 lib 真触达用户, 北极星价值兑现

**保 v1.6 review 修复**: 13 个 bug 修复全部位于功能路径, v1.37-v1.39 未触及 ✓
**保 v1.0-v1.5 已完成模块**: 成就墙/学习卡分享/词根/短语用法/错题讲解 全部位于功能路径, 未触及 ✓
**零成本**: 审查本身不引依赖, 不改代码 ✓
