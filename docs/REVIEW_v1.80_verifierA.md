# Verifier A 报告 (v1.80.0) — 静态代码 review (9 维度 + 历史修复)

**审查员**: verifier (独立对抗性审查)
**日期**: 2026-07-29
**范围**: `/workspace/english-app` HEAD = `v1.79.0` (commit `0949450`)
**方法**: 9 维度全扫 + 6 历史修复回归验证; 独立 grep + 手动源码阅读, 不信任 producer 总结

---

## §0 上下文校正

- **任务声称版本**: v1.80.0
- **实际 git HEAD**: `0949450 v1.79.0: 第 16 次大 review (0 P0 + 0 P1) + 4 处 console 清`
- **package.json**: 1.62.0 (滞后, 与 v1.55 后无大改)
- **未发布改动**: `public/data/words.json` (w73-roots.py 94 词根追加), `data/external/lemma.en.txt` (新)

**结论**: 任务 "v1.80.0" 实际对应 v1.79.0 之后未发布状态 (同 verifier C 报告 §0). 验证按此快照执行.

---

## 总览: P0 + P1 + P2

| 等级 | 数量 | 状态 |
|------|------|------|
| **P0** (catch any / 空 catch / 致命) | **0** | ✓✓ |
| **P1** (setLoading 缺 finally / 真死代码) | **11** | ⚠ 11 处页面可能因异步抛错卡死 loading |
| **P2** (as any / 注释 catch / state 死) | **20+** | 低风险, 累积技术债 |
| **历史修复** (6 修复 + v1.6 13 修) | **全健在** | ✓✓✓ |

> **与 producer v1.78 review 的关键分歧**:
> - Producer 报告: "setLoading 缺 false = 0" (用 file-level 计数: 有 setLoading(true) 但 0 个 setLoading(false) 才算 P1)
> - 本 verifier: **11 处 setLoading(false) 不在 try/finally 内**, 异步抛错会卡死页面 (P1)
> - Producer 报告: "死代码 = 20 误报 (类型 + 函数式导入)"
> - 本 verifier: **26 处真实未用 import** (用 per-name 精确检测, 排除 false positive)

---

## P0: 0 处 ✓

### 1. `catch (e: any)` (P0)
- **扫描方式**: `grep -rn "catch\s*(\s*\w+\s*:\s*any\s*)" src/`
- **结果**: **0 处** ✓
- **证据**: 完全无匹配
- **对照 v1.22 review**: 18 处 `catch (e: any)` → `catch (e: unknown)` 修后健在

### 2. 空 catch (P0)
- **扫描方式**: `grep -rn -E "catch\s*\([^)]*\)\s*\{\s*\}" src/`
- **结果**: **0 处空 catch** ✓
- **但有 3 处 "ignore" 注释 catch** (P2, 见下):
  - `src/pages/CustomSceneLearn.tsx:45-47` (localStorage.getItem)
  - `src/pages/CustomSceneLearn.tsx:63-65` (localStorage.setItem)
  - `src/pages/CustomSceneLearn.tsx:120-122` (localStorage.removeItem)
  - **评估**: localStorage 在隐私模式可能抛, 此 pattern 是 best practice (静默失败不阻塞), 不算 P0

---

## P1: 11 处 ⚠

### 3. `void import()` fire-and-forget (P1)
- **扫描方式**: `grep -rn "void\s\+import\s*(" src/`
- **结果**: **0 处** ✓
- **对照 v1.48 review**: plan.ts 已改静态 import; v1.51 review: db.ts 也已改静态 import

### 4. setLoading(true) 缺 setLoading(false) (P1) — **11 处有 finally 漏洞**

> **检查方法**: 不只数 file-level 的 true/false 数量, 而是检查 `setLoading(false)` 是否在 `try/finally` 块内. 若不在, 异步抛错会导致 loading 永久卡 true, 用户必须刷新页面.

#### 11 处 P1 (setLoading(false) 不在 try/finally)

| # | 文件 | setLoading(true) | setLoading(false) | 在 finally? | 抛错时表现 |
|---|------|------------------|--------------------|-------------|-----------|
| 1 | `src/components/StudyCalendar.tsx:21,30` | L21 | L30 | ✗ | 卡 loading, refresh 失效 |
| 2 | `src/pages/CalendarPage.tsx:26,29` | L26 | L29 (.then 内) | ✗ | 切月抛错 → loading 永久卡 true |
| 3 | `src/pages/CardReview.tsx:59,128` | L59 | L128 | ✗ | loadQueue 抛错 → 进入空状态但 loading=true |
| 4 | `src/pages/CustomSceneDetail.tsx:23,40` | L23 | L40 (.then 内) | ✗ | getCustomSceneById 抛错 → 永远 ⏳ |
| 5 | `src/pages/CustomSceneLearn.tsx:27,54` | L27 | L54 (.then 内) | ✗ | 同上, 永远 ⏳ |
| 6 | `src/pages/ErrorsPage.tsx:40,43` | L40 | L43 | ✗ | getAllWritingErrors 抛错 → 卡 loading |
| 7 | `src/pages/LearnReport.tsx:23,27` | L23 | L27 | ✗ | getAllChats / generateLearnReport 抛错 → 卡 loading |
| 8 | `src/pages/Notebook.tsx:38,65` | L38 | L65 | ✗ | **v1.52 修复页面** 也有此问题, 收藏+查询失败 → 卡 loading |
| 9 | `src/pages/ReviewCenter.tsx:38,58` | L38 | L58 | ✗ | getReviewsByTagWithScore 抛错 → 卡 loading |
| 10 | `src/pages/WeakWords.tsx:29,47` | L29 | L47 | ✗ | getWeakWords 抛错 → 卡 loading |
| 11 | `src/pages/WordList.tsx:35-39` | L35 | L38 (.then) | ✗ | **缺 .catch**, loadWords reject → 永远 loading |

#### 修复建议 (统一 pattern)

```tsx
async function loadX() {
  setLoading(true)
  try {
    const data = await someAsyncOp()
    setData(data)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    toast.error(err.message || '加载失败')
  } finally {
    setLoading(false)  // ← 必须
  }
}
```

**修复价值**: 11 处都是用户实际会触发的页面 (CardReview/Notebook/WordList/ReviewCenter/CalendarPage 都是高频页), 一旦依赖服务 (IndexedDB / network) 抛错, 用户只能刷新.

**对照 producer 报告**: producer 的 `big-review-v16.py` 脚本只检查 `false_count == 0`, 没检查 finally, 因此漏报.

---

## P2: 20+ 处 (低风险技术债)

### 5. `as any` (P2) — **17 处**

| 文件 | 行 | 用途 | 是否真必要 |
|------|---|------|----------|
| `src/components/InstallPrompt.tsx:37` | `navigator as any` | PWA standalone | ⚠ 应 `(navigator as Navigator & {standalone?: boolean})` |
| `src/components/TTSButton.tsx:74` | `window as any` | Audio 检测 | ⚠ 同上 |
| `src/components/settings/PreferencesSection.tsx:18` | `e.target.value as any` | level 联合类型 | ⚠ 应用 `LevelOptionValue` |
| `src/lib/chatRoles.ts:485` | `level as any` | 角色 prompt | ⚠ 应 `as Level` |
| `src/lib/db.ts:226` | `e as any` | **error 守卫** | ⚠ 应用 `instanceof Error` |
| `src/lib/learnReport.ts:103` | `level as any` | 联合类型 | ⚠ |
| `src/lib/recorder.ts:38,42,101,192` | `window as any` | MediaRecorder/webkitAudioContext/MSStream | ⚠ vendor API 缺类型 |
| `src/lib/stt.ts:29` | `window as any` | SpeechRecognition | ⚠ vendor API |
| `src/pages/AIChat.tsx:77,97,154` | `level/role/type as any` | 联合类型 | ⚠ |
| `src/pages/WritePage.tsx:190,200,202` | `type as any` | 联合类型 | ⚠ |

**评估**: 8 处 vendor API 兜底 (recorder/stt/TTS) 可接受, 9 处业务类型应用 `type narrowing`. 累积技术债, 但每次大 review 都决定"不修" (refactor 风险 > 价值). 与 producer 一致判断.

### 6. `console.log/debug/info` 残留 (P2) — **0 处**
- **扫描**: `grep -rn "console\.\(log\|debug\|info\)" src/`
- **结果**:
  - `src/App.tsx:77` — `if (import.meta.env.DEV) console.debug(...)` ✓ DEV 守卫
  - `src/lib/tts.ts:150` — 同上 ✓
  - `src/main.tsx:54` — 同上 ✓
- **结论**: **0 残留**, v1.79.0 修的 4 处全部生效

### 7. 死代码 (P2) — **26 处真实未用 import + 1 死 state**

#### 26 处未用 import

| # | 文件 | 未用标识符 | 来源 |
|---|------|------------|------|
| 1 | `src/App.tsx:5` | `ErrorBoundary` | 导入但未用 |
| 2 | `src/App.tsx:6` | `InstallPrompt` (default) | 导入但未用 |
| 3 | `src/components/ErrorExplainButton.tsx:7` | `LLMProvider` (type) | 导入但未用 |
| 4 | `src/components/settings/ReminderSection.tsx:2` | `estimateMinutes` | 导入但未用 |
| 5 | `src/components/settings/TranslateSection.tsx:2` | `BUILTIN_TRANSLATE_PROVIDERS` | 导入但未用 |
| 6 | `src/lib/errorStats.ts:1` | `WritingError` (type) | 导入但未用 |
| 7 | `src/lib/plan.ts:18` | `CEFRLevel` (type) | 导入但未用 |
| 8 | `src/lib/synonyms.ts:1` | `getOrCreateExplanation` | 导入但未用 |
| 9 | `src/lib/translate.ts:1` | `BUILTIN_LLM_PROVIDERS` | 导入但未用 |
| 10 | `src/lib/wordTags.ts:2` | `WordTag` (type) | 导入但未用 |
| 11 | `src/pages/AIChat.tsx:9` | `getFallbackReply` | 导入但未用 |
| 12 | `src/pages/AIChat.tsx:9` | `NONE_ROLE` | 导入但未用 |
| 13 | `src/pages/AIChat.tsx:9` | `ChatRole` (type) | 导入但未用 |
| 14 | `src/pages/Camera.tsx:4` | `useEffect` | 导入但未用 |
| 15 | `src/pages/Camera.tsx:5` | `recognizeImage` | 导入但未用 |
| 16 | `src/pages/CardReview.tsx:5` | `getPhraseTTS` | 导入但未用 |
| 17 | `src/pages/CustomScenes.tsx:10` | `MAX_WORDS` | 导入但未用 |
| 18 | `src/pages/Home.tsx:8` | `LEVELS` | 导入但未用 |
| 19 | `src/pages/ListenPage.tsx:3` | `useRef` | 导入但未用 |
| 20 | `src/pages/ListenPage.tsx:11` | `useStore` | 导入但未用 |
| 21 | `src/pages/Notebook.tsx:5` | `getWord` | 导入但未用 |
| 22 | `src/pages/Notebook.tsx:8` | `getWordIdsByTag` | 导入但未用 |
| 23 | `src/pages/PlanPage.tsx:7` | `levelLabel` | 导入但未用 |
| 24 | `src/pages/SceneDetail.tsx:4` | `Scene` (type) | 导入但未用 |
| 25 | `src/pages/WeakWords.tsx:5` | `loadWords` | 导入但未用 |
| 26 | `src/pages/WordDetail.tsx:5` | `Link` | 导入但未用 |

**检测方法**: per-name word boundary 检测, 排除 import line 后统计真实使用次数. producer 的 `big-review-v16.py` 用 `name not in text_no_imports` 简单子串匹配, 产生 20 个 false positive 掩盖了真实死代码.

**修复建议**:
- 高频: `App.tsx:5-6` (ErrorBoundary/InstallPrompt) — 是否应挂到 `<Layout>` 包裹? 看起来是被废弃的入口.
- AIChat.tsx 是死代码重灾区: `getFallbackReply / NONE_ROLE / ChatRole` 3 个未用, 加上 loadingEarly state (见下).
- 类型 import (`type WordTag / Scene / LLMProvider`) — TypeScript `noUnusedLocals: false` 不报警, 但仍是技术债.

#### 1 处死 state (最严重)

**`src/pages/AIChat.tsx:129`**: `const [loadingEarly, setLoadingEarly] = useState(false)` 声明但全文 0 次使用 (`loadingEarly` 0 次, `setLoadingEarly` 0 次).

**评估**: 这是 v1.6 review 时添加的占位 state (W2-A 自动纠错), 后续重构时被遗忘. 占用内存, 触发 React rerender, 但无功能影响. 建议删除.

### 8. i18n 完整性 (P0/P1) — **0 缺**

- **扫描**: 静态扫所有 `t('xxx')` 调用 (106 个), 验证 zh/en DICT 都有
- **结果**:
  - `t()` 调用总数: 106
  - zh DICT 缺失: **0**
  - en DICT 缺失: **0**
  - zh DICT key 数: 152, en DICT key 数: 152, 数量一致 ✓
- **对照 v1.45/v1.55 review**: i18n 25 页面覆盖 + 26 key 补全后健在
- **结论**: ✓ i18n 完全完整, 无 P1

---

## §历史修复回归: 全部健在 ✓

| 修复 | 来源 | 当前状态 | 证据 |
|------|------|---------|------|
| **v1.6 review 13 处** | main review | ✓ 健在 | 见下逐项验证 |
| **v1.45 CardReview 26 keys** | verifier1 | ✓ 健在 | `CardReview.tsx:42 t() 调用`, `useTranslate` import + 解构都在 |
| **v1.48 addXP race** | verifier3 | ✓ 健在 | `plan.ts:16` 静态 `import { addXP, XP_REWARDS } from './xpSystem'`, `plan.ts:90` `void addXP(...).catch(...)` |
| **v1.48 difficultyAdapter level** | verifier3 | ✓ 健在 | `difficultyAdapter.ts:8-9` `export type WordLevel`, `level 8 档` ladder, `difficultyAdapter.ts:76` `export type CEFRLevel = WordLevel` 别名 |
| **v1.51 db.ts fire-and-forget** | verifier4 | ✓ 健在 | `db.ts:4` 静态 `import { addXP, XP_REWARDS } from './xpSystem'`, `db.ts:244` 注释 `v1.51.0 W46: 改静态 import (verifier4 P1-B 修)` |
| **v1.52 Notebook dynamic import** | 大 review | ✓ 健在 | `Notebook.tsx:3` 静态 `import { loadWords }`, `Notebook.tsx:45` 注释 `v1.52.0 W47: 静态 import`. (注: 仍有 wordTags 的 dynamic import 在 handleAddTag/handleAISuggest, 是有意分块延迟加载, 不算回归) |
| **v1.55 i18n 25 pages** | 大 review | ✓ 健在 | 26 个 `src/pages/*.tsx` 全部使用 `t()` 或 `useTranslate` |

### v1.6 review 13 处逐项验证

| # | Bug | 修法 | 当前状态 |
|---|-----|------|---------|
| 1 | WritePage 切回 write tab 重置 input | useEffect 仅在 history 加载 | ✓ `WritePage.tsx:128-132` |
| 2 | WritePage handleHistoryItem 被 useEffect 覆盖 | 移除 else 分支 | ✓ `WritePage.tsx:128-132` |
| 3 | ListenPage DictationMode 切 lesson 状态泄漏 | useEffect [lesson.id] 重置 | ✓ `ListenPage.tsx:330-335` |
| 4 | ListenPage QuestionsMode 同上 | useEffect [lesson.id] 重置 | ✓ `ListenPage.tsx:501-505` |
| 5 | ErrorExplainButton setLoading(true) 缺失 | 加 setLoading(true) | ✓ `ErrorExplainButton.tsx:30` (含 `// v1.6 bugfix`) |
| 6 | UsageButton setLoading(true) 缺失 | 同上 | ✓ `UsageButton.tsx:26` |
| 7 | AIChat STT 累积无 MAX_LEN | MAX_INPUT=500 截断 | ✓ `AIChat.tsx:186` `const MAX_INPUT = 500`, `L218` slice |
| 8 | WritePage 截断后没 return | 用 text 变量 | ✓ `WritePage.tsx:157-162` 注释 `v1.6 bugfix: 用截断后的 text 变量` |
| 9 | ListenPage handlePlay 重复点击 | `if (playing) return` | ✓ `ListenPage.tsx:508` `if (playing) return  // v1.6 bugfix` |
| 10 | UsageButton cached.rule 解析 tip 显示 JSON | tip = '暂无数据' | ✓ `UsageButton.tsx:58-60` |
| 11 | WritePage 2 处 `catch (e: any)` | 改 unknown + Error 守卫 | ✓ 全代码无 `catch (e: any)` |
| 12 | AIChat 1 处 `catch (e: any)` | 同上 | ✓ 同上 |
| 13 | WritePage parseResult `(e: any)` 参数 + `t as any` | 改 unknown + WritingErrorType | ✓ `WritePage.tsx:19` `type WritingErrorType = ...`, 全代码无 `e: any` |

**v1.6 review 13 处修: 全部健在, 0 退化** ✓

---

## §4 总评估

### 风险等级
- **P0**: 0 (生产可用, 不阻塞发布)
- **P1**: 11 (setLoading 缺 finally) — **建议 v1.80 修** (5 分钟机械工作)
- **P2**: 26 死代码 + 17 as any + 1 死 state — 不阻塞, 累积

### 与 producer v1.78 review 结论的对照
- ✓ 一致: 0 P0 / 0 真实 catch any / 0 真实空 catch / 0 真实 fire-and-forget / 0 真实 console 残留 / 0 真实 i18n 缺 / 5 历史修复全健在
- ⚠ 修正: setLoading 缺 false **不是 0, 是 11 处** (producer 只数 file-level, 没看 finally)
- ⚠ 修正: 死代码 **不是 20 误报, 是 26 处真实 + 1 死 state** (producer 用了过宽的检测)

### 建议 v1.80.0 release 修法
1. **P1 修法** (5 分钟): 11 处 setLoading 用 try/finally 包裹 (4 个高频页: CardReview/Notebook/WordList/ReviewCenter 可优先)
2. **P2 清理** (可选): 删 `AIChat.tsx:129 loadingEarly`; 删 `App.tsx:5-6 ErrorBoundary/InstallPrompt` 死 import

### 不建议本 release 修
- 17 处 as any (refactor 风险 > 价值, 历次大 review 一致决定)
- 26 处未用 import (低影响, tsc noUnusedLocals=false 不报警; 可作未来大 review 任务)
